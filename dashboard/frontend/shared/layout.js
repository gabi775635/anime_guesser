// shared/layout.js — Layout + navigation injectés dans chaque page
// Chargé AVANT le script de page via <script src="/shared/layout.js"></script>

function requireLogin() {
  if (!localStorage.getItem('dashboard_token') && !location.pathname.endsWith('login.html')) {
    location.href = '/pages/login.html';
  }
}

function injectLayout(pageTitle, activeNav) {
  requireLogin();

  const navItems = [
    { id: 'home',       href: '/pages/index.html',           icon: '🏠', label: 'Accueil' },
    { id: 'containers', href: '/pages/containers.html',      icon: '📦', label: 'Conteneurs' },
    { id: 'traffic',    href: '/pages/traffic.html',         icon: '📊', label: 'Trafic' },
    { id: 'cron',       href: '/pages/cron.html',            icon: '⏰', label: 'Cron' },
    { id: 'backups',    href: '/pages/backups.html',         icon: '💾', label: 'Backups' },
    { id: 'perf',       href: '/pages/perf.html',            icon: '🔥', label: 'Performance' },
    { id: 'versions',   href: '/pages/versions.html',        icon: '🚀', label: 'Versions' },
    { id: 'legal',      href: '/pages/legal.html',           icon: '📋', label: 'Mentions légales' },
    { id: 'contact',    href: '/pages/contact.html',         icon: '✉️', label: 'Contact' },
    { id: 'support',    href: '/pages/support.html',         icon: '🛟', label: 'Support' },
  ];

  const sections = [
    { label: 'Vue globale',  items: ['home', 'containers', 'traffic'] },
    { label: 'Système',      items: ['cron', 'backups', 'perf'] },
    { label: 'Releases',     items: ['versions'] },
    { label: 'Info',         items: ['legal', 'contact', 'support'] },
  ];

  const navHtml = sections.map(s => `
    <span class="nav-section">${s.label}</span>
    ${s.items.map(id => {
      const item = navItems.find(n => n.id === id);
      const active = activeNav === id ? 'active' : '';
      return `<a href="${item.href}" class="nav-item ${active}">
        <span class="icon">${item.icon}</span><span>${item.label}</span>
      </a>`;
    }).join('')}
  `).join('');

  document.body.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">
          ⚡ AnimeGuesser
          <span>Dashboard Admin</span>
        </div>
        ${navHtml}
        <div class="sidebar-bottom">
          <button class="btn btn-ghost btn-sm w-full" onclick="doLogout()">🚪 Déconnexion</button>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <span class="topbar-title">${pageTitle}</span>
          <div class="topbar-right">
            <span style="color:var(--ok);font-size:18px" id="ws-status" title="Temps réel">●</span>
            <span class="text-muted" style="font-size:12px" id="topbar-time"></span>
          </div>
        </div>
        <div class="content" id="page-content"></div>
      </div>
    </div>`;

  // Horloge
  const tick = () => {
    const el = document.getElementById('topbar-time');
    if (el) el.textContent = new Date().toLocaleTimeString('fr-FR');
  };
  tick();
  setInterval(tick, 1000);
}

async function doLogout() {
  try { await api.logout(); } catch {}
  localStorage.removeItem('dashboard_token');
  location.href = '/pages/login.html';
}

// Formatters globaux
function fmtBytes(mb) {
  if (!mb) return '0 MB';
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
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
