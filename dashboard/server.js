const express   = require('express');
const expressWs = require('express-ws');
const Docker    = require('dockerode');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');

const app = express();
expressWs(app);

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const PORT           = process.env.PORT           || 9000;
const NETWORK_NAME   = process.env.DOCKER_NETWORK  || 'animeguesser';
const LB_CONTAINER   = process.env.LB_CONTAINER    || 'animeguesser-lb';
const LB_CONFIG_PATH = process.env.LB_CONFIG_PATH  || '/lb-config/nginx.conf';

// ── Auth ──────────────────────────────────────────────────
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'gabi7756';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'Opus2018!';
const sessions = new Map(); // token → expiry

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['x-dashboard-token'] || req.query.token;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  if (Date.now() > sessions.get(token)) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expirée' });
  }
  next();
}

// ── Traffic tracking ──────────────────────────────────────
const trafficStats = {
  totalRequests:    0,
  requestsPerMin:   [],  // dernières 60 minutes
  activeUsers:      new Set(),
  containerHits:    {},  // containerId → count
  lastMinuteCount:  0,
  lastMinuteReset:  Date.now(),
  statusCodes:      { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
};

// Reset compteur par minute
setInterval(() => {
  trafficStats.requestsPerMin.push(trafficStats.lastMinuteCount);
  if (trafficStats.requestsPerMin.length > 60) trafficStats.requestsPerMin.shift();
  trafficStats.lastMinuteCount = 0;
  trafficStats.lastMinuteReset = Date.now();
}, 60000);

// Middleware de tracking
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/login' || req.path === '/ws') {
    return next();
  }
  trafficStats.totalRequests++;
  trafficStats.lastMinuteCount++;
  const ip = req.headers['x-forwarded-for'] || req.ip;
  if (ip) trafficStats.activeUsers.add(ip);
  res.on('finish', () => {
    const code = res.statusCode;
    if      (code < 300) trafficStats.statusCodes['2xx']++;
    else if (code < 400) trafficStats.statusCodes['3xx']++;
    else if (code < 500) trafficStats.statusCodes['4xx']++;
    else                 trafficStats.statusCodes['5xx']++;
  });
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── WebSocket ─────────────────────────────────────────────
const wsClients = new Set();
app.ws('/ws', (ws, req) => {
  const token = req.query.token;
  if (!token || !sessions.has(token)) { ws.close(); return; }
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ── Auth endpoints ────────────────────────────────────────
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== DASHBOARD_USER || password !== DASHBOARD_PASS) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = generateToken();
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8h
  res.json({ token });
});

app.post('/logout', requireAuth, (req, res) => {
  const token = req.headers['x-dashboard-token'];
  sessions.delete(token);
  res.json({ success: true });
});

// ── Docker helpers ────────────────────────────────────────
async function getAllContainers() {
  const all = await docker.listContainers({ all: true });
  return all.filter(c =>
    c.Labels?.['animeguesser.service'] ||
    c.Names?.[0]?.includes('animeguesser')
  );
}

async function getContainerStats(id) {
  try {
    const container = docker.getContainer(id);
    return await new Promise((resolve, reject) => {
      container.stats({ stream: false }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  } catch { return null; }
}

function parseCpu(stats) {
  if (!stats) return 0;
  const cpu = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const sys = stats.cpu_stats.system_cpu_usage      - stats.precpu_stats.system_cpu_usage;
  const n   = stats.cpu_stats.online_cpus || 1;
  return sys > 0 ? parseFloat(((cpu / sys) * n * 100).toFixed(1)) : 0;
}

function parseMem(stats) {
  if (!stats) return { used: 0, total: 0, pct: 0 };
  const used  = stats.memory_stats.usage || 0;
  const total = stats.memory_stats.limit || 1;
  return {
    used:  Math.round(used  / 1024 / 1024),
    total: Math.round(total / 1024 / 1024),
    pct:   parseFloat(((used / total) * 100).toFixed(1)),
  };
}

// ── Rebuild LB upstream ───────────────────────────────────
async function rebuildNginxUpstreams() {
  try {
    const containers = await getAllContainers();
    const frontends  = containers.filter(c =>
      c.Labels?.['animeguesser.service'] === 'frontend' && c.State === 'running'
    );
    const lines = frontends.map(c =>
      `        server ${c.Names[0].replace('/', '')}:80 weight=1 max_fails=3 fail_timeout=30s;`
    ).join('\n');

    let config = fs.readFileSync(LB_CONFIG_PATH, 'utf8');
    config = config.replace(
      /upstream frontend_pool \{[\s\S]*?\}/,
      `upstream frontend_pool {\n        least_conn;\n${lines}\n    }`
    );
    fs.writeFileSync(LB_CONFIG_PATH, config);

    const lb = docker.getContainer(LB_CONTAINER);
    const exec = await lb.exec({ Cmd: ['nginx', '-s', 'reload'], AttachStdout: true, AttachStderr: true });
    await exec.start();
    console.log(`[LB] Rebuilt with ${frontends.length} frontend(s)`);
  } catch (e) {
    console.error('[LB] Rebuild failed:', e.message);
  }
}

// ── Detect image name from existing containers ────────────
async function detectImageName(service) {
  try {
    const containers = await getAllContainers();
    const match = containers.find(c => c.Labels?.['animeguesser.service'] === service);
    return match?.Image || null;
  } catch { return null; }
}

// ── API: Containers ───────────────────────────────────────
app.get('/api/containers', requireAuth, async (req, res) => {
  try {
    const containers = await getAllContainers();
    const result = await Promise.all(containers.map(async (c) => {
      const stats = c.State === 'running' ? await getContainerStats(c.Id) : null;
      const mem   = parseMem(stats);
      return {
        id:      c.Id.slice(0, 12),
        fullId:  c.Id,
        name:    c.Names[0].replace('/', ''),
        image:   c.Image,
        status:  c.State,
        service: c.Labels?.['animeguesser.service'] ?? 'unknown',
        cpu:     parseCpu(stats),
        memMB:   mem.used,
        memPct:  mem.pct,
        ports:   c.Ports.map(p => p.PublicPort).filter(Boolean),
      };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    const containers = await getAllContainers();
    const running    = containers.filter(c => c.State === 'running');
    res.json({
      total:     containers.length,
      running:   running.length,
      stopped:   containers.length - running.length,
      frontends: running.filter(c => c.Labels?.['animeguesser.service'] === 'frontend').length,
      backends:  running.filter(c => c.Labels?.['animeguesser.service'] === 'backend').length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/containers/spawn — ajoute une instance (frontend ou backend)
app.post('/api/containers/spawn', requireAuth, async (req, res) => {
  const { service } = req.body;
  if (!['frontend', 'backend'].includes(service)) {
    return res.status(400).json({ error: 'Service invalide. Choisir: frontend ou backend' });
  }
  try {
    const imageName = await detectImageName(service);
    if (!imageName) {
      return res.status(404).json({ error: `Aucune image trouvée pour le service "${service}". Build d'abord avec docker compose up --build.` });
    }

    const containers = await getAllContainers();
    const replicas   = containers
      .filter(c => c.Labels?.['animeguesser.service'] === service)
      .map(c => parseInt(c.Labels?.['animeguesser.replica'] ?? '0'))
      .filter(n => !isNaN(n));
    const nextNum = replicas.length > 0 ? Math.max(...replicas) + 1 : 3;
    const name    = `animeguesser-${service}-${nextNum}`;

    const container = await docker.createContainer({
      name,
      Image: imageName,
      Labels: {
        'animeguesser.service': service,
        'animeguesser.managed': 'true',
        'animeguesser.replica': String(nextNum),
      },
      HostConfig: {
        NetworkMode: NETWORK_NAME,
        RestartPolicy: { Name: 'unless-stopped' },
      },
      NetworkingConfig: {
        EndpointsConfig: { [NETWORK_NAME]: {} },
      },
    });

    await container.start();
    if (service === 'frontend') await rebuildNginxUpstreams();

    broadcast({ type: 'container_added', name, service });
    res.json({ success: true, name, id: container.id.slice(0, 12) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/containers/:id
const BASE_CONTAINERS = [
  'animeguesser-frontend-1', 'animeguesser-frontend-2',
  'animeguesser-backend', 'animeguesser-lb',
  'animeguesser-db', 'animeguesser-dashboard',
];

app.delete('/api/containers/:id', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const info      = await container.inspect();
    const name      = info.Name.replace('/', '');

    if (BASE_CONTAINERS.includes(name)) {
      return res.status(403).json({ error: 'Impossible de supprimer un conteneur de base.' });
    }

    if (info.State.Running) await container.stop({ t: 5 });
    await container.remove({ force: true });

    const service = info.Config.Labels?.['animeguesser.service'];
    if (service === 'frontend') await rebuildNginxUpstreams();

    broadcast({ type: 'container_removed', name });
    res.json({ success: true, name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/containers/:id/restart', requireAuth, async (req, res) => {
  try {
    await docker.getContainer(req.params.id).restart();
    broadcast({ type: 'container_restarted', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/containers/:id/stop', requireAuth, async (req, res) => {
  try {
    await docker.getContainer(req.params.id).stop({ t: 5 });
    broadcast({ type: 'container_stopped', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/containers/:id/start', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    const info = await container.inspect();
    if (info.Config.Labels?.['animeguesser.service'] === 'frontend') {
      await rebuildNginxUpstreams();
    }
    broadcast({ type: 'container_started', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/logs/:id', requireAuth, async (req, res) => {
  try {
    const logs = await docker.getContainer(req.params.id).logs({
      stdout: true, stderr: true, tail: 150, timestamps: true,
    });
    const clean = logs.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    res.type('text/plain').send(clean);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── API: Server perf ──────────────────────────────────────
app.get('/api/server/perf', requireAuth, async (req, res) => {
  try {
    const containers = await getAllContainers();
    const running    = containers.filter(c => c.State === 'running');

    const allStats = await Promise.all(running.map(async c => {
      const s   = await getContainerStats(c.Id);
      const mem = parseMem(s);
      return {
        name:    c.Names[0].replace('/', ''),
        service: c.Labels?.['animeguesser.service'] ?? 'unknown',
        cpu:     parseCpu(s),
        memMB:   mem.used,
        memPct:  mem.pct,
      };
    }));

    // Totaux
    const totalCpu = allStats.reduce((s, c) => s + c.cpu, 0);
    const totalMem = allStats.reduce((s, c) => s + c.memMB, 0);

    res.json({ containers: allStats, totalCpu: parseFloat(totalCpu.toFixed(1)), totalMemMB: totalMem });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── API: Traffic ──────────────────────────────────────────
app.get('/api/traffic', requireAuth, async (req, res) => {
  try {
    // Lit les logs du LB pour compter les hits par upstream
    const lbLogs = await docker.getContainer(LB_CONTAINER).logs({
      stdout: true, stderr: true, tail: 500, timestamps: false,
    });
    const lines = lbLogs.toString('utf8').split('\n').filter(Boolean);

    const containerHits = {};
    const statusCount   = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const minutesBuckets = {}; // "HH:MM" → count
    let totalRequests = 0;

    for (const line of lines) {
      const clean = line.length > 8 ? line.slice(8) : line;

      // Parse upstream
      const upstreamMatch = clean.match(/upstream="([^"]+)"/);
      if (upstreamMatch) {
        const ip = upstreamMatch[1];
        containerHits[ip] = (containerHits[ip] || 0) + 1;
      }

      // Parse status
      const statusMatch = clean.match(/" (\d{3}) /);
      if (statusMatch) {
        totalRequests++;
        const code = parseInt(statusMatch[1]);
        if      (code < 300) statusCount['2xx']++;
        else if (code < 400) statusCount['3xx']++;
        else if (code < 500) statusCount['4xx']++;
        else                 statusCount['5xx']++;
      }

      // Parse time for buckets
      const timeMatch = clean.match(/\[(\d{2}\/\w+\/\d{4}):(\d{2}:\d{2}):\d{2}/);
      if (timeMatch) {
        const key = timeMatch[2];
        minutesBuckets[key] = (minutesBuckets[key] || 0) + 1;
      }
    }

    // Résout les IPs en noms de conteneurs
    const namedHits = {};
    const containers = await getAllContainers();
    for (const [ip, count] of Object.entries(containerHits)) {
      // Cherche un conteneur dont l'IP correspond
      const ipOnly = ip.split(':')[0];
      const match  = containers.find(c => {
        const networks = c.NetworkSettings?.Networks || {};
        return Object.values(networks).some(n => n.IPAddress === ipOnly);
      });
      const label = match ? match.Names[0].replace('/', '') : ip;
      namedHits[label] = (namedHits[label] || 0) + count;
    }

    res.json({
      totalRequests,
      statusCount,
      containerHits: namedHits,
      requestsOverTime: Object.entries(minutesBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([time, count]) => ({ time, count })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Push stats toutes les 3s ──────────────────────────────
setInterval(async () => {
  if (wsClients.size === 0) return;
  try {
    const containers = await getAllContainers();
    const stats = await Promise.all(
      containers.filter(c => c.State === 'running').map(async c => {
        const s   = await getContainerStats(c.Id);
        const mem = parseMem(s);
        return { id: c.Id.slice(0, 12), cpu: parseCpu(s), memMB: mem.used, memPct: mem.pct, status: c.State };
      })
    );
    broadcast({ type: 'stats_update', stats });
  } catch {}
}, 3000);

app.listen(PORT, () => console.log(`Dashboard v2 on http://localhost:${PORT}`));

// ── API: Backups ──────────────────────────────────────────
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

app.get('/api/backups', requireAuth, (req, res) => {
  try {
    // Lit le fichier de statut généré par backup.sh
    const statusPath   = path.join(BACKUP_DIR, '.last_status.json');
    const snapshotsPath = path.join(BACKUP_DIR, '.snapshots.json');
    const logPath       = path.join(BACKUP_DIR, '..', 'backup.log');

    const lastStatus = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath, 'utf8'))
      : { last_backup: null, last_status: 'never', last_error: null };

    const snapshots = fs.existsSync(snapshotsPath)
      ? JSON.parse(fs.readFileSync(snapshotsPath, 'utf8'))
      : { count: 0, retention_days: 7, snapshots: [] };

    // Lit les logs depuis le conteneur backup
    let logs = '';
    try {
      logs = fs.readFileSync('/var/log/backup.log', 'utf8').split('\n').slice(-30).join('\n');
    } catch {}

    // Calcule la prochaine exécution (2h00 UTC)
    const now  = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    res.json({
      next_backup:    next.toISOString(),
      schedule:       'Tous les jours à 02:00 UTC',
      retention_days: 7,
      last:           lastStatus,
      index:          snapshots,
      logs,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Version frontend ─────────────────────────────
// Lit le package.json du frontend (monté via volume) pour exposer la version courante
const FRONTEND_PKG  = process.env.FRONTEND_PKG  || '/frontend/package.json';
const FRONTEND_HASH = process.env.FRONTEND_HASH || '/frontend/.version-hash';

app.get('/api/version', requireAuth, (req, res) => {
  try {
    const pkg     = JSON.parse(fs.readFileSync(FRONTEND_PKG, 'utf8'));
    const version = pkg.version || '0.0.0';
    let lastHash  = null;
    let lastBump  = null;
    try {
      lastHash = fs.readFileSync(FRONTEND_HASH, 'utf8').trim().slice(0, 12);
      lastBump = fs.statSync(FRONTEND_HASH).mtime.toISOString();
    } catch { /* pas encore de bump effectué */ }
    res.json({ version, lastHash, lastBump });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/backups/now — déclenche un backup manuel
app.post('/api/backups/now', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer('animeguesser-backup');
    const exec = await container.exec({
      Cmd: ['/usr/local/bin/backup.sh'],
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    let output = '';
    stream.on('data', chunk => { output += chunk.toString('utf8').slice(8); });
    stream.on('end', () => {
      broadcast({ type: 'backup_done' });
      res.json({ success: true, output: output.slice(-500) });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
