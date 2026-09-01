// Exporter — metered server exports: idempotency-key lifecycle, the shared
// export flow (auth gate -> POST /api/export -> download -> save + "Open PDF"
// toast), pending-export-after-auth continuation, and the My Exports drawer.
// The direct browser-print bypass was removed deliberately: server metering is
// authoritative; printing happens from the downloaded PDF.

import { api, apiFetchBlob } from './api.js';
import { isSignedIn, refreshSession } from './session.js';
import { openAuthModal, setAfterAuth } from './auth-ui.js';
import { openPaywall } from './paywall.js';

const idemKeys = Object.create(null);
const dirty = Object.create(null);
let pendingExport = null;
let initialized = false;
let activeButton = null;

function newKey() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `ln-${window.crypto.randomUUID()}`;
  }
  return `ln-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// New key when the tool state changed since the last export; same key
// otherwise so a double-click / refresh replays the same job (no double burn).
export function getIdempotencyKey(tool) {
  if (!idemKeys[tool] || dirty[tool]) {
    idemKeys[tool] = newKey();
    dirty[tool] = false;
  }
  return idemKeys[tool];
}

export function markDirty(tool) {
  dirty[tool] = true;
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.classList.add('opacity-60', 'cursor-wait');
    button.innerHTML = label || 'Preparing PDF…';
  } else {
    button.disabled = false;
    button.classList.remove('opacity-60', 'cursor-wait');
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}

// ---- download / save / open toast ----

async function downloadJobPdf(job) {
  return apiFetchBlob(`/api/export/${job.id}/download`);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'label-ninja.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function offerOpenPdf(blob, filename) {
  const toast = document.getElementById('open-pdf-toast');
  if (!toast) return;
  const url = URL.createObjectURL(blob);
  const openBtn = document.getElementById('open-pdf-btn');
  const old = openBtn.dataset.url;
  if (old) URL.revokeObjectURL(old);
  openBtn.dataset.url = url;
  toast.querySelector('#open-pdf-name').textContent = filename || 'Your PDF';
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
    URL.revokeObjectURL(url);
    delete openBtn.dataset.url;
  }, 15000);
}

// ---- pending export across the auth wall ----

function setPending(tool, buildBody, button) {
  pendingExport = { tool, buildBody, button };
}

async function resumePending() {
  const pending = pendingExport;
  pendingExport = null;
  if (!pending) return;
  await runExport(pending.tool, pending.buildBody, pending.button);
}

// ---- the flow every tool button uses ----

export async function runExport(tool, buildBody, button) {
  let body;
  try {
    body = buildBody();
  } catch (err) {
    window.alert(err.message || 'Could not build the export.');
    return;
  }

  if (!isSignedIn()) {
    setPending(tool, buildBody, button);
    openAuthModal({ mode: 'signin', intent: 'export' });
    return;
  }

  setBusy(button, true);
  try {
    const payload = { idempotency_key: getIdempotencyKey(tool), format: 'pdf', ...body };
    const data = await api('/api/export', { method: 'POST', body: payload });
    const job = data.job;
    refreshSession(); // chip re-renders from authoritative /me (remaining included in response too)
    const blob = await downloadJobPdf(job);
    const filename = (job.output_meta && job.output_meta.filename) || `${tool}-label-ninja.pdf`;
    saveBlob(blob, filename);
    offerOpenPdf(blob, filename);
  } catch (err) {
    if (err.status === 402) {
      markDirty(tool); // nothing was consumed; a clean key for the post-upgrade retry
      openPaywall(err.extra && err.extra.upgrade_url);
    } else if (err.status === 401) {
      setPending(tool, buildBody, button);
      openAuthModal({ mode: 'signin', intent: 'export' });
    } else {
      window.alert(err.message || 'Export failed. Try again.');
    }
  } finally {
    setBusy(button, false);
  }
}

// ---- My Exports drawer ----

function fmtDate(ms) {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function redownload(jobId) {
  try {
    const blob = await apiFetchBlob(`/api/export/${jobId}/download`);
    saveBlob(blob, `label-ninja-${jobId.slice(0, 8)}.pdf`);
    offerOpenPdf(blob, `label-ninja-${jobId.slice(0, 8)}.pdf`);
  } catch (err) {
    window.alert(err.message || 'Download failed.');
  }
}

async function removeExport(jobId, row) {
  if (!window.confirm('Delete this export? The PDF file will no longer be downloadable.')) return;
  try {
    await api(`/api/export/${jobId}`, { method: 'DELETE' });
    row.remove();
  } catch (err) {
    window.alert(err.message || 'Delete failed.');
  }
}

function renderDrawer(exportsList) {
  const container = document.getElementById('exports-list');
  container.innerHTML = '';
  if (!exportsList.length) {
    container.innerHTML = '<p class="text-sm text-slate-400 p-4">No exports yet. Your PDF batches will appear here for 7 days.</p>';
    return;
  }
  for (const job of exportsList) {
    const meta = job.output_meta || {};
    const row = document.createElement('div');
    row.className = 'border border-slate-800 bg-slate-950 rounded-lg p-3 space-y-2';
    const metaBits = [meta.pages ? `${meta.pages} pg` : null, fmtBytes(meta.bytes), meta.width_in ? `${meta.width_in}x${meta.height_in} in` : null].filter(Boolean).join(' · ');
    row.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <p class="text-xs font-bold text-white uppercase font-mono">${job.tool.replace('_', ' ')}</p>
          <p class="text-[11px] text-slate-400">${fmtDate(job.created_at)}${metaBits ? ' · ' + metaBits : ''}</p>
          <p class="text-[10px] text-slate-500">Expires ${fmtDate(job.expires_at)} · files kept 7 days</p>
        </div>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${job.status === 'completed' ? 'border-emerald-800 text-emerald-300' : 'border-slate-700 text-slate-400'}">${job.status}</span>
      </div>
      <div class="flex gap-2">
        <button data-act="dl" class="flex-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2 py-1.5">Re-download</button>
        <button data-act="del" class="rounded bg-slate-800 hover:bg-slate-700 text-red-300 text-xs font-bold px-2 py-1.5">Delete</button>
      </div>`;
    row.querySelector('[data-act="dl"]').addEventListener('click', () => redownload(job.id));
    row.querySelector('[data-act="del"]').addEventListener('click', () => removeExport(job.id, row));
    container.appendChild(row);
  }
}

export async function openExportsDrawer() {
  const drawer = document.getElementById('exports-drawer');
  if (!drawer) return;
  drawer.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  const container = document.getElementById('exports-list');
  container.innerHTML = '<p class="text-sm text-slate-400 p-4">Loading…</p>';
  try {
    const data = await api('/api/exports?limit=50');
    renderDrawer(data.exports || []);
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-red-400 p-4">${err.message || 'Could not load exports.'}</p>`;
  }
}

export function closeExportsDrawer() {
  const drawer = document.getElementById('exports-drawer');
  if (!drawer) return;
  drawer.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

export function initExporter() {
  if (initialized) return;
  initialized = true;
  setAfterAuth(resumePending);
  document.getElementById('exports-close').addEventListener('click', closeExportsDrawer);
  document.getElementById('exports-drawer').addEventListener('click', (event) => {
    if (event.target === document.getElementById('exports-drawer')) closeExportsDrawer();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('exports-drawer').classList.contains('hidden')) closeExportsDrawer();
  });
  const openBtn = document.getElementById('open-pdf-btn');
  openBtn.addEventListener('click', () => {
    const url = openBtn.dataset.url;
    if (url) window.open(url, '_blank');
  });
  const toastClose = document.getElementById('open-pdf-close');
  if (toastClose) {
    toastClose.addEventListener('click', () => {
      const toast = document.getElementById('open-pdf-toast');
      toast.classList.add('hidden');
      if (openBtn.dataset.url) URL.revokeObjectURL(openBtn.dataset.url);
      delete openBtn.dataset.url;
    });
  }
}
