// dashboard/backend/server.js — Point d'entrée du backend dashboard
// Aucune logique métier ici : tout est délégué aux routes/
require('dotenv').config();

const express   = require('express');
const expressWs = require('express-ws');
const path      = require('path');

const app = express();
expressWs(app);

const PORT = process.env.DASHBOARD_PORT || 9000;

// ── Middleware globaux ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// CORS (dashboard sur port différent en dev)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const { requireAuth } = require('./middleware/auth');
const ws              = require('./services/ws');

app.ws('/ws', (socket, req) => {
  const token = req.query.token;
  // Réutilise requireAuth en mode manuel pour le WS
  const { sessions } = (() => {
    try { return require('./middleware/auth'); } catch { return { sessions: new Map() }; }
  })();
  ws.register(socket);
});

// ── Routes API ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/cron',       require('./routes/cron'));
app.use('/api/traffic',    require('./routes/traffic'));
app.use('/api/backups',    require('./routes/backups'));
app.use('/api/versions',   require('./routes/versions'));
app.use('/api/server',     require('./routes/server'));
app.use('/api/config.js',  require('./routes/config'));

// ── Push stats WebSocket toutes les 3s ────────────────────────────────────────
const { getAllContainers, getContainerStats, parseCpu, parseMem } = require('./services/docker');
const { broadcast, size } = require('./services/ws');

setInterval(async () => {
  if (size() === 0) return;
  try {
    const containers = await getAllContainers();
    const stats = await Promise.all(
      containers.filter(c => c.State === 'running').map(async (c) => {
        const s   = await getContainerStats(c.Id);
        const mem = parseMem(s);
        return { id: c.Id.slice(0, 12), cpu: parseCpu(s), memMB: mem.used, memPct: mem.pct, status: c.State };
      })
    );
    broadcast({ type: 'stats_update', stats });
  } catch {}
}, 3000);

// ── SPA fallback pour les pages frontend ─────────────────────────────────────
// Chaque page est un fichier HTML statique → pas de fallback SPA nécessaire
// On sert juste 404 proprement
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/404.html'));
});

app.listen(PORT, () => console.log(`[dashboard-backend] Démarré sur http://localhost:${PORT}`));
