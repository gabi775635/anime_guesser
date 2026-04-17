import { createResource } from 'solid-js';
import { A } from '@solidjs/router';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';
import { authStore } from '../store/auth';

export default function Home() {
  const [stats] = createResource(() => api('GET', '/profile').catch(() => null));

  const accuracy = () => {
    const s = stats();
    if (!s || !s.rounds_count) return '0%';
    return Math.round(s.correct_count / s.rounds_count * 100) + '%';
  };

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header">
          <div class="page-title">
            Bonne chance, <span style="color:var(--accent)">{authStore.user?.pseudo ?? 'joueur'}</span> !
          </div>
          <div class="page-subtitle">Teste tes connaissances en animé</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Mes parties</div><div class="stat-value accent">{stats()?.sessions_count ?? '—'}</div></div>
          <div class="stat-card"><div class="stat-label">Mon XP</div><div class="stat-value gold">{stats() ? (stats().xp ?? 0).toLocaleString() : '—'}</div></div>
          <div class="stat-card"><div class="stat-label">Précision</div><div class="stat-value teal">{stats.loading ? '…' : accuracy()}</div></div>
          <div class="stat-card"><div class="stat-label">Meilleur score</div><div class="stat-value blue">{stats() ? (stats().best_score ?? 0).toLocaleString() : '—'}</div></div>
        </div>

        <div class="page-header"><div class="page-title" style="font-size:20px">Choisir un mode</div></div>
        <div class="modes-grid">
          <A class="mode-card" href="/game?mode=screenshot">
            <div class="mode-icon">🖼️</div>
            <div class="mode-title">Screenshot</div>
            <div class="mode-desc">Reconnais l'animé depuis une capture d'écran floutée</div>
          </A>
          <A class="mode-card" href="/game?mode=description">
            <div class="mode-icon">📖</div>
            <div class="mode-title">Description</div>
            <div class="mode-desc">Identifie l'animé grâce à son synopsis mystérieux</div>
          </A>
          <A class="mode-card" href="/game?mode=portrait">
            <div class="mode-icon">🎭</div>
            <div class="mode-title">Portrait</div>
            <div class="mode-desc">Devine l'animé d'un personnage depuis son portrait</div>
          </A>
        </div>
      </div>
    </AppLayout>
  );
}
