import { createResource, createSignal, For, Show } from 'solid-js';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { api } from '../api/client';

const EMPTY_ANIME = { id: '', title: '', synopsis: '', year: '', genre: '', studio: '', difficulty: 'moyen', image_url: '' };

export default function ModAnimes() {
  const [animes, { refetch }] = createResource(() => api('GET', '/animes').then(d => d.data ?? d));
  const [modal,   setModal]   = createSignal(false);
  const [form,    setForm]    = createSignal({ ...EMPTY_ANIME });

  function openModal(anime = null) {
    setForm(anime ? { ...anime } : { ...EMPTY_ANIME });
    setModal(true);
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function saveAnime() {
    const { id, ...body } = form();
    try {
      if (id) await api('PUT', `/animes/${id}`, body);
      else    await api('POST', '/animes', body);
      setModal(false);
      refetch();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function deleteAnime(id) {
    if (!confirm('Supprimer cet animé ?')) return;
    await api('DELETE', `/animes/${id}`).catch(e => alert(e.message));
    refetch();
  }

  const diffBadge = (d) => d === 'facile' ? 'badge-ok' : d === 'moyen' ? 'badge-warn' : 'badge-admin';

  return (
    <AppLayout>
      <div class="page">
        <div class="flex-between">
          <div class="page-header" style="margin-bottom:0">
            <div class="page-title">Gestion des animés</div>
          </div>
          <button class="btn btn-primary" onClick={() => openModal()}>+ Ajouter</button>
        </div>

        <div style="margin-top:24px" class="table-wrap">
          <table>
            <thead><tr><th>Titre</th><th>Année</th><th>Genre</th><th>Difficulté</th><th>Actions</th></tr></thead>
            <tbody>
              <Show when={animes.loading}>
                <tr><td colspan="5" style="text-align:center;padding:32px"><span class="spinner" /></td></tr>
              </Show>
              <For each={animes()}>
                {(a) => (
                  <tr>
                    <td><strong>{a.title}</strong></td>
                    <td>{a.year ?? '—'}</td>
                    <td>{a.genre ?? '—'}</td>
                    <td><span class={`badge ${diffBadge(a.difficulty)}`}>{a.difficulty}</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onClick={() => openModal(a)}>Éditer</button>
                      {' '}
                      <button class="btn btn-danger btn-sm" onClick={() => deleteAnime(a.id)}>Suppr.</button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal()}
        title={form().id ? "Modifier l'animé" : 'Ajouter un animé'}
        confirmLabel="Enregistrer"
        onClose={() => setModal(false)}
        onConfirm={saveAnime}
      >
        <div class="form-group"><label class="form-label">Titre</label><input class="form-input" value={form().title} onInput={e => setField('title', e.target.value)} /></div>
        <div class="form-group"><label class="form-label">Synopsis</label><textarea class="form-input" rows="3" onInput={e => setField('synopsis', e.target.value)}>{form().synopsis}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Année</label><input class="form-input" type="number" value={form().year} onInput={e => setField('year', e.target.value)} /></div>
          <div class="form-group"><label class="form-label">Genre</label><input class="form-input" value={form().genre} onInput={e => setField('genre', e.target.value)} /></div>
          <div class="form-group"><label class="form-label">Studio</label><input class="form-input" value={form().studio} onInput={e => setField('studio', e.target.value)} /></div>
          <div class="form-group">
            <label class="form-label">Difficulté</label>
            <select class="form-input" value={form().difficulty} onChange={e => setField('difficulty', e.target.value)}>
              <option value="facile">Facile</option>
              <option value="moyen">Moyen</option>
              <option value="difficile">Difficile</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">URL image</label><input class="form-input" type="url" value={form().image_url} onInput={e => setField('image_url', e.target.value)} /></div>
      </Modal>
    </AppLayout>
  );
}
