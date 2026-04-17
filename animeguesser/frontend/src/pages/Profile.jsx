import { createResource, createSignal, For, Show } from 'solid-js';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';
import { scoreColor, scoreRank, formatDate, modeBadgeClass } from '../utils/score';

const MODES = [
  { key: 'screenshot',  label: '🖼️ Screenshot' },
  { key: 'description', label: '📖 Description' },
  { key: 'portrait',    label: '🎭 Portrait' },
];

export default function Profile() {
  const [profile]  = createResource(() => api('GET', '/profile'));
  const [history]  = createResource(() => api('GET', '/profile/history'));
  const [activeMode, setActiveMode] = createSignal('screenshot');
  const [histFilter, setHistFilter] = createSignal('');

  const modeStats = (key) => profile()?.mode_stats?.[key] ?? {};

  const globalAcc = () => {
    const p = profile();
    if (!p || !p.rounds_count) return 0;
    return Math.round(p.correct_count / p.rounds_count * 100);
  };

  const filteredHistory = () => {
    const f = histFilter();
    const h = history() ?? [];
    return f ? h.filter(s => s.mode === f) : h;
  };

  function AccBar(props) {
    const color = () => props.acc >= 70 ? 'var(--teal)' : props.acc >= 40 ? 'var(--gold)' : 'var(--accent)';
    return (
      <div class="acc-bar-wrap" style="margin-bottom:10px">
        <div class="acc-bar-label"><span>{props.label}</span><span>{props.acc}%</span></div>
        <div class="acc-bar-track">
          <div class="acc-bar-fill" style={{ width: props.acc + '%', background: color() }} />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header"><div class="page-title">Mon profil</div></div>

        <div class="profile-layout">

          {/* LEFT COLUMN */}
          <div>
            {/* Identity */}
            <div class="stat-card" style="text-align:center;padding:28px;margin-bottom:16px">
              <Show when={profile()} fallback={<span class="spinner" />}>
                <div style="width:64px;height:64px;font-size:24px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-weight:700">
                  {profile()?.pseudo?.[0]?.toUpperCase()}
                </div>
                <div style="font-family:var(--font-display);font-size:22px;font-weight:700">{profile()?.pseudo}</div>
                <div class={`badge badge-${profile()?.role === 'admin' ? 'admin' : profile()?.role === 'moderateur' ? 'mod' : 'joueur'}`} style="margin-top:8px">
                  {profile()?.role}
                </div>
              </Show>
            </div>

            {/* Global stats */}
            <div class="stat-card" style="margin-bottom:16px">
              <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Statistiques globales</div>
              <div class="metric-row"><span class="metric-name">XP total</span><span class="metric-val" style="color:var(--gold)">{(profile()?.xp ?? 0).toLocaleString()}</span></div>
              <div class="metric-row"><span class="metric-name">Parties jouées</span><span class="metric-val">{profile()?.sessions_count ?? 0}</span></div>
              <div class="metric-row"><span class="metric-name">Bonnes réponses</span><span class="metric-val" style="color:var(--teal)">{profile()?.correct_count ?? 0}</span></div>
              <div class="metric-row"><span class="metric-name">Précision globale</span><span class="metric-val">{globalAcc()}%</span></div>
              <div class="metric-row"><span class="metric-name">Meilleur score</span><span class="metric-val" style="color:var(--blue)">{(profile()?.best_score ?? 0).toLocaleString()}</span></div>
              <div class="metric-row"><span class="metric-name">Membre depuis</span><span class="metric-val">{formatDate(profile()?.created_at)}</span></div>
            </div>

            {/* Accuracy per mode */}
            <div class="stat-card">
              <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Précision par mode</div>
              <For each={MODES}>
                {(m) => <AccBar label={m.label} acc={modeStats(m.key)?.accuracy ?? 0} />}
              </For>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Per-mode stats */}
            <div class="stat-card" style="margin-bottom:20px">
              <div style="font-family:var(--font-display);font-size:16px;font-weight:700">Stats par mode</div>
              <div class="mode-tabs">
                <For each={MODES}>
                  {(m) => (
                    <button class={`mode-tab ${activeMode() === m.key ? 'active' : ''}`} onClick={() => setActiveMode(m.key)}>
                      {m.label}
                    </button>
                  )}
                </For>
              </div>

              {/* Mode stats panel */}
              {(() => {
                const m  = modeStats(activeMode());
                const best = m.best_score ?? 0;
                const acc  = m.accuracy ?? 0;
                const col  = scoreColor(best, 1000);
                const rank = scoreRank(best, 1000);
                const barColor = acc >= 70 ? 'var(--teal)' : acc >= 40 ? 'var(--gold)' : 'var(--accent)';
                return (
                  <div>
                    <div class="mode-stat-grid">
                      <div class="mode-stat-item">
                        <div class="mode-stat-label">Parties</div>
                        <div class="mode-stat-val" style="color:var(--accent)">{m.sessions_count ?? 0}</div>
                      </div>
                      <div class="mode-stat-item">
                        <div class="mode-stat-label">Meilleur score</div>
                        <div class="mode-stat-val" style={{ color: col }}>{best.toLocaleString()} <span style="font-size:16px">({rank})</span></div>
                      </div>
                      <div class="mode-stat-item">
                        <div class="mode-stat-label">Rounds joués</div>
                        <div class="mode-stat-val" style="color:var(--teal)">{m.rounds_played ?? 0}</div>
                      </div>
                      <div class="mode-stat-item">
                        <div class="mode-stat-label">Précision</div>
                        <div class="mode-stat-val" style="color:var(--gold)">{acc}%</div>
                      </div>
                    </div>
                    <div class="acc-bar-wrap">
                      <div class="acc-bar-label"><span>Précision</span><span>{acc}%</span></div>
                      <div class="acc-bar-track">
                        <div class="acc-bar-fill" style={{ width: acc + '%', background: barColor }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* History */}
            <div class="flex-between">
              <div style="font-family:var(--font-display);font-size:16px;font-weight:700">Historique des parties</div>
              <select class="form-input" style="width:150px;padding:6px 10px;font-size:13px" value={histFilter()} onChange={e => setHistFilter(e.target.value)}>
                <option value="">Tous les modes</option>
                <option value="screenshot">Screenshot</option>
                <option value="description">Description</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div class="table-wrap" style="margin-top:12px">
              <table>
                <thead>
                  <tr><th>Date</th><th>Mode</th><th>Score /1000</th><th>Rang</th><th>Rounds</th><th>Précision</th></tr>
                </thead>
                <tbody>
                  <Show when={history.loading}>
                    <tr><td colspan="6" style="text-align:center;padding:24px"><span class="spinner" /></td></tr>
                  </Show>
                  <Show when={filteredHistory().length === 0 && !history.loading}>
                    <tr><td colspan="6" style="color:var(--text3);text-align:center;padding:24px">Aucune partie</td></tr>
                  </Show>
                  <For each={filteredHistory()}>
                    {(s) => {
                      const acc   = s.rounds_played ? Math.round(s.rounds_correct / s.rounds_played * 100) : 0;
                      const score = s.score_total ?? 0;
                      const col   = scoreColor(score, 1000);
                      const rank  = scoreRank(score, 1000);
                      return (
                        <tr>
                          <td>{formatDate(s.started_at)}</td>
                          <td><span class={`badge ${modeBadgeClass(s.mode)}`}>{s.mode}</span></td>
                          <td><span style={{ color: col, 'font-weight': 700 }}>{score.toLocaleString()}</span></td>
                          <td><span style={{ color: col, 'font-family': 'var(--font-display)', 'font-weight': 800, 'font-size': '16px' }}>{rank}</span></td>
                          <td>{s.rounds_played}</td>
                          <td>{acc}%</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
