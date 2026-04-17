// routes/containers.js — CRUD conteneurs Docker + detail
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  docker,
  getAllContainers,
  getContainerStats,
  parseCpu,
  parseMem,
  detectImageName,
  execInContainer,
} = require('../services/docker');
const { broadcast } = require('../services/ws');

const NETWORK_NAME   = process.env.DOCKER_NETWORK || 'animeguesser';
const LB_CONTAINER   = process.env.LB_CONTAINER   || 'animeguesser-lb';
const LB_CONFIG_PATH = process.env.LB_CONFIG_PATH || '/lb-config/nginx.conf';
const fs   = require('fs');

// Conteneurs de base non supprimables
const BASE_CONTAINERS = [
  'animeguesser-frontend-1', 'animeguesser-frontend-2',
  'animeguesser-backend',    'animeguesser-lb',
  'animeguesser-db',         'animeguesser-dashboard',
  'animeguesser-version-server',
];

// ── Rebuild load balancer ──────────────────────────────────────────────────────
async function rebuildNginxUpstreams() {
  try {
    const containers = await getAllContainers();
    const frontends  = containers.filter(
      c => c.Labels?.['animeguesser.service'] === 'frontend' && c.State === 'running'
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

    const lb   = docker.getContainer(LB_CONTAINER);
    const exec = await lb.exec({ Cmd: ['nginx', '-s', 'reload'], AttachStdout: true, AttachStderr: true });
    await exec.start();
    console.log(`[LB] Rebuild avec ${frontends.length} frontend(s)`);
  } catch (e) {
    console.error('[LB] Rebuild échoué :', e.message);
  }
}

// ── GET /api/containers ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/containers/summary ────────────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/containers/:id/detail ─────────────────────────────────────────────
// Retourne toutes les infos d'un conteneur : état, stats, logs, cron, infos spécifiques
router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const info      = await container.inspect();
    const service   = info.Config.Labels?.['animeguesser.service'] ?? 'unknown';

    // Stats ressources
    let cpu = 0, mem = { used: 0, total: 0, pct: 0 };
    if (info.State.Running) {
      const stats = await getContainerStats(req.params.id);
      cpu = parseCpu(stats);
      mem = parseMem(stats);
    }

    // Logs récents (dernières 100 lignes)
    let logs = '';
    try {
      const rawLogs = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = rawLogs.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    } catch { logs = '[logs non disponibles]'; }

    // ── Cron : lire la crontab de root dans le conteneur ──────────────
    let cronEntries = [];
    let cronLogs    = '';
    if (info.State.Running) {
      // Tente crontab -l puis /etc/crontabs/root puis /var/spool/cron/crontabs/root
      const crontabRaw = await execInContainer(req.params.id, ['sh', '-c',
        'crontab -l 2>/dev/null || cat /etc/crontabs/root 2>/dev/null || cat /var/spool/cron/crontabs/root 2>/dev/null || echo ""'
      ]);
      cronEntries = crontabRaw
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

      // Log cron (syslog ou fichier dédié)
      cronLogs = await execInContainer(req.params.id, ['sh', '-c',
        'tail -n 50 /var/log/cron.log 2>/dev/null || grep CRON /var/log/syslog 2>/dev/null | tail -50 || tail -50 /var/log/version-watchdog.log 2>/dev/null || echo "[pas de log cron trouvé]"'
      ]);
    }

    // ── Infos spécifiques par type de service ──────────────────────────
    let extra = {};

    if (service === 'frontend') {
      // Activité : on lit les logs nginx pour compter les requêtes
      const nginxLogs = await execInContainer(req.params.id, ['sh', '-c',
        'tail -n 200 /var/log/nginx/access.log 2>/dev/null || echo ""'
      ]);
      const lines = nginxLogs.split('\n').filter(Boolean);
      const statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
      for (const line of lines) {
        const m = line.match(/" (\d{3}) /);
        if (m) {
          const c = parseInt(m[1]);
          if      (c < 300) statusCodes['2xx']++;
          else if (c < 400) statusCodes['3xx']++;
          else if (c < 500) statusCodes['4xx']++;
          else              statusCodes['5xx']++;
        }
      }
      extra = {
        type:         'web',
        totalRequests: lines.length,
        statusCodes,
        nginxVersion: await execInContainer(req.params.id, ['nginx', '-v']).then(v => v.trim()).catch(() => '?'),
      };
    }

    if (service === 'backend') {
      // Version PHP + Laravel
      const phpVersion = await execInContainer(req.params.id, ['php', '-r', 'echo PHP_VERSION;']).then(v => v.trim()).catch(() => '?');
      const laravelVer = await execInContainer(req.params.id, ['php', 'artisan', '--version']).then(v => v.trim()).catch(() => '?');
      extra = { type: 'backend', phpVersion, laravelVersion: laravelVer };
    }

    if (service === 'version-server') {
      // Liste des releases disponibles
      const releases = await execInContainer(req.params.id, ['sh', '-c',
        'ls -lh /releases 2>/dev/null | tail -20 || echo "[aucune release]"'
      ]);
      extra = { type: 'version-server', releases };
    }

    if (service === 'backup') {
      const lastRun = await execInContainer(req.params.id, ['sh', '-c',
        'tail -n 20 /var/log/backup.log 2>/dev/null || echo "[pas de log backup]"'
      ]);
      extra = { type: 'backup', lastRun };
    }

    res.json({
      id:        req.params.id,
      name:      info.Name.replace('/', ''),
      service,
      status:    info.State.Status,
      running:   info.State.Running,
      startedAt: info.State.StartedAt,
      image:     info.Config.Image,
      labels:    info.Config.Labels,
      env:       (info.Config.Env || []).filter(e => !e.match(/PASSWORD|SECRET|KEY/i)), // masque les secrets
      ports:     info.NetworkSettings.Ports,
      cpu,
      mem,
      logs,
      cron: { entries: cronEntries, logs: cronLogs },
      extra,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/containers/spawn ─────────────────────────────────────────────────
router.post('/spawn', requireAuth, async (req, res) => {
  const { service } = req.body;
  if (!['frontend', 'backend'].includes(service)) {
    return res.status(400).json({ error: 'Service invalide. Choisir: frontend ou backend' });
  }
  try {
    const imageName = await detectImageName(service);
    if (!imageName) {
      return res.status(404).json({ error: `Aucune image pour "${service}". Lancer d'abord docker compose up --build.` });
    }
    const containers = await getAllContainers();
    const replicas   = containers
      .filter(c => c.Labels?.['animeguesser.service'] === service)
      .map(c => parseInt(c.Labels?.['animeguesser.replica'] ?? '0'))
      .filter(n => !isNaN(n));
    const nextNum  = replicas.length > 0 ? Math.max(...replicas) + 1 : 3;
    const name     = `animeguesser-${service}-${nextNum}`;

    const newContainer = await docker.createContainer({
      name,
      Image: imageName,
      Labels: {
        'animeguesser.service': service,
        'animeguesser.managed': 'true',
        'animeguesser.replica': String(nextNum),
      },
      HostConfig: { NetworkMode: NETWORK_NAME, RestartPolicy: { Name: 'unless-stopped' } },
      NetworkingConfig: { EndpointsConfig: { [NETWORK_NAME]: {} } },
    });

    await newContainer.start();
    if (service === 'frontend') await rebuildNginxUpstreams();

    broadcast({ type: 'container_added', name, service });
    res.json({ success: true, name, id: newContainer.id.slice(0, 12) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/containers/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/containers/:id/restart|start|stop ────────────────────────────────
router.post('/:id/restart', requireAuth, async (req, res) => {
  try {
    await docker.getContainer(req.params.id).restart();
    broadcast({ type: 'container_restarted', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/stop', requireAuth, async (req, res) => {
  try {
    await docker.getContainer(req.params.id).stop({ t: 5 });
    broadcast({ type: 'container_stopped', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/start', requireAuth, async (req, res) => {
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

// ── GET /api/containers/:id/logs ───────────────────────────────────────────────
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const tail = parseInt(req.query.tail) || 150;
    const logs = await docker.getContainer(req.params.id).logs({
      stdout: true, stderr: true, tail, timestamps: true,
    });
    const clean = logs.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    res.type('text/plain').send(clean);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
