import { createResource, For, Show } from 'solid-js';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';

export default function Leaderboard() {
  const [data] = createResource(() => api('GET', '/leaderboard'));

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header">
          <div class="page-title">Classement</div>
          <div class="page-subtitle">Les meilleurs joueurs de la plateforme</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Joueur</th><th>XP total</th><th>Parties</th><th>Précision</th></tr>
            </thead>
            <tbody>
              <Show when={data.loading}>
                <tr><td colspan="5" style="text-align:center;padding:32px"><span class="spinner" /></td></tr>
              </Show>
              <Show when={data.error}>
                <tr><td colspan="5" style="color:var(--accent);text-align:center;padding:24px">{data.error?.message}</td></tr>
              </Show>
              <Show when={data()}>
                <For each={data()}>
                  {(u, i) => (
                    <tr class={`rank-${i() + 1}`}>
                      <td>{medals[i()] ?? i() + 1}</td>
                      <td><strong>{u.pseudo}</strong></td>
                      <td>{(u.xp ?? 0).toLocaleString()}</td>
                      <td>{u.sessions_count ?? 0}</td>
                      <td>{u.accuracy ?? '—'}%</td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
