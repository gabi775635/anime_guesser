import { createResource } from 'solid-js';
import AppLayout from '../components/AppLayout';
import Sparkline from '../components/Sparkline';
import { api } from '../api/client';
import { formatDuration } from '../utils/score';

export default function AdminStats() {
  const [data] = createResource(() => api('GET', '/metrics/players?days=30'));

  const total = (key) => (data() ?? []).reduce((s, d) => s + (d[key] ?? 0), 0);

  const avgScore = () => {
    const d = data();
    if (!d?.length) return 0;
    return Math.round(d.reduce((s, x) => s + (x.avg_score ?? 0), 0) / d.length);
  };

  const avgDuration = () => {
    const d = data();
    if (!d?.length) return 0;
    return Math.round(d.reduce((s, x) => s + (x.avg_session_duration_s ?? 0), 0) / d.length);
  };

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header">
          <div class="page-title">Statistiques globales</div>
          <div class="page-subtitle">Activité joueurs sur les 30 derniers jours</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Inscriptions (30j)</div>
            <div class="stat-value accent">{data.loading ? '…' : total('new_registrations')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Parties jouées (30j)</div>
            <div class="stat-value teal">{data.loading ? '…' : total('games_played').toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Score moyen</div>
            <div class="stat-value gold">{data.loading ? '…' : avgScore().toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Durée moy. session</div>
            <div class="stat-value blue">{data.loading ? '…' : formatDuration(avgDuration())}</div>
          </div>
        </div>

        <div class="chart-card section-gap">
          <div class="chart-title">Parties jouées par jour</div>
          <Sparkline values={(data() ?? []).map(d => d.games_played)} color="var(--teal)" height="80px" />
        </div>

        <div class="chart-card">
          <div class="chart-title">Inscriptions par jour</div>
          <Sparkline values={(data() ?? []).map(d => d.new_registrations)} color="var(--accent)" height="80px" />
        </div>
      </div>
    </AppLayout>
  );
}
