import { Show } from 'solid-js';
import { Navigate } from '@solidjs/router';
import { isLoggedIn, authStore } from '../store/auth';

export function ProtectedRoute(props) {
  return (
    <Show when={isLoggedIn()} fallback={<Navigate href="/auth" />}>
      {props.children}
    </Show>
  );
}

export function AdminRoute(props) {
  return (
    <Show when={isLoggedIn() && authStore.user?.role === 'admin'} fallback={<Navigate href="/home" />}>
      {props.children}
    </Show>
  );
}

export function ModRoute(props) {
  const allowed = () => isLoggedIn() && ['admin', 'moderateur'].includes(authStore.user?.role);
  return (
    <Show when={allowed()} fallback={<Navigate href="/home" />}>
      {props.children}
    </Show>
  );
}
