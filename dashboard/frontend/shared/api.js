// shared/api.js — Client API centralisé pour toutes les pages dashboard
const API_BASE = window.DASHBOARD_API_BASE || '';

function getToken() {
  return localStorage.getItem('dashboard_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-dashboard-token': getToken() || '',
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    localStorage.removeItem('dashboard_token');
    window.location.href = '/pages/login.html';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

const api = {
  // Auth
  login:   (username, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout:  () => apiFetch('/api/auth/logout', { method: 'POST' }),

  // Conteneurs
  containers:        () => apiFetch('/api/containers'),
  containerSummary:  () => apiFetch('/api/containers/summary'),
  containerDetail:   (id) => apiFetch(`/api/containers/${id}/detail`),
  containerLogs:     (id, tail = 150) => apiFetch(`/api/containers/${id}/logs?tail=${tail}`),
  containerStart:    (id) => apiFetch(`/api/containers/${id}/start`,   { method: 'POST' }),
  containerStop:     (id) => apiFetch(`/api/containers/${id}/stop`,    { method: 'POST' }),
  containerRestart:  (id) => apiFetch(`/api/containers/${id}/restart`, { method: 'POST' }),
  containerDelete:   (id) => apiFetch(`/api/containers/${id}`,         { method: 'DELETE' }),
  containerSpawn:    (service) => apiFetch('/api/containers/spawn',    { method: 'POST', body: JSON.stringify({ service }) }),

  // Cron
  cronAll:  () => apiFetch('/api/cron'),
  cronById: (id) => apiFetch(`/api/cron/${id}`),

  // Trafic
  traffic: () => apiFetch('/api/traffic'),

  // Backups
  backups:    () => apiFetch('/api/backups'),
  backupNow:  () => apiFetch('/api/backups/now', { method: 'POST' }),

  // Versions
  versions:       () => apiFetch('/api/versions'),
  versionsLatest: () => apiFetch('/api/versions/latest'),
  versionFiles:   (v) => apiFetch(`/api/versions/${v}/files`),
  downloadUrl:    (filename) => `${API_BASE}/api/versions/download/${filename}`,

  // Serveur
  serverPerf: () => apiFetch('/api/server/perf'),
};

window.api = api;

// ── WebSocket helper ──────────────────────────────────────────────────────────
function connectWs(onMessage) {
  const token    = getToken();
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws       = new WebSocket(`${protocol}://${location.host}/ws?token=${token}`);
  ws.addEventListener('message', e => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  });
  ws.addEventListener('close', () => setTimeout(() => connectWs(onMessage), 3000));
  return ws;
}
window.connectWs = connectWs;

// ── Guard auth ────────────────────────────────────────────────────────────────
function requireLogin() {
  if (!getToken() && !location.pathname.endsWith('login.html')) {
    location.href = '/pages/login.html';
  }
}
window.requireLogin = requireLogin;

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtBytes(mb) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb + ' MB';
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR');
}
function statusBadge(status) {
  const map = { running: 'badge-ok', exited: 'badge-err', paused: 'badge-warn', created: 'badge-info' };
  return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
}

window.fmtBytes  = fmtBytes;
window.fmtDate   = fmtDate;
window.statusBadge = statusBadge;
