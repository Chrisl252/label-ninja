// Toast — tiny shared notifier (bottom-right card, auto-dismiss), matching
// the open-pdf toast pattern. Used by pricing/account/projects flows.

const DEFAULT_MS = 5000;

export function toast(message, { kind = 'info', ms = DEFAULT_MS } = {}) {
  const host = document.getElementById('ln-toast');
  if (!host) return;
  const border = kind === 'error' ? 'border-red-800' : kind === 'success' ? 'border-emerald-700' : 'border-slate-700';
  const accent = kind === 'error' ? 'text-red-300' : kind === 'success' ? 'text-emerald-300' : 'text-slate-200';
  host.className = `fixed bottom-4 right-4 z-50 bg-slate-900 border ${border} rounded-xl shadow-2xl px-4 py-3 max-w-sm no-print`;
  host.textContent = '';
  const p = document.createElement('p');
  p.className = `text-xs font-semibold ${accent}`;
  p.textContent = message;
  host.appendChild(p);
  clearTimeout(host._timer);
  host._timer = setTimeout(() => {
    host.classList.add('hidden');
    host.className = 'hidden no-print';
  }, ms);
}

export function initToast() {
  if (!document.getElementById('ln-toast')) {
    const div = document.createElement('div');
    div.id = 'ln-toast';
    div.className = 'hidden no-print';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    document.body.appendChild(div);
  }
}
