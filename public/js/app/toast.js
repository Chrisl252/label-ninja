// Toast — tiny shared notifier (bottom-right card, auto-dismiss), matching
// the open-pdf toast pattern. Used by account/projects flows.

const DEFAULT_MS = 5000;

export function toast(message, { kind = 'info', ms = DEFAULT_MS } = {}) {
  const host = document.getElementById('ln-toast');
  if (!host) return;
  // Errors interrupt screen readers; everything else waits politely.
  host.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  host.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
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

// Screen-reader-only status line (export progress, dialog openings).
export function announce(message) {
  const live = document.getElementById('ln-live');
  if (!live) return;
  live.textContent = '';
  // Clear, then set after a tick, so a repeated message is announced again.
  setTimeout(() => { live.textContent = message; }, 30);
}

export function initToast() {
  if (!document.getElementById('ln-live')) {
    const live = document.createElement('div');
    live.id = 'ln-live';
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  if (!document.getElementById('ln-toast')) {
    const div = document.createElement('div');
    div.id = 'ln-toast';
    div.className = 'toast hidden no-print';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    document.body.appendChild(div);
  }
}
