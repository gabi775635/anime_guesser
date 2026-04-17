import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { authStore, clearSession } from '../store/auth';
import { api } from '../api/client';
import { useNavigate } from '@solidjs/router';

export default function Sidebar(props) {
  const navigate = useNavigate();

  async function doLogout() {
    await api('POST', '/logout').catch(() => {});
    clearSession();
    navigate('/auth', { replace: true });
  }

  const user = () => authStore.user;
  const isAdmin = () => user()?.role === 'admin';
  const isMod   = () => user()?.role === 'admin' || user()?.role === 'moderateur';

  return (
    <nav class="sidebar">
      <div class="sidebar-logo">Anime<span>G</span></div>

      <div class="nav-section">
        <div class="nav-label">Jouer</div>
        <A class="nav-item" href="/home"        activeClass="active" end><span class="nav-icon">🎮</span> Accueil</A>
        <A class="nav-item" href="/game"        activeClass="active"><span class="nav-icon">⚡</span> Jouer</A>
        <A class="nav-item" href="/leaderboard" activeClass="active"><span class="nav-icon">🏆</span> Classement</A>
        <A class="nav-item" href="/profile"     activeClass="active"><span class="nav-icon">👤</span> Mon profil</A>
      </div>

      <Show when={isMod()}>
        <div class="nav-section">
          <div class="nav-label">Modération</div>
          <A class="nav-item" href="/mod/animes"   activeClass="active"><span class="nav-icon">📺</span> Animés</A>
          <A class="nav-item" href="/mod/reports"  activeClass="active"><span class="nav-icon">🚨</span> Signalements</A>
        </div>
      </Show>

      <Show when={isAdmin()}>
        <div class="nav-section">
          <div class="nav-label">Administration</div>
          <A class="nav-item" href="/admin/users"  activeClass="active"><span class="nav-icon">👥</span> Utilisateurs</A>
          <A class="nav-item" href="/admin/server" activeClass="active"><span class="nav-icon">📊</span> Serveur</A>
          <A class="nav-item" href="/admin/stats"  activeClass="active"><span class="nav-icon">📈</span> Statistiques</A>
        </div>
      </Show>

      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="avatar">{user()?.pseudo?.[0]?.toUpperCase() ?? '?'}</div>
          <div class="user-info">
            <div class="user-name">{user()?.pseudo ?? '—'}</div>
            <div class="user-role">{user()?.role ?? '—'}</div>
          </div>
          <button class="btn-logout" onClick={doLogout} title="Déconnexion">⏏</button>
        </div>
      </div>
    </nav>
  );
}
