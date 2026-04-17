// routes/backups.js
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');
const { docker }      = require('../services/docker');
const { broadcast }   = require('../services/ws');

const BACKUP_DIR       = process.env.BACKUP_DIR       || '/backups';
const BACKUP_CONTAINER = process.env.BACKUP_CONTAINER || 'animeguesser_backup';

router.get('/', requireAuth, async (req, res) => {
  try {
    // Statut dernière exécution
    const statusPath = path.join(BACKUP_DIR, '.last_status.json');
    const lastStatus = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath, 'utf8'))
      : { last_backup: null, last_status: 'never', last_error: null };

    // Liste réelle des fichiers .sql.gz dans le volume
    let snapshots = [];
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.sql.gz'))
        .sort()
        .reverse();
      snapshots = files.map(f => {
        const fp   = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(fp);
        const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
        return { file: f, size: sizeMb + ' Mo', date: stat.mtime.toISOString() };
      });
    } catch {}

    // Logs depuis le conteneur backup via docker logs
    let logs = '';
    try {
      const raw = await docker.getContainer(BACKUP_CONTAINER).logs({
        stdout: true, stderr: true, tail: 50, timestamps: true,
      });
      logs = raw.toString('utf8').split('\n').map(l => l.length > 8 ? l.slice(8) : l).join('\n');
    } catch {
      // Fallback fichier log monté
      try { logs = fs.readFileSync(path.join(BACKUP_DIR, 'backup.log'), 'utf8').split('\n').slice(-50).join('\n'); } catch {}
    }

    const now  = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    res.json({
      next_backup:    next.toISOString(),
      schedule:       'Tous les jours à 02:00 UTC',
      retention_days: 7,
      last:           lastStatus,
      snapshots,
      snapshotCount:  snapshots.length,
      logs,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Backup manuel
router.post('/now', requireAuth, async (req, res) => {
  try {
    const container = docker.getContainer(BACKUP_CONTAINER);
    const exec   = await container.exec({ Cmd: ['/usr/local/bin/backup.sh'], AttachStdout: true, AttachStderr: true });
    const stream = await exec.start({ hijack: true, stdin: false });
    let output = '';
    stream.on('data', chunk => { output += chunk.toString('utf8').slice(8); });
    stream.on('end', () => { broadcast({ type: 'backup_done' }); res.json({ success: true, output: output.slice(-500) }); });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download d'un snapshot
router.get('/download/:filename', requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier introuvable' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

module.exports = router;
