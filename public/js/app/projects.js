// Projects — client domain for saved projects: API wrappers, per-tool current
// project + changed-since-save tracking, the save flow (direct PATCH when a
// project is open, name mini-form modal for new saves, "save as template"),
// pending-save-after-auth, open/duplicate/delete, and per-tool hydration.
//
// Data shape v1 (server contract mirrors src/projects.js):
//   editor:  { meta:{version:1, tool:'editor'}, preset, elements:[...] }
//   bin/whatnot/fnsku: { meta:{version:1, tool}, values:{'<input-id>': value} }

import { api } from './api.js';
import { isSignedIn } from './session.js';
import { openAuthModal, addAfterAuth } from './auth-ui.js';
import { onToolDirty } from './exporter.js';
import { applyProjectState, getElements } from './editor.js';
import { updateBinPrintHint } from './bin-tool.js';
import { updateWhatnotPrintHint } from './whatnot-tool.js';
import { toast } from './toast.js';

const TOOLS = {
  editor: { label: 'Editor' },
  bin: { label: 'Bin labels', fields: ['bin-prefix', 'bin-shelf', 'bin-start', 'bin-end', 'bin-layout', 'bin-title-size', 'bin-barcode-height', 'bin-barcode-width', 'bin-padding', 'bin-show-value'] },
  whatnot: { label: 'Whatnot numbers', fields: ['wn-prefix', 'wn-start', 'wn-end', 'wn-stock'] },
  fnsku: { label: 'FNSKU', fields: ['fnsku-val', 'fnsku-title', 'fnsku-cond'] },
};

const current = Object.create(null); // tool -> {id, name, is_template}
const dirty = Object.create(null); // tool -> changed since last save/open
let saveTarget = null; // tool awaiting the name mini-form
let initialized = false;

function el(id) {
  return document.getElementById(id);
}

function markClean(tool) {
  dirty[tool] = false;
  renderToolStatus(tool);
}

export function isProjectDirty(tool) {
  return !!dirty[tool];
}

export function getCurrentProject(tool) {
  return current[tool] || null;
}

// ---- data collection / application ----

function collectData(tool) {
  if (tool === 'editor') {
    return {
      meta: { version: 1, tool: 'editor' },
      preset: el('preset-size').value,
      elements: getElements().map(({ ...rest }) => rest),
    };
  }
  const values = {};
  for (const id of TOOLS[tool].fields) {
    const input = el(id);
    if (!input) continue;
    values[id] = input.type === 'checkbox' ? input.checked : input.value;
  }
  return { meta: { version: 1, tool }, values };
}

function applyValues(tool, values) {
  for (const id of TOOLS[tool].fields) {
    const input = el(id);
    if (!input || !(id in values)) continue;
    if (input.type === 'checkbox') input.checked = !!values[id];
    else input.value = values[id];
  }
  if (tool === 'bin') updateBinPrintHint();
  if (tool === 'whatnot') updateWhatnotPrintHint();
}

export function applyProject(project) {
  const data = project.data || {};
  const meta = data.meta || {};
  if (meta.version !== 1) {
    toast('This project was saved by a newer version — cannot open it yet.');
    return;
  }
  current[project.tool] = { id: project.id, name: project.name, is_template: project.is_template };
  if (project.tool === 'editor') {
    applyProjectState(data.preset, data.elements);
  } else {
    applyValues(project.tool, data.values || {});
  }
  markClean(project.tool);
}

// ---- save flow ----

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
}

async function postProject(tool, name, isTemplate, button) {
  setBusy(button, true);
  try {
    const data = await api('/api/projects', {
      method: 'POST',
      body: { name, tool, data: collectData(tool), is_template: isTemplate },
    });
    current[tool] = { id: data.project.id, name, is_template: isTemplate ? 1 : 0 };
    markClean(tool);
    toast(`Saved "${name}".`, { kind: 'success' });
    return true;
  } catch (err) {
    toast(err.message || 'Could not save the project.', { kind: 'error' });
    return false;
  } finally {
    setBusy(button, false);
  }
}

async function patchProject(tool, button) {
  const proj = current[tool];
  setBusy(button, true);
  try {
    await api(`/api/projects/${proj.id}`, { method: 'PATCH', body: { data: collectData(tool) } });
    markClean(tool);
    toast(`Saved "${proj.name}".`, { kind: 'success' });
  } catch (err) {
    toast(err.message || 'Could not save the project.', { kind: 'error' });
  } finally {
    setBusy(button, false);
  }
}

// Entry point for every Save button. Signed-out -> auth modal, then continue.
export function saveProject(tool, button) {
  if (!isSignedIn()) {
    addAfterAuth(() => saveProject(tool, button));
    openAuthModal({ mode: 'signin', intent: 'save' });
    return;
  }
  if (current[tool] && current[tool].id) {
    patchProject(tool, button);
    return;
  }
  // New project: inline mini-form for the name (never window.prompt).
  saveTarget = tool;
  el('save-name').value = defaultName(tool);
  el('save-template-check').checked = false;
  el('save-modal').classList.remove('hidden');
  el('save-name').focus();
  el('save-name').select();
}

function defaultName(tool) {
  const d = new Date();
  const stamp = `${d.getMonth() + 1}/${d.getDate()}`;
  if (tool === 'editor') return `Label design ${stamp}`;
  return `${TOOLS[tool].label} ${stamp}`;
}

function closeSaveModal() {
  el('save-modal').classList.add('hidden');
  saveTarget = null;
}

// ---- open / duplicate / delete ----

export async function openProject(id) {
  try {
    const data = await api(`/api/projects/${id}`);
    const project = data.project;
    window.LN.switchMode(project.tool === 'editor' ? 'editor' : project.tool);
    applyProject(project);
  } catch (err) {
    toast(err.message || 'Could not open the project.', { kind: 'error' });
  }
}

export async function duplicateProject(id) {
  try {
    const data = await api(`/api/projects/${id}`);
    const p = data.project;
    const created = await api('/api/projects', {
      method: 'POST',
      body: { name: `${p.name} (copy)`, tool: p.tool, data: p.data, is_template: false },
    });
    toast(`Duplicated as "${created.project.name}".`, { kind: 'success' });
    if (typeof window.LN.refreshDashboard === 'function') window.LN.refreshDashboard();
  } catch (err) {
    toast(err.message || 'Could not duplicate the project.', { kind: 'error' });
  }
}

export async function deleteProject(id, name) {
  if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    for (const tool of Object.keys(current)) {
      if (current[tool] && current[tool].id === id) current[tool] = null;
    }
    toast('Project deleted.', { kind: 'success' });
    if (typeof window.LN.refreshDashboard === 'function') window.LN.refreshDashboard();
  } catch (err) {
    toast(err.message || 'Could not delete the project.', { kind: 'error' });
  }
}

// ---- per-tool status line (editor bar + tool save buttons) ----

function renderToolStatus(tool) {
  const proj = current[tool];
  const nameEl = el(`project-name-${tool}`);
  if (nameEl) {
    nameEl.textContent = proj ? `${proj.name}${proj.is_template ? ' · template' : ''}` : 'Unsaved';
    nameEl.classList.toggle('muted', !proj); // .muted lives in app.css — unsaved reads dimmer
  }
  const dot = el(`project-dirty-${tool}`);
  if (dot) dot.classList.toggle('hidden', !dirty[tool]);
}

export function renderAllToolStatus() {
  for (const tool of Object.keys(TOOLS)) renderToolStatus(tool);
}

export function initProjects() {
  if (initialized) return;
  initialized = true;
  for (const tool of Object.keys(TOOLS)) {
    dirty[tool] = true; // nothing saved yet
    current[tool] = null;
  }
  onToolDirty((tool) => {
    if (tool in TOOLS) {
      dirty[tool] = true;
      renderToolStatus(tool);
    }
  });

  el('save-close').addEventListener('click', closeSaveModal);
  el('save-cancel').addEventListener('click', closeSaveModal);
  el('save-modal').addEventListener('click', (event) => {
    if (event.target === el('save-modal')) closeSaveModal();
  });
  el('save-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tool = saveTarget;
    if (!tool) return closeSaveModal();
    const name = el('save-name').value.trim();
    if (!name || name.length > 80) {
      toast('Give the project a name (1-80 characters).', { kind: 'error' });
      return;
    }
    const okSave = await postProject(tool, name, el('save-template-check').checked, el('save-submit'));
    if (okSave) closeSaveModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el('save-modal').classList.contains('hidden')) closeSaveModal();
  });
  renderAllToolStatus();
}
