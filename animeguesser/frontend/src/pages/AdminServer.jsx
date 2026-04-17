import { createSignal, onMount, onCleanup } from 'solid-js';
import AppLayout from '../components/AppLayout';
import Sparkline from '../components/Sparkline';
import { api } from '../api/client';

export default function AdminServer() {
  const [live, setLive] = createSignal(null);
  const [hist, setHist] = createSignal([]);

  async function load() {
    try {
      const [l, h] = await Promise.all([
        api('GET', '/metrics/live'),
        api('GET', '/metrics/server?hours=24'),
      ]);
      setLive(l);
      setHist(h);
    } catch (e) { console.error(e); }
  }

  onMount(() => {
    load();
    const iv = setInterval(load, 15000);
    onCleanup(() => clearInterval(iv));
  });

  const cpuLoad = () => live()?.cpu?.load_1?.toFixed(2) ?? '—';
  const ramPct  = () => {
    const r = live()?.ram;
    if (!r || !r.total_mb) return 0;
    return Math.round(r.used_mb / r.total_mb * 100);
  };
  const diskPct = () => {
    const d = live()?.disk;
    if (!d || !d.total_gb) return 0;
    return Math.round(d.used_gb / d.total_gb * 100);
  };

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header">
          <div class="page-title">Métriques serveur</div>
          <div class="page-subtitle">Données en temps réel — actualisation toutes les 15 secondes</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">CPU Load (1m)</div>
            <div class="stat-value teal">{cpuLoad()}</div>
            <div class="stat-delta">5m: {live()?.cpu?.load_5?.toFixed(2) ?? '—'} / 15m: {live()?.cpu?.load_15?.toFixed(2) ?? '—'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">RAM utilisée</div>
            <div class="stat-value blue">{ramPct()}%</div>
            <div class="stat-delta">{live()?.ram?.used_mb ?? '—'} MB / {live()?.ram?.total_mb ?? '—'} MB</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Disque</div>
            <div class="stat-value gold">{diskPct()}%</div>
            <div class="stat-delta">{live()?.disk?.used_gb ?? '—'} GB / {live()?.disk?.total_gb ?? '—'} GB</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Sessions actives</div>
            <div class="stat-value accent">{live()?.players?.active_now ?? '—'}</div>
            <div class="stat-delta">parties en cours</div>
          </div>
        </div>

        <div class="chart-grid">
          <div class="chart-card">
            <div class="chart-title">CPU — 24h</div>
            <Sparkline values={hist().map(m => m.cpu_load_1)} color="var(--teal)" />
          </div>
          <div class="chart-card">
            <div class="chart-title">RAM — 24h</div>
            <Sparkline values={hist().map(m => m.ram_total_mb > 0 ? Math.round(m.ram_used_mb / m.ram_total_mb * 100) : 0)} color="var(--blue)" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="chart-card">
            <div class="chart-title">Ressources live</div>
            <div class="metric-row">
              <span class="metric-name">CPU</span>
              <div class="progress-mini"><div class="progress-mini-fill" style={{ width: Math.min(Number(cpuLoad()) * 25, 100) + '%', background: 'var(--teal)' }} /></div>
              <span class="metric-val">{cpuLoad()}</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">RAM</span>
              <div class="progress-mini"><div class="progress-mini-fill" style={{ width: ramPct() + '%', background: 'var(--blue)' }} /></div>
              <span class="metric-val">{ramPct()}%</span>
            </div>
            <div class="metric-row">
              <span class="metric-name">Disque</span>
              <div class="progress-mini"><div class="progress-mini-fill" style={{ width: diskPct() + '%', background: 'var(--gold)' }} /></div>
              <span class="metric-val">{diskPct()}%</span>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Joueurs aujourd'hui</div>
            <div class="metric-row"><span class="metric-name">Sessions actives</span><span class="metric-val" style="color:var(--accent)">{live()?.players?.active_now ?? '—'}</span></div>
            <div class="metric-row"><span class="metric-name">Utilisateurs total</span><span class="metric-val">{live()?.players?.total_users ?? '—'}</span></div>
            <div class="metric-row"><span class="metric-name">Parties aujourd'hui</span><span class="metric-val" style="color:var(--teal)">{live()?.players?.today_games ?? '—'}</span></div>
            <div class="metric-row"><span class="metric-name">Nouvelles inscriptions</span><span class="metric-val" style="color:var(--gold)">{live()?.players?.today_new ?? '—'}</span></div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
