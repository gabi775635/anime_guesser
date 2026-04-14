export function scoreColor(score, max = 1000) {
  const pct = score / max;
  if (pct >= 0.9) return 'var(--score-s)';
  if (pct >= 0.7) return 'var(--score-a)';
  if (pct >= 0.5) return 'var(--score-b)';
  if (pct >= 0.3) return 'var(--score-c)';
  return 'var(--score-d)';
}

export function scoreRank(score, max = 1000) {
  const pct = score / max;
  if (pct >= 0.9) return 'S';
  if (pct >= 0.7) return 'A';
  if (pct >= 0.5) return 'B';
  if (pct >= 0.3) return 'C';
  return 'D';
}

export function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function modeBadgeClass(mode) {
  const map = { screenshot: 'badge-screenshot', description: 'badge-description', portrait: 'badge-portrait' };
  return map[mode] || 'badge-joueur';
}
