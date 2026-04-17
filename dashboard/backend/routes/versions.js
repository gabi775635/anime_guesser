// routes/versions.js
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

const RELEASES_DIR = process.env.RELEASES_DIR || '/releases';
const VERSIONS_DB  = process.env.VERSIONS_DB  || '/releases/versions.json';

function loadVersionsDb() {
  // Essaie le JSON d'abord
  if (fs.existsSync(VERSIONS_DB)) {
    try { return JSON.parse(fs.readFileSync(VERSIONS_DB, 'utf8')); } catch {}
  }

  // Fallback : scan du dossier releases pour construire la liste
  const versions = [];
  if (!fs.existsSync(RELEASES_DIR)) return { versions };

  const files = fs.readdirSync(RELEASES_DIR).filter(f =>
    ['.apk', '.exe', '.dmg', '.deb', '.AppImage', '.zip'].some(ext => f.endsWith(ext))
  );

  // Groupe par version (extrait depuis le nom du fichier ex: animeguesser-1.2.3-android-arm64.apk)
  const byVersion = {};
  files.forEach(f => {
    const stat = fs.statSync(path.join(RELEASES_DIR, f));
    const match = f.match(/(\d+\.\d+\.\d+)/);
    const version = match ? match[1] : 'unknown';
    const ext = path.extname(f).toLowerCase();
    const platformMap = { '.apk': 'android', '.exe': 'windows', '.dmg': 'macos', '.deb': 'linux', '.AppImage': 'linux', '.zip': 'desktop' };
    if (!byVersion[version]) byVersion[version] = { version, builtAt: stat.mtime.toISOString(), channel: 'stable', notes: '', files: [] };
    byVersion[version].files.push({
      platform: platformMap[ext] || 'unknown',
      filename: f,
      sizeMb:   (stat.size / 1024 / 1024).toFixed(1),
    });
  });

  return { versions: Object.values(byVersion) };
}

// GET /api/versions
router.get('/', requireAuth, (req, res) => {
  try { res.json(loadVersionsDb()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/versions/latest
router.get('/latest', requireAuth, (req, res) => {
  try {
    const { versions } = loadVersionsDb();
    if (!versions.length) return res.json({ latest: null });
    const sorted = [...versions].sort((a, b) => {
      const pa = a.version.split('.').map(Number);
      const pb = b.version.split('.').map(Number);
      for (let i = 0; i < 3; i++) if ((pa[i]??0) !== (pb[i]??0)) return (pb[i]??0) - (pa[i]??0);
      return 0;
    });
    res.json({ latest: sorted[0], all: sorted.slice(0, 5) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/versions/logs — logs du version-server
router.get('/logs', requireAuth, (req, res) => {
  try {
    const logFile = '/var/log/version-server.log';
    if (!fs.existsSync(logFile)) return res.type('text/plain').send('[Pas encore de log de build]');
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').slice(-100).join('\n');
    res.type('text/plain').send(lines);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/versions/download/:filename
router.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(RELEASES_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier introuvable' });
  const ext = path.extname(filename).toLowerCase();
  const types = { '.apk': 'application/vnd.android.package-archive', '.exe': 'application/octet-stream', '.dmg': 'application/x-apple-diskimage', '.deb': 'application/x-debian-package', '.AppImage': 'application/octet-stream', '.zip': 'application/zip' };
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

module.exports = router;
