import { createResource, createSignal, For, Show } from 'solid-js';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { formatDate } from '../utils/score';

export default function AdminUsers() {
  const [users, { refetch }] = createResource(() => api('GET', '/admin/users').then(d => d.data ?? d));
  const [search,     setSearch]     = createSignal('');
  const [roleFilter, setRoleFilter] = createSignal('');
  const [banModal,   setBanModal]   = createSignal(false);
  const [banUserId,  setBanUserId]  = createSignal(null);
  const [banReason,  setBanReason]  = createSignal('');

  const filtered = () => {
    const q = search().toLowerCase();
    const r = roleFilter();
    return (users() ?? []).filter(u =>
      (!q || u.pseudo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!r || u.role === r)
    );
  };

  async function changeRole(id, role) {
    await api('PATCH', `/admin/users/${id}/role`, { role }).catch(e => alert(e.message));
    refetch();
  }

  function openBanModal(id) { setBanUserId(id); setBanReason(''); setBanModal(true); }

  async function confirmBan() {
    if (!banReason().trim()) return alert('Raison obligatoire.');
    await api('PATCH', `/admin/users/${banUserId()}/ban`, { reason: banReason() }).catch(e => alert(e.message));
    setBanModal(false);
    refetch();
  }

  async function unbanUser(id) {
    await api('PATCH', `/admin/users/${id}/unban`).catch(e => alert(e.message));
    refetch();
  }

  async function deleteUser(id) {
    if (!confirm('Supprimer définitivement ce compte ?')) return;
    await api('DELETE', `/admin/users/${id}`).catch(e => alert(e.message));
    refetch();
  }

  const roleBadge = (r) => r === 'admin' ? 'badge-admin' : r === 'moderateur' ? 'badge-mod' : 'badge-joueur';

  return (
    <AppLayout>
      <div class="page">
        <div class="flex-between">
          <div class="page-header" style="margin-bottom:0"><div class="page-title">Utilisateurs</div></div>
          <div class="flex-gap">
            <input class="form-input" style="width:220px" placeholder="Rechercher..." value={search()} onInput={e => setSearch(e.target.value)} />
            <select class="form-input" style="width:140px" value={roleFilter()} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="moderateur">Modérateur</option>
              <option value="joueur">Joueur</option>
            </select>
          </div>
        </div>

        <div style="margin-top:24px" class="table-wrap">
          <table>
            <thead><tr><th>Pseudo</th><th>Email</th><th>Rôle</th><th>XP</th><th>Statut</th><th>Dernière co.</th><th>Actions</th></tr></thead>
            <tbody>
              <Show when={users.loading}>
                <tr><td colspan="7" style="text-align:center;padding:32px"><span class="spinner" /></td></tr>
              </Show>
              <For each={filtered()}>
                {(u) => (
                  <tr>
                    <td><strong>{u.pseudo}</strong></td>
                    <td style="color:var(--text2)">{u.email}</td>
                    <td><span class={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                    <td>{(u.xp ?? 0).toLocaleString()}</td>
                    <td>{u.is_banned ? <span class="badge badge-banned">Banni</span> : <span class="badge badge-ok">Actif</span>}</td>
                    <td style="color:var(--text3)">{u.last_login_at ? formatDate(u.last_login_at) : '—'}</td>
                    <td>
                      <div class="flex-gap">
                        <select class="form-input" style="width:120px;padding:4px 8px;font-size:12px" value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                          <option value="admin">Admin</option>
                          <option value="moderateur">Modérateur</option>
                          <option value="joueur">Joueur</option>
                        </select>
                        {u.is_banned
                          ? <button class="btn btn-ghost btn-sm" onClick={() => unbanUser(u.id)}>Débannir</button>
                          : <button class="btn btn-danger btn-sm" onClick={() => openBanModal(u.id)}>Bannir</button>}
                        <button class="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={banModal()}
        title="Bannir l'utilisateur"
        confirmLabel="Bannir"
        confirmClass="btn-danger"
        onClose={() => setBanModal(false)}
        onConfirm={confirmBan}
      >
        <div class="form-group">
          <label class="form-label">Raison du bannissement</label>
          <textarea class="form-input" rows="3" placeholder="Décris la raison..." value={banReason()} onInput={e => setBanReason(e.target.value)} />
        </div>
      </Modal>
    </AppLayout>
  );
}
