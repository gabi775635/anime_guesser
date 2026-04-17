// routes/cron.js — Lecture des crontabs de tous les conteneurs
const express = require('express');
const router  = express.Router();
const { requireAuth }   = require('../middleware/auth');
const { getAllContainers, execInContainer } = require('../services/docker');

// ── GET /api/cron — crontabs de tous les conteneurs running ────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const containers = await getAllContainers();
    const running    = containers.filter(c => c.State === 'running');

    const results = await Promise.all(running.map(async (c) => {
      const id   = c.Id;
      const name = c.Names[0].replace('/', '');

      // Cherche la crontab : crontab -l > /etc/crontabs/root > /var/spool/cron/crontabs/root
      const raw = await execInContainer(id, ['sh', '-c',
        'crontab -l 2>/dev/null || cat /etc/crontabs/root 2>/dev/null || cat /var/spool/cron/crontabs/root 2>/dev/null || echo ""'
      ]);

      const entries = raw
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

      // Log cron : syslog ou fichier dédié selon la distrib
      const logs = await execInContainer(id, ['sh', '-c', [
        'tail -n 30 /var/log/cron.log 2>/dev/null',
        'grep -i cron /var/log/syslog 2>/dev/null | tail -30',
        'tail -n 30 /var/log/version-watchdog.log 2>/dev/null',
        'tail -n 30 /var/log/backup.log 2>/dev/null',
        'echo "[aucun log cron trouvé]"',
      ].join(' || ')]);

      return {
        id:      id.slice(0, 12),
        name,
        service: c.Labels?.['animeguesser.service'] ?? 'unknown',
        hasCron: entries.length > 0,
        entries,
        logs: logs.trim(),
      };
    }));

    // Sépare ceux qui ont un cron de ceux qui n'en ont pas
    res.json({
      withCron:    results.filter(r => r.hasCron),
      withoutCron: results.filter(r => !r.hasCron).map(r => r.name),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/cron/:id — crontab + log d'un conteneur spécifique ────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const raw = await execInContainer(req.params.id, ['sh', '-c',
      'crontab -l 2>/dev/null || cat /etc/crontabs/root 2>/dev/null || cat /var/spool/cron/crontabs/root 2>/dev/null || echo ""'
    ]);

    const entries = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    const logs = await execInContainer(req.params.id, ['sh', '-c', [
      'tail -n 100 /var/log/cron.log 2>/dev/null',
      'grep -i cron /var/log/syslog 2>/dev/null | tail -100',
      'tail -n 100 /var/log/version-watchdog.log 2>/dev/null',
      'tail -n 100 /var/log/backup.log 2>/dev/null',
      'echo "[aucun log cron trouvé]"',
    ].join(' || ')]);

    res.json({ entries, logs: logs.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
