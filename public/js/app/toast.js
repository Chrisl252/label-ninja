// Toast — tiny shared notifier (bottom-right card, auto-dismiss), matching
// the open-pdf toast pattern. Used by account/projects flows.

const DEFAULT_MS = 5000;

export function toast(message, { kind = 'info', ms = DEFAULT_MS } = {}) {
  const host = document.getElementById('ln-toast');
  if (!host) return;
  // White label stock with an LED bar down the left edge: green = success, red = error.
  const variant = kind === 'error' ? ' toast--danger' : kind === 'success' ? ' toast--ready' : '';
  host.className = `toast no-print${variant}`;
  host.textContent = '';
  const p = document.createElement('p');
  p.className = 'toast__msg';
  p.textContent = message;
  host.appendChild(p);
  clearTimeout(host._timer);
  host._timer = setTimeout(() => {
    host.className = 'toast hidden no-print';
  }, ms);
}

export function initToast() {
  if (!document.getElementById('ln-toast')) {
    const div = document.createElement('div');
    div.id = 'ln-toast';
    div.className = 'toast hidden no-print';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    document.body.appendChild(div);
  }
}
