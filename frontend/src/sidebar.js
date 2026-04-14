// sidebar.js — inject sidebar HTML into any page
function injectSidebar() {
  const nav = document.getElementById('sidebar');
  if (!nav) return;
  nav.innerHTML = `
    <div class="sidebar-logo">Anime<span>G</span></div>
    <div class="nav-section">
      <div class="nav-label">Jouer</div>
      <a class="nav-item" data-page="home" href="home.html"><span class="nav-icon">🎮</span> Accueil</a>
      <a class="nav-item" data-page="game" href="game.html"><span class="nav-icon">⚡</span> Jouer</a>
      <a class="nav-item" data-page="leaderboard" href="leaderboard.html"><span class="nav-icon">🏆</span> Classement</a>
      <a class="nav-item" data-page="profile" href="profile.html"><span class="nav-icon">👤</span> Mon profil</a>
    </div>
    <div class="nav-section" id="nav-mod" style="display:none">
      <div class="nav-label">Modération</div>
      <a class="nav-item" data-page="mod-animes" href="mod-animes.html"><span class="nav-icon">📺</span> Animés</a>
      <a class="nav-item" data-page="mod-reports" href="mod-reports.html"><span class="nav-icon">🚨</span> Signalements</a>
    </div>
    <div class="nav-section" id="nav-admin" style="display:none">
      <div class="nav-label">Administration</div>
      <a class="nav-item" data-page="admin-users" href="admin-users.html"><span class="nav-icon">👥</span> Utilisateurs</a>
      <a class="nav-item" data-page="admin-server" href="admin-server.html"><span class="nav-icon">📊</span> Serveur</a>
      <a class="nav-item" data-page="admin-stats" href="admin-stats.html"><span class="nav-icon">📈</span> Statistiques</a>
    </div>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="avatar" id="sidebar-avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="sidebar-pseudo">—</div>
          <div class="user-role" id="sidebar-role">—</div>
        </div>
        <button class="btn-logout" onclick="doLogout()" title="Déconnexion">⏏</button>
      </div>
    </div>`;
}
