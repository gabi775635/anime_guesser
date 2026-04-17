import { For } from 'solid-js';

export default function Sparkline(props) {
  const max = () => Math.max(...(props.values ?? [1]), 1);

  return (
    <div class="sparkline" style={{ height: props.height ?? '60px' }}>
      <For each={props.values ?? []}>
        {(v) => (
          <div
            class="spark-bar"
            style={{
              height: `${Math.max(4, Math.round(v / max() * 100))}%`,
              background: props.color ?? 'var(--accent)',
            }}
            title={String(v)}
          />
        )}
      </For>
    </div>
  );
}
