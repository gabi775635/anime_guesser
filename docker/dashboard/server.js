const express   = require('express');
const expressWs = require('express-ws');
const Docker    = require('dockerode');
const fs        = require('fs');
const path      = require('path');

const app = express();
expressWs(app);

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const PORT           = process.env.PORT || 9000;
const NETWORK_NAME   = process.env.DOCKER_NETWORK  || 'animeguesser';
const LB_CONTAINER   = process.env.LB_CONTAINER    || 'animeguesser-lb';
const LB_CONFIG_PATH = process.env.LB_CONFIG_PATH  || '/lb-config/nginx.conf';
const FRONTEND_IMAGE = 'animeguesser-frontend';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── WebSocket clients pour le push ────────
const wsClients = new Set();

app.ws('/ws', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ── Helpers Docker ────────────────────────
async function getContainers() {
  const all = await docker.listContainers({ all: true });
  return all.filter(c =>
    c.Labels?.['animeguesser.managed'] === 'true' ||
    c.Labels?.['animeguesser.service'] !== undefined
  );
}

async function getStats(containerId) {
  try {
    const container = docker.getContainer(containerId);
    return await new Promise((resolve, reject) => {
      container.stats({ stream: false }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  } catch { return null; }
}

function parseCpuPercent(stats) {
  if (!stats) return 0;
  const cpu_delta   = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const sys_delta   = stats.cpu_stats.system_cpu_usage      - stats.precpu_stats.system_cpu_usage;
  const num_cpus    = stats.cpu_stats.online_cpus || 1;
  return sys_delta > 0 ? (cpu_delta / sys_delta) * num_cpus * 100 : 0;
}

function parseMemPercent(stats) {
  if (!stats) return 0;
  const usage = stats.memory_stats.usage || 0;
  const limit = stats.memory_stats.limit || 1;
  return (usage / limit) * 100;
}

function parseMemMB(stats) {
  if (!stats) return 0;
  return Math.round((stats.memory_stats.usage || 0) / 1024 / 1024);
}

// ── Reconstruire l'upstream Nginx ─────────
async function rebuildNginxUpstreams() {
  try {
    const containers = await getContainers();
    const frontends  = containers.filter(c =>
      c.Labels?.['animeguesser.service'] === 'frontend' &&
      c.State === 'running'
    );

    // Récupère le nom/hostname de chaque frontend
    const upstreamLines = frontends.map(c => {
      const name = c.Names[0].replace('/', '');
      return `        server ${name}:80 weight=1 max_fails=3 fail_timeout=30s;`;
    }).join('\n');

    let config = fs.readFileSync(LB_CONFIG_PATH, 'utf8');

    // Remplace le bloc upstream frontend_pool
    config = config.replace(
      /upstream frontend_pool \{[\s\S]*?\}/,
      `upstream frontend_pool {\n        least_conn;\n${upstreamLines}\n    }`
    );

    fs.writeFileSync(LB_CONFIG_PATH, config);

    // Reload Nginx sans downtime
    const lb = docker.getContainer(LB_CONTAINER);
    await lb.exec({
      Cmd: ['nginx', '-s', 'reload'],
      AttachStdout: true,
      AttachStderr: true,
    });

    console.log(`[LB] Upstream rebuilt with ${frontends.length} frontend(s)`);
  } catch (e) {
    console.error('[LB] Failed to rebuild upstreams:', e.message);
  }
}

// ── API REST ──────────────────────────────

// GET /api/containers — liste tous les conteneurs managés
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await getContainers();
    const result = await Promise.all(containers.map(async (c) => {
      const stats = c.State === 'running' ? await getStats(c.Id) : null;
      return {
        id:      c.Id.slice(0, 12),
        fullId:  c.Id,
        name:    c.Names[0].replace('/', ''),
        image:   c.Image,
        status:  c.State,
        service: c.Labels?.['animeguesser.service'] ?? 'unknown',
        cpu:     parseFloat(parseCpuPercent(stats).toFixed(1)),
        memMB:   parseMemMB(stats),
        memPct:  parseFloat(parseMemPercent(stats).toFixed(1)),
        ports:   c.Ports.map(p => p.PublicPort).filter(Boolean),
      };
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/containers/frontend — ajoute une instance frontend
app.post('/api/containers/frontend', async (req, res) => {
  try {
    // Trouve le prochain numéro de replica
    const existing = await getContainers();
    const replicas  = existing
      .filter(c => c.Labels?.['animeguesser.service'] === 'frontend')
      .map(c => parseInt(c.Labels?.['animeguesser.replica'] ?? '0'))
      .filter(n => !isNaN(n));
    const nextNum = replicas.length > 0 ? Math.max(...replicas) + 1 : 3;

    const name = `animeguesser-frontend-${nextNum}`;

    const container = await docker.createContainer({
      name,
      Image: `${FRONTEND_IMAGE}:latest`,
      Labels: {
        'animeguesser.service': 'frontend',
        'animeguesser.managed': 'true',
        'animeguesser.replica': String(nextNum),
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [NETWORK_NAME]: {},
        },
      },
      HostConfig: {
        NetworkMode: NETWORK_NAME,
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });

    await container.start();
    await rebuildNginxUpstreams();

    broadcast({ type: 'container_added', name });
    res.json({ success: true, name, id: container.id.slice(0, 12) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/containers/:id — supprime un conteneur (sauf les 2 de base)
app.delete('/api/containers/:id', async (req, res) => {
  try {
    const container  = docker.getContainer(req.params.id);
    const info       = await container.inspect();
    const name       = info.Name.replace('/', '');
    const service    = info.Config.Labels?.['animeguesser.service'];

    // Sécurité : on ne peut pas supprimer les 2 frontends de base ni le backend/lb
    const baseContainers = ['animeguesser-frontend-1', 'animeguesser-frontend-2', 'animeguesser-backend', 'animeguesser-lb', 'animeguesser-db'];
    if (baseContainers.includes(name)) {
      return res.status(403).json({ error: 'Impossible de supprimer un conteneur de base.' });
    }

    await container.stop().catch(() => {});
    await container.remove();

    if (service === 'frontend') await rebuildNginxUpstreams();

    broadcast({ type: 'container_removed', name });
    res.json({ success: true, name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/containers/:id/restart
app.post('/api/containers/:id/restart', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.restart();
    broadcast({ type: 'container_restarted', id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/containers/:id/stop
app.post('/api/containers/:id/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop();
    broadcast({ type: 'container_stopped', id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/containers/:id/start
app.post('/api/containers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    if ((await container.inspect()).Config.Labels?.['animeguesser.service'] === 'frontend') {
      await rebuildNginxUpstreams();
    }
    broadcast({ type: 'container_started', id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/logs/:id — dernières 100 lignes de logs
app.get('/api/logs/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({
      stdout: true, stderr: true,
      tail: 100, timestamps: true,
    });
    // Les logs Docker ont un header binaire de 8 bytes par ligne
    const clean = logs.toString('utf8')
      .split('\n')
      .map(l => l.length > 8 ? l.slice(8) : l)
      .join('\n');
    res.type('text/plain').send(clean);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/summary — compteurs globaux
app.get('/api/summary', async (req, res) => {
  try {
    const containers = await getContainers();
    const running    = containers.filter(c => c.State === 'running');
    const frontends  = running.filter(c => c.Labels?.['animeguesser.service'] === 'frontend');
    res.json({
      total:     containers.length,
      running:   running.length,
      stopped:   containers.length - running.length,
      frontends: frontends.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Push de stats toutes les 3s ───────────
setInterval(async () => {
  if (wsClients.size === 0) return;
  try {
    const containers = await getContainers();
    const stats = await Promise.all(containers.map(async (c) => {
      const s = c.State === 'running' ? await getStats(c.Id) : null;
      return {
        id:     c.Id.slice(0, 12),
        cpu:    parseFloat(parseCpuPercent(s).toFixed(1)),
        memMB:  parseMemMB(s),
        memPct: parseFloat(parseMemPercent(s).toFixed(1)),
        status: c.State,
      };
    }));
    broadcast({ type: 'stats_update', stats });
  } catch {}
}, 3000);

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
