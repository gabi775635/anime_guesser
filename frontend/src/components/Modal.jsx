import { Show } from 'solid-js';

export default function Modal(props) {
  return (
    <Show when={props.open}>
      <div class="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose?.(); }}>
        <div class="modal">
          <div class="modal-title">{props.title}</div>
          {props.children}
          <div class="modal-actions">
            <button class="btn btn-ghost" onClick={props.onClose}>Annuler</button>
            {props.confirmLabel && (
              <button class={`btn ${props.confirmClass ?? 'btn-primary'}`} onClick={props.onConfirm}>
                {props.confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </Show>
  );
}
