// routes/backups.js — Gestion des sauvegardes
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');
const { docker }      = require('../services/docker');
const { broadcast }   = require('../services/ws');

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

// ── GET /api/backups ────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const statusPath    = path.join(BACKUP_DIR, '.last_status.json');
    const snapshotsPath = path.join(BACKUP_DIR, '.snapshots.json');

    const lastStatus = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath, 'utf8'))
      : { last_backup: null, last_status: 'never', last_error: null };

    const snapshots = fs.existsSync(snapshotsPath)
      ? JSON.parse(fs.readFileSync(snapshotsPath, 'utf8'))
      : { count: 0, retention_days: 7, snapshots: [] };

    let logs = '';
    try { logs = fs.readFileSync('/var/log/backup.log', 'utf8').split('\n').slice(-30).join('\n'); } catch {}

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

// ── POST /api/backups/now — backup manuel ──────────────────────────────────────
router.post('/now', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer('animeguesser-backup');
    const exec   = await container.exec({
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

module.exports = router;
