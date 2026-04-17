// routes/containers.js
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  docker, getAllContainers, getContainerStats,
  parseCpu, parseMem, detectImageName, execInContainer,
} = require('../services/docker');
const { broadcast } = require('../services/ws');
const fs = require('fs');

const NETWORK_NAME   = process.env.DOCKER_NETWORK || 'animeguesser';
const LB_CONTAINER   = process.env.LB_CONTAINER   || 'animeguesser_lb';
const LB_CONFIG_PATH = process.env.LB_CONFIG_PATH || '/lb-config/nginx.conf';

// Conteneurs de base non supprimables
const BASE_CONTAINERS = [
  'animeguesser_app_front_1', 'animeguesser_app_front_2',
  'animeguesser_app_back',    'animeguesser_lb',
  'animeguesser_app_bd',      'animeguesser_dashboard',
  'animeguesser_version_server', 'animeguesser_backup',
];

// ── Résout le vrai nom du réseau Docker (préfixe du dossier projet) ────────────
async function resolveNetwork(preferred) {
  try {
    const networks = await docker.listNetworks();
    // Cherche d'abord le nom exact
    const exact = networks.find(n => n.Name === preferred);
    if (exact) return preferred;
    // Sinon cherche par suffixe (ex: anime_guesser_animeguesser)
    const fuzzy = networks.find(n => n.Name.endsWith('_' + preferred) || n.Name.includes(preferred));
    if (fuzzy) return fuzzy.Name;
    return preferred;
  } catch {
    return preferred;
  }
}

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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/containers/summary ───────────────────────────────────────────────
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/containers/:id/detail ────────────────────────────────────────────
router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const info      = await container.inspect();
    const service   = info.Config.Labels?.['animeguesser.service'] ?? 'unknown';

    let cpu = 0, mem = { used: 0, total: 0, pct: 0 };
    if (info.State.Running) {
      const stats = await getContainerStats(req.params.id);
      cpu = parseCpu(stats);
      mem = parseMem(stats);
    }

    let logs = '';
    try {
      const raw = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = raw.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    } catch { logs = '[logs non disponibles]'; }

    // ── Cron ──────────────────────────────────────────────────────────────────
    let cronEntries = [], cronLogs = '';
    if (info.State.Running) {
      const crontabRaw = await execInContainer(req.params.id, ['sh', '-c',
        'crontab -l 2>/dev/null || cat /etc/crontabs/root 2>/dev/null || cat /etc/cron.d/* 2>/dev/null || cat /var/spool/cron/crontabs/root 2>/dev/null || echo ""'
      ]);
      cronEntries = crontabRaw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      cronLogs = await execInContainer(req.params.id, ['sh', '-c',
        'tail -n 50 /var/log/cron.log 2>/dev/null || tail -n 50 /var/log/version-server.log 2>/dev/null || tail -n 50 /var/log/backup.log 2>/dev/null || grep -i cron /var/log/syslog 2>/dev/null | tail -50 || echo "[pas de log cron]"'
      ]);
    }

    // ── Infos spécifiques ─────────────────────────────────────────────────────
    let extra = {};
    if (service === 'frontend') {
      const nginxLogs = await execInContainer(req.params.id, ['sh', '-c', 'tail -n 200 /var/log/nginx/access.log 2>/dev/null || echo ""']);
      const lines = nginxLogs.split('\n').filter(Boolean);
      const sc = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
      lines.forEach(l => {
        const m = l.match(/" (\d{3}) /);
        if (m) {
          const c = parseInt(m[1]);
          if (c < 300) sc['2xx']++; else if (c < 400) sc['3xx']++; else if (c < 500) sc['4xx']++; else sc['5xx']++;
        }
      });
      extra = { type: 'web', totalRequests: lines.length, statusCodes: sc };
    }
    if (service === 'backend') {
      const phpVersion = await execInContainer(req.params.id, ['php', '-r', 'echo PHP_VERSION;']).then(v => v.trim()).catch(() => '?');
      const laravelVer = await execInContainer(req.params.id, ['php', 'artisan', '--version']).then(v => v.trim()).catch(() => '?');
      extra = { type: 'backend', phpVersion, laravelVersion: laravelVer };
    }
    if (service === 'version-server') {
      const releases = await execInContainer(req.params.id, ['sh', '-c', 'ls -lh /releases 2>/dev/null || echo "[aucune release]"']);
      extra = { type: 'version-server', releases };
    }
    if (service === 'backup') {
      const lastRun = await execInContainer(req.params.id, ['sh', '-c', 'tail -n 30 /var/log/backup.log 2>/dev/null || echo "[pas de log]"']);
      extra = { type: 'backup', lastRun };
    }

    res.json({
      id: req.params.id, name: info.Name.replace('/', ''), service,
      status: info.State.Status, running: info.State.Running,
      startedAt: info.State.StartedAt, image: info.Config.Image,
      labels: info.Config.Labels,
      env: (info.Config.Env || []).filter(e => !e.match(/PASSWORD|SECRET|KEY/i)),
      ports: info.NetworkSettings.Ports,
      cpu, mem, logs,
      cron: { entries: cronEntries, logs: cronLogs },
      extra,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/containers/spawn — crée n'importe quel type de conteneur ────────
router.post('/spawn', requireAuth, async (req, res) => {
  const { service, image, name: customName, env, ports } = req.body;

  if (!service) return res.status(400).json({ error: 'service requis' });

  try {
    // Résout le vrai nom du réseau
    const networkName = await resolveNetwork(NETWORK_NAME);

    // Trouve l'image : soit fournie, soit détectée depuis les conteneurs existants
    let imageName = image || await detectImageName(service);
    if (!imageName) {
      return res.status(404).json({ error: `Aucune image pour "${service}". Spécifie une image ou lance d'abord un build.` });
    }

    // Calcule le nom du nouveau conteneur
    const containers = await getAllContainers();
    const replicas   = containers
      .filter(c => c.Labels?.['animeguesser.service'] === service)
      .map(c => parseInt(c.Labels?.['animeguesser.replica'] ?? '0'))
      .filter(n => !isNaN(n));
    const nextNum = replicas.length > 0 ? Math.max(...replicas) + 1 : 1;
    const name    = customName || `animeguesser_${service}_${nextNum}`;

    // Prépare la config ports si fournie
    const portBindings = {};
    const exposedPorts = {};
    if (ports && Array.isArray(ports)) {
      ports.forEach(p => {
        const [host, container] = p.split(':');
        const key = `${container}/tcp`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: host }];
      });
    }

    const newContainer = await docker.createContainer({
      name,
      Image: imageName,
      Env: env || [],
      ExposedPorts: Object.keys(exposedPorts).length ? exposedPorts : undefined,
      Labels: {
        'animeguesser.service': service,
        'animeguesser.managed': 'true',
        'animeguesser.replica': String(nextNum),
      },
      HostConfig: {
        NetworkMode: networkName,
        RestartPolicy: { Name: 'unless-stopped' },
        PortBindings: Object.keys(portBindings).length ? portBindings : undefined,
      },
      NetworkingConfig: { EndpointsConfig: { [networkName]: {} } },
    });

    await newContainer.start();
    if (service === 'frontend') await rebuildNginxUpstreams();

    broadcast({ type: 'container_added', name, service });
    res.json({ success: true, name, id: newContainer.id.slice(0, 12) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/containers/:id ────────────────────────────────────────────────
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Actions start/stop/restart ────────────────────────────────────────────────
router.post('/:id/restart', requireAuth, async (req, res) => {
  try { await docker.getContainer(req.params.id).restart(); broadcast({ type: 'container_restarted', id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/:id/stop', requireAuth, async (req, res) => {
  try { await docker.getContainer(req.params.id).stop({ t: 5 }); broadcast({ type: 'container_stopped', id: req.params.id }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    const info = await container.inspect();
    if (info.Config.Labels?.['animeguesser.service'] === 'frontend') await rebuildNginxUpstreams();
    broadcast({ type: 'container_started', id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/containers/:id/logs ──────────────────────────────────────────────
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const tail = parseInt(req.query.tail) || 150;
    const logs = await docker.getContainer(req.params.id).logs({ stdout: true, stderr: true, tail, timestamps: true });
    const clean = logs.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    res.type('text/plain').send(clean);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/containers/images — liste les images dispo pour spawn ─────────────
router.get('/images', requireAuth, async (req, res) => {
  try {
    const images = await docker.listImages();
    const result = images
      .filter(i => i.RepoTags && i.RepoTags[0] !== '<none>:<none>')
      .map(i => ({
        id:   i.Id.slice(7, 19),
        tags: i.RepoTags || [],
        size: Math.round(i.Size / 1024 / 1024),
      }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
