import { createStore } from 'solid-js/store';

const stored_token = localStorage.getItem('ag_token');
const stored_user  = JSON.parse(localStorage.getItem('ag_user') || 'null');

const [authStore, setAuthStore] = createStore({
  token: stored_token,
  user:  stored_user,
});

export { authStore };

export function setSession(token, user) {
  localStorage.setItem('ag_token', token);
  localStorage.setItem('ag_user', JSON.stringify(user));
  setAuthStore({ token, user });
}

export function clearSession() {
  localStorage.removeItem('ag_token');
  localStorage.removeItem('ag_user');
  setAuthStore({ token: null, user: null });
}

export function isLoggedIn() {
  return !!authStore.token && !!authStore.user;
}
