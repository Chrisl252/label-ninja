// Dashboard — the signed-in home: usage + new-conversion hero, drag-drop
// uploader, recent projects + templates, recent exports, quick tools, and
// common sizes. Renders into the #mode-dashboard skeleton on every entry
// (fresh data, no client cache). Cards are built with listeners (drawer
// pattern), not inline onclick.

import { api, apiFetchBlob } from './api.js';
import { getUser } from './session.js';
import { fmtDate, fmtBytes } from './exporter.js';
import { handleImageUpload } from './editor.js';
import { openProject, duplicateProject, deleteProject } from './projects.js';
import { toast } from './toast.js';

const TOOL_LABELS = {
  editor: 'Editor',
  bin: 'Bin labels',
  whatnot: 'Whatnot',
  fnsku: 'FNSKU',
  test_print: 'Test print',
};

const COMMON_SIZES = [
  { key: 'shipping', label: '4" × 6"', hint: 'Shipping / bin' },
  { key: 'fnsku', label: '2" × 1"', hint: 'FNSKU' },
  { key: 'product_3x2', label: '3" × 2"', hint: 'Show number' },
  { key: 'tiny', label: '25 × 13 mm', hint: 'Tiny stock' },
];

function el(id) {
  return document.getElementById(id);
}

function renderUsage() {
  const user = getUser();
  const box = el('dash-usage');
  if (!user) {
    box.innerHTML = '';
    return;
  }
  const fu = user.free_uses || {};
  if (fu.unlimited) {
    box.innerHTML = `
      <p class="text-xs font-bold uppercase tracking-wider text-emerald-300">PRO</p>
      <p class="mt-1 text-2xl font-black text-white">Unlimited exports</p>
      <p class="mt-1 text-xs text-slate-400">Thanks for supporting Label Ninja.</p>`;
    return;
  }
  const granted = fu.granted == null ? 10 : fu.granted;
  const remaining = fu.remaining == null ? granted : fu.remaining;
  const used = Math.max(0, granted - remaining);
  const pct = granted ? Math.min(100, Math.round((used / granted) * 100)) : 100;
  box.innerHTML = `
    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Free plan</p>
    <p class="mt-1 text-2xl font-black text-white">${remaining} <span class="text-sm font-bold text-slate-400">of ${granted} free exports left</span></p>
    <div class="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden"><div class="h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-blue-500'}" style="width:${pct}%"></div></div>
    <a href="#pricing" class="mt-2 inline-block text-xs font-bold text-emerald-300 hover:text-emerald-200">Upgrade to Pro →</a>`;
}

function projectCard(p) {
  const card = document.createElement('div');
  card.className = 'rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2';
  card.innerHTML = `
    <div class="flex justify-between items-start gap-2">
      <p class="text-sm font-bold text-white truncate" title="${p.name}">${p.name}</p>
      <span class="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">${TOOL_LABELS[p.tool] || p.tool}</span>
    </div>
    <p class="text-[11px] text-slate-500">Updated ${fmtDate(p.updated_at)}</p>
    <div class="mt-auto flex gap-2">
      <button data-act="open" class="flex-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2 py-1.5">Open</button>
      <button data-act="dup" class="rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2 py-1.5">Duplicate</button>
      <button data-act="del" class="rounded bg-slate-800 hover:bg-slate-700 text-red-300 text-xs font-bold px-2 py-1.5" title="Delete">✕</button>
    </div>`;
  card.querySelector('[data-act="open"]').addEventListener('click', () => openProject(p.id));
  card.querySelector('[data-act="dup"]').addEventListener('click', () => duplicateProject(p.id));
  card.querySelector('[data-act="del"]').addEventListener('click', () => deleteProject(p.id, p.name));
  return card;
}

function renderProjects(projects) {
  const grid = el('dash-projects');
  const saved = projects.filter((p) => !p.is_template).slice(0, 6);
  grid.innerHTML = '';
  if (!saved.length) {
    grid.innerHTML = '<p class="text-sm text-slate-400">No saved projects yet — create a label and hit Save.</p>';
    return;
  }
  for (const p of saved) grid.appendChild(projectCard(p));
}

function renderTemplates(projects) {
  const area = el('dash-templates');
  const templates = projects.filter((p) => p.is_template).slice(0, 6);
  if (!templates.length) {
    area.parentElement.classList.add('hidden');
    return;
  }
  area.parentElement.classList.remove('hidden');
  area.innerHTML = '';
  for (const p of templates) area.appendChild(projectCard(p));
}

function exportCard(job) {
  const meta = job.output_meta || {};
  const card = document.createElement('div');
  card.className = 'rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2';
  const metaBits = [meta.pages ? `${meta.pages} pg` : null, fmtBytes(meta.bytes)].filter(Boolean).join(' · ');
  card.innerHTML = `
    <div class="flex justify-between items-start gap-2">
      <p class="text-sm font-bold text-white uppercase font-mono">${(job.tool || '').replace('_', ' ')}</p>
      <span class="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${job.status === 'completed' ? 'border-emerald-800 text-emerald-300' : 'border-slate-700 text-slate-400'}">${job.status}</span>
    </div>
    <p class="text-[11px] text-slate-500">${fmtDate(job.created_at)}${metaBits ? ' · ' + metaBits : ''}</p>
    <div class="mt-auto flex gap-2">
      <button data-act="dl" class="flex-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2 py-1.5">Re-download</button>
      <button data-act="del" class="rounded bg-slate-800 hover:bg-slate-700 text-red-300 text-xs font-bold px-2 py-1.5" title="Delete">✕</button>
    </div>`;
  card.querySelector('[data-act="dl"]').addEventListener('click', async () => {
    try {
      const blob = await apiFetchBlob(`/api/export/${job.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (meta.filename || `label-ninja-${job.id.slice(0, 8)}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message || 'Download failed.', { kind: 'error' });
    }
  });
  card.querySelector('[data-act="del"]').addEventListener('click', async () => {
    if (!window.confirm('Delete this export? The PDF will no longer be downloadable.')) return;
    try {
      await api(`/api/export/${job.id}`, { method: 'DELETE' });
      card.remove();
    } catch (err) {
      toast(err.message || 'Delete failed.', { kind: 'error' });
    }
  });
  return card;
}

function renderExports(exports) {
  const grid = el('dash-exports');
  grid.innerHTML = '';
  if (!exports.length) {
    grid.innerHTML = '<p class="text-sm text-slate-400">No exports yet — your PDF batches will appear here for 7 days.</p>';
    return;
  }
  for (const job of exports.slice(0, 6)) grid.appendChild(exportCard(job));
}

function renderQuickTools() {
  const row = el('dash-quick-tools');
  if (row.childElementCount) return; // static after first render
  const tools = [
    { mode: 'bin', label: 'Warehouse bins', hint: '4×6 bin + barcode batches' },
    { mode: 'whatnot', label: 'Whatnot numbers', hint: 'Live show sequences' },
    { mode: 'fnsku', label: 'FNSKU & CSV', hint: 'Amazon barcode labels' },
    { mode: 'guides', label: 'Test print + guides', hint: 'Printer setup, 4×6 / 2×1 test PDFs' },
  ];
  for (const t of tools) {
    const btn = document.createElement('button');
    btn.className = 'rounded-xl border border-slate-700 bg-slate-950 p-4 text-left hover:border-blue-500 transition';
    btn.innerHTML = `<p class="text-sm font-extrabold text-white">${t.label}</p><p class="mt-1 text-xs text-slate-400">${t.hint}</p>`;
    btn.addEventListener('click', () => window.LN.switchMode(t.mode));
    row.appendChild(btn);
  }
}

function renderCommonSizes() {
  const row = el('dash-common-sizes');
  if (row.childElementCount) return;
  for (const size of COMMON_SIZES) {
    const btn = document.createElement('button');
    btn.className = 'rounded-xl border border-slate-700 bg-slate-950 p-4 text-left hover:border-blue-500 transition';
    btn.innerHTML = `<p class="text-sm font-extrabold font-mono text-white">${size.label}</p><p class="mt-1 text-xs text-slate-400">${size.hint}</p>`;
    btn.addEventListener('click', () => window.LN.openEditorPreset(size.key));
    row.appendChild(btn);
  }
}

// ---- drag-drop uploader ----

const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'csv']);

function routeDroppedFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const file = files[0];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(ext) && !file.type.startsWith('image/')) {
    toast('Drop a PDF, PNG, JPG, WebP, or CSV file.');
    return;
  }
  if (ext === 'pdf') {
    toast('PDF converter coming in the next update.');
    return;
  }
  if (ext === 'csv') {
    window.LN.switchMode('fnsku');
    toast('CSV batch runs in the FNSKU & CSV tool.');
    return;
  }
  window.LN.switchMode('editor');
  handleImageUpload(files);
}

function wireUploader() {
  const zone = el('dash-uploader');
  const input = el('dash-uploader-input');
  if (zone.dataset.wired) return;
  zone.dataset.wired = '1';
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('border-blue-500', 'bg-blue-950/30');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('border-blue-500', 'bg-blue-950/30'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('border-blue-500', 'bg-blue-950/30');
    routeDroppedFiles(event.dataTransfer.files);
  });
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    routeDroppedFiles(input.files);
    input.value = '';
  });
}

export async function refreshDashboard() {
  renderUsage();
  renderQuickTools();
  renderCommonSizes();
  wireUploader();
  const projectsGrid = el('dash-projects');
  const exportsGrid = el('dash-exports');
  projectsGrid.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  exportsGrid.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  const [projectsRes, exportsRes] = await Promise.allSettled([
    api('/api/projects?limit=50'),
    api('/api/exports?limit=6'),
  ]);
  if (projectsRes.status === 'fulfilled') {
    renderProjects(projectsRes.value.projects || []);
    renderTemplates(projectsRes.value.projects || []);
  } else {
    projectsGrid.innerHTML = '<p class="text-sm text-red-400">Could not load projects.</p>';
  }
  if (exportsRes.status === 'fulfilled') {
    renderExports(exportsRes.value.exports || []);
  } else {
    exportsGrid.innerHTML = '<p class="text-sm text-red-400">Could not load exports.</p>';
  }
}
