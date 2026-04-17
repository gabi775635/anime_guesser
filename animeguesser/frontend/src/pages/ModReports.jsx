import { createResource, For, Show } from 'solid-js';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';
import { formatDate } from '../utils/score';

export default function ModReports() {
  const [reports, { refetch }] = createResource(() =>
    api('GET', '/reports').then(d => d.data ?? d)
  );

  async function resolveReport(id) {
    await api('PATCH', `/reports/${id}`, { status: 'resolved' }).catch(e => alert(e.message));
    refetch();
  }

  const statusBadge = (s) => s === 'pending' ? 'badge-warn' : s === 'resolved' ? 'badge-ok' : 'badge-banned';

  return (
    <AppLayout>
      <div class="page">
        <div class="page-header">
          <div class="page-title">Signalements</div>
          <div class="page-subtitle">Signalements en attente de traitement</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Signalé par</th><th>Cible</th><th>Raison</th><th>Statut</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              <Show when={reports.loading}>
                <tr><td colspan="6" style="text-align:center;padding:32px"><span class="spinner" /></td></tr>
              </Show>
              <For each={reports()}>
                {(r) => (
                  <tr>
                    <td>{r.reporter?.pseudo ?? '—'}</td>
                    <td>{r.target?.pseudo ?? '—'}</td>
                    <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{r.reason}</td>
                    <td><span class={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <Show when={r.status === 'pending'}>
                        <button class="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id)}>Résoudre</button>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
