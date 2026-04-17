// dashboard/backend/server.js — Point d'entrée du backend dashboard
// Aucune logique métier ici : tout est délégué aux routes/
require('dotenv').config();

const express   = require('express');
const expressWs = require('express-ws');
const path      = require('path');

const app = express();
expressWs(app);

const PORT = process.env.DASHBOARD_PORT || 9000;

// Dans le conteneur Docker :
//   __dirname       = /app          (backend copié à la racine par le Dockerfile)
//   frontend files  = /app/frontend (COPY frontend/ ./frontend/)
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// ── Middleware globaux ─────────────────────────────────────────────────────────
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Fichiers statiques frontend
app.use(express.static(FRONTEND_DIR));

// Redirect / → /pages/login.html
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const ws = require('./services/ws');
app.ws('/ws', (socket) => { ws.register(socket); });

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

// ── Fallback 404 ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  const p404 = path.join(FRONTEND_DIR, 'pages', '404.html');
  res.status(404).sendFile(p404, (err) => {
    if (err) res.status(404).send('404 - Page introuvable');
  });
});

app.listen(PORT, () => console.log(`[dashboard] Démarré sur http://localhost:${PORT}`));
