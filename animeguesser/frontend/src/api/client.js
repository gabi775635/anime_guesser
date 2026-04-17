import { authStore } from '../store/auth';

// ── Détection de l'environnement ─────────────────────────────────────────────
// En mode Tauri (desktop / mobile) : on récupère l'URL via la commande Rust
// En mode web (navigateur)         : on la déduit de window.location
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function resolveApiBase() {
  if (isTauri) {
    // La commande get_api_url() est définie dans src-tauri/src/lib.rs
    // Elle renvoie ANIMEGUESSER_API_URL (var build) ou localhost:8080 par défaut
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_api_url');
  }

  // Web : prod = même domaine, dev = localhost:8080
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  return isLocal
    ? 'http://localhost:8080/api'
    : `${window.location.protocol}//${window.location.host}/api`;
}

// Résolution unique au démarrage (promise mise en cache)
let _apiBases = null;
function getApiBase() {
  if (!_apiBases) _apiBases = resolveApiBase();
  return _apiBases;
}

// ── Fonction principale ───────────────────────────────────────────────────────
export async function api(method, path, body = null) {
  const base = await getApiBase();

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const token = authStore.token;
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body)  opts.body = JSON.stringify(body);

  const r    = await fetch(base + path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Erreur serveur');
  return data;
}

// Export pratique pour les composants qui ont besoin de l'URL brute
export { getApiBase as API_BASE };
