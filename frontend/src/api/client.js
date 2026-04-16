import { authStore } from '../store/auth';

// En prod : pointe vers l'IP/domaine du serveur
// En dev local : pointe vers localhost
const isProd = !window.location.hostname.includes('localhost') && 
               !window.location.hostname.includes('127.0.0.1');

export const API_BASE = isProd
  ? `${window.location.protocol}//${window.location.host}/api`
  : 'http://localhost:8080/api';

export async function api(method, path, body = null) {
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

  const r = await fetch(API_BASE + path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Erreur serveur');
  return data;
}
