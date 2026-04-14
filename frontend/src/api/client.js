import { authStore } from '../store/auth';

export const API_BASE = 'http://localhost:8000/api';

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
