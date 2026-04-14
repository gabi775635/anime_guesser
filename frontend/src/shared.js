// ============================================================
//  CONFIG & STATE
// ============================================================
const API = 'http://localhost:8000/api';
let token = localStorage.getItem('ag_token');
let currentUser = JSON.parse(localStorage.getItem('ag_user') || 'null');

// ============================================================
//  API HELPER
// ============================================================
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Erreur serveur');
  return data;
}

// ============================================================
//  AUTH
// ============================================================
function setSession(t, user) {
  token = t;
  currentUser = user;
  localStorage.setItem('ag_token', t);
  localStorage.setItem('ag_user', JSON.stringify(user));
}

function doLogout() {
  api('POST', '/logout').catch(() => {});
  token = null; currentUser = null;
  localStorage.removeItem('ag_token');
  localStorage.removeItem('ag_user');
  window.location.href = 'auth.html';
}

function requireAuth() {
  if (!token || !currentUser) {
    window.location.href = 'auth.html';
    return false;
  }
  return true;
}

// ============================================================
//  SIDEBAR HELPERS
// ============================================================
function initSidebar(activePage) {
  if (!requireAuth()) return;
  document.getElementById('sidebar-pseudo').textContent = currentUser.pseudo;
  document.getElementById('sidebar-role').textContent   = currentUser.role;
  document.getElementById('sidebar-avatar').textContent = currentUser.pseudo[0].toUpperCase();

  const role = currentUser.role;
  if (role === 'admin' || role === 'moderateur') {
    const nm = document.getElementById('nav-mod');
    if (nm) nm.style.display = 'block';
  }
  if (role === 'admin') {
    const na = document.getElementById('nav-admin');
    if (na) na.style.display = 'block';
  }

  // Active nav item
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === activePage);
  });
}

// ============================================================
//  SCORE COLORS
// ============================================================
function scoreColor(score, max = 1000) {
  const pct = score / max;
  if (pct >= 0.9) return 'var(--score-s)';
  if (pct >= 0.7) return 'var(--score-a)';
  if (pct >= 0.5) return 'var(--score-b)';
  if (pct >= 0.3) return 'var(--score-c)';
  return 'var(--score-d)';
}

function scoreRank(score, max = 1000) {
  const pct = score / max;
  if (pct >= 0.9) return 'S';
  if (pct >= 0.7) return 'A';
  if (pct >= 0.5) return 'B';
  if (pct >= 0.3) return 'C';
  return 'D';
}

function scoreClass(score, max = 1000) {
  return 'rank-' + scoreRank(score, max).toLowerCase();
}

// ============================================================
//  HELPERS
// ============================================================
function renderSparkline(containerId, values, color) {
  const el = document.getElementById(containerId);
  if (!el || !values.length) return;
  const max = Math.max(...values, 1);
  el.innerHTML = values.map(v => {
    const h = Math.max(4, Math.round(v / max * 100));
    return `<div class="spark-bar" style="height:${h}%;background:${color}" title="${v}"></div>`;
  }).join('');
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function modeBadge(mode) {
  const map = { screenshot: 'badge-screenshot', description: 'badge-description', portrait: 'badge-portrait' };
  return `<span class="badge ${map[mode] || 'badge-joueur'}">${mode}</span>`;
}
