// routes/versions.js — Version server : liste et téléchargement des releases
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

const RELEASES_DIR  = process.env.RELEASES_DIR || '/releases';
const VERSIONS_DB   = process.env.VERSIONS_DB  || '/releases/versions.json';

// ── Helpers ────────────────────────────────────────────────────────────────────
function loadVersionsDb() {
  if (fs.existsSync(VERSIONS_DB)) {
    return JSON.parse(fs.readFileSync(VERSIONS_DB, 'utf8'));
  }
  return { versions: [] };
}

// ── GET /api/versions — liste toutes les versions ──────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const db = loadVersionsDb();
    res.json(db);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/versions/latest — dernière version par plateforme ─────────────────
router.get('/latest', requireAuth, (req, res) => {
  try {
    const { versions } = loadVersionsDb();
    if (!versions.length) return res.json({ latest: null });

    // Trie par version sémantique descendante
    const sorted = [...versions].sort((a, b) => {
      const pa = a.version.split('.').map(Number);
      const pb = b.version.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
      }
      return 0;
    });

    const latest = sorted[0];
    res.json({ latest, all: sorted.slice(0, 5) }); // top 5 pour l'affichage
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/versions/:version/files — fichiers d'une version ─────────────────
router.get('/:version/files', requireAuth, (req, res) => {
  try {
    const { versions } = loadVersionsDb();
    const entry = versions.find(v => v.version === req.params.version);
    if (!entry) return res.status(404).json({ error: 'Version introuvable' });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/versions/download/:filename — télécharger un fichier release ──────
// Pas de requireAuth ici : on veut pouvoir partager le lien de téléchargement
// On vérifie quand même que le fichier appartient au dossier releases (pas de path traversal)
router.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // sécurité : retire les ../ etc.
  const filepath = path.join(RELEASES_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Fichier introuvable' });
  }

  // Content-type selon l'extension
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.apk':  'application/vnd.android.package-archive',
    '.exe':  'application/octet-stream',
    '.dmg':  'application/x-apple-diskimage',
    '.deb':  'application/x-debian-package',
    '.rpm':  'application/x-rpm',
    '.AppImage': 'application/octet-stream',
    '.zip':  'application/zip',
  };

  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

module.exports = router;
