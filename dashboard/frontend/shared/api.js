// shared/api.js — Client API centralisé
const API_BASE = window.DASHBOARD_API_BASE || '';

function getToken() { return localStorage.getItem('dashboard_token'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'x-dashboard-token': getToken() || '' };
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
  get: (path) => apiFetch(path),

  // Auth
  login:   (u, p) => apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ username:u, password:p }) }),
  logout:  ()     => apiFetch('/api/auth/logout', { method:'POST' }),

  // Conteneurs
  containers:       () => apiFetch('/api/containers'),
  containerSummary: () => apiFetch('/api/containers/summary'),
  containerDetail:  (id) => apiFetch(`/api/containers/${id}/detail`),
  containerLogs:    (id, tail=150) => apiFetch(`/api/containers/${id}/logs?tail=${tail}`),
  containerStart:   (id) => apiFetch(`/api/containers/${id}/start`,   { method:'POST' }),
  containerStop:    (id) => apiFetch(`/api/containers/${id}/stop`,    { method:'POST' }),
  containerRestart: (id) => apiFetch(`/api/containers/${id}/restart`, { method:'POST' }),
  containerDelete:  (id) => apiFetch(`/api/containers/${id}`,         { method:'DELETE' }),
  containerSpawn:   (body) => apiFetch('/api/containers/spawn', { method:'POST', body: JSON.stringify(body) }),
  containerImages:  () => apiFetch('/api/containers/images'),

  // Cron
  cronAll:  () => apiFetch('/api/cron'),
  cronById: (id) => apiFetch(`/api/cron/${id}`),

  // Trafic
  traffic: () => apiFetch('/api/traffic'),

  // Backups
  backups:    () => apiFetch('/api/backups'),
  backupNow:  () => apiFetch('/api/backups/now', { method:'POST' }),

  // Versions
  versions:       () => apiFetch('/api/versions'),
  versionsLatest: () => apiFetch('/api/versions/latest'),
  downloadUrl:    (filename) => `${API_BASE}/api/versions/download/${encodeURIComponent(filename)}`,

  // Serveur
  serverPerf: () => apiFetch('/api/server/perf'),
};

window.api = api;

// WebSocket
function connectWs(onMessage) {
  const token    = getToken();
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws       = new WebSocket(`${protocol}://${location.host}/ws?token=${token}`);
  ws.addEventListener('message', e => { try { onMessage(JSON.parse(e.data)); } catch {} });
  ws.addEventListener('close',   () => setTimeout(() => connectWs(onMessage), 3000));
  const dot = document.getElementById('ws-status');
  if (dot) { ws.addEventListener('open', () => { dot.style.color='var(--ok)'; }); }
  return ws;
}
window.connectWs = connectWs;
