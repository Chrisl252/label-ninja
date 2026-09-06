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
import { escapeHtml } from './plan.js';
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
      <p class="label led led--ready">Pro</p>
      <p class="usage__num">Unlimited exports</p>
      <p class="small muted">Thanks for supporting Label Ninja.</p>`;
    return;
  }
  const granted = fu.granted == null ? 10 : fu.granted;
  const remaining = fu.remaining == null ? granted : fu.remaining;
  const used = Math.max(0, granted - remaining);
  const pct = granted ? Math.min(100, Math.round((used / granted) * 100)) : 100;
  box.innerHTML = `
    <p class="label led${remaining <= 2 ? ' led--attn' : ''}">Free plan</p>
    <p class="usage__num"><span class="mono">${remaining}</span> <span class="usage__of">of ${granted} free PDF batches left</span></p>
    <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${granted}" aria-valuenow="${used}" aria-label="Free PDF batches used"><div class="meter__fill${pct >= 90 ? ' meter__fill--attn' : ''}" style="width:${pct}%"></div></div>
    <div><a href="#pricing" class="link small">Upgrade to Pro →</a></div>`;
}

// Saved projects are white label stock — the design, printed. Buttons on stock are black print.
function projectCard(p) {
  const card = document.createElement('div');
  card.className = 'card stock';
  card.innerHTML = `
    <div class="card__head">
      <p class="card__name truncate" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</p>
      <span class="chip">${TOOL_LABELS[p.tool] || p.tool}</span>
    </div>
    <div class="card__foot">
      <p class="card__meta">Updated ${fmtDate(p.updated_at)}</p>
      <span class="bars bars--sm" aria-hidden="true"></span>
    </div>
    <div class="card__acts">
      <button type="button" data-act="open" class="btn btn--sm grow">Open</button>
      <button type="button" data-act="dup" class="btn btn--ghost btn--sm">Duplicate</button>
      <button type="button" data-act="del" class="btn btn--ghost btn--sm btn--icon x" title="Delete" aria-label="Delete project">✕</button>
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
    grid.innerHTML = '<p class="small muted">No saved projects yet — create a label and hit Save.</p>';
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
  // Exports are dark job records (the PDF already left the printer).
  const card = document.createElement('div');
  card.className = 'card panel panel--tight';
  const metaBits = [meta.pages ? `${meta.pages} pg` : null, fmtBytes(meta.bytes)].filter(Boolean).join(' · ');
  card.innerHTML = `
    <div class="card__head">
      <p class="card__name">${(job.tool || '').replace('_', ' ')}</p>
      <span class="chip${job.status === 'completed' ? ' chip--ready' : ''}">${job.status}</span>
    </div>
    <p class="card__meta">${fmtDate(job.created_at)}${metaBits ? ' · ' + metaBits : ''}</p>
    <div class="card__acts">
      <button type="button" data-act="dl" class="btn btn--stock btn--sm grow">Re-download</button>
      <button type="button" data-act="del" class="btn btn--ghost btn--sm btn--icon x" title="Delete" aria-label="Delete export">✕</button>
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
      setTimeout(() => URL.revokeObjectURL(url), 60000);
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
    grid.innerHTML = '<p class="small muted">No exports yet — your PDF batches will appear here for 7 days.</p>';
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
    { mode: 'fnsku', label: 'FNSKU', hint: 'Amazon barcode labels' },
    { mode: 'guides', label: 'Test print + guides', hint: 'Printer setup, 4×6 / 2×1 test PDFs' },
  ];
  for (const t of tools) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.innerHTML = `<p class="tile__title">${t.label}</p><p class="tile__hint">${t.hint}</p>`;
    btn.addEventListener('click', () => window.LN.switchMode(t.mode));
    row.appendChild(btn);
  }
}

function renderCommonSizes() {
  const row = el('dash-common-sizes');
  if (row.childElementCount) return;
  for (const size of COMMON_SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.innerHTML = `<p class="tile__title mono">${size.label}</p><p class="tile__hint">${size.hint}</p>`;
    btn.addEventListener('click', () => window.LN.openEditorPreset(size.key));
    row.appendChild(btn);
  }
}

// ---- drag-drop uploader ----

const ACCEPTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function routeDroppedFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const file = files[0];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(ext) && !file.type.startsWith('image/')) {
    toast('Drop PNG, JPG, or WebP artwork. PDF conversion and CSV import are not available.');
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
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragover');
    routeDroppedFiles(event.dataTransfer.files);
  });
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', event => {
    if (event.target === zone && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); input.click(); }
  });
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
  projectsGrid.innerHTML = '<p class="small muted">Loading…</p>';
  exportsGrid.innerHTML = '<p class="small muted">Loading…</p>';
  const [projectsRes, exportsRes] = await Promise.allSettled([
    api('/api/projects?limit=50'),
    api('/api/exports?limit=6'),
  ]);
  if (projectsRes.status === 'fulfilled') {
    renderProjects(projectsRes.value.projects || []);
    renderTemplates(projectsRes.value.projects || []);
  } else {
    projectsGrid.innerHTML = '<p class="note note--danger">Could not load projects.</p>';
  }
  if (exportsRes.status === 'fulfilled') {
    renderExports(exportsRes.value.exports || []);
  } else {
    exportsGrid.innerHTML = '<p class="note note--danger">Could not load exports.</p>';
  }
}
