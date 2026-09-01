// App entry — mode switching, hash/path routing, the window.LN namespace that
// keeps the inline handlers working, and the init sequence. All real logic
// lives in the sibling modules; this file only wires.

import { modeFromHash, sectionIdFromHash } from './guides.js';
import { startSessionWatch } from './session.js';
import { initAuthUi, openAuthModal, closeAuthModal, authSignOut } from './auth-ui.js';
import { initPaywall, openPaywall, closePaywall } from './paywall.js';
import { initExporter, runExport, markDirty, openExportsDrawer, closeExportsDrawer } from './exporter.js';
import { buildTestPrintJob } from './spec-builders.js';
import {
  initEditor, addElement, updateSelectedElement, deleteSelectedElement,
  changeCanvasSize, loadTemplate, handleImageUpload, getElements, exportEditorLabel,
} from './editor.js';
import { updateBinPrintHint, exportBinBatch } from './bin-tool.js';
import { updateWhatnotPrintHint, exportWhatnotBatch } from './whatnot-tool.js';
import { exportFnskuLabel } from './fnsku-tool.js';

const MODES = ['editor', 'bin', 'whatnot', 'fnsku', 'guides'];

export function switchMode(mode) {
  for (const m of MODES) {
    document.getElementById(`mode-${m}`).classList.add('hidden');
  }
  document.getElementById('mode-editor').classList.remove('flex');

  const inactiveTabClass = 'px-3 py-1.5 rounded text-xs font-semibold text-slate-400 hover:text-white transition shrink-0 whitespace-nowrap';
  const activeTabClass = 'px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white transition shrink-0 whitespace-nowrap';
  for (const m of MODES) {
    document.getElementById(`tab-${m}`).className = inactiveTabClass;
  }

  if (!MODES.includes(mode)) mode = 'editor';
  document.getElementById(`mode-${mode}`).classList.remove('hidden');
  document.getElementById(`tab-${mode}`).className = activeTabClass;
  if (mode === 'editor') {
    document.getElementById('mode-editor').classList.add('flex');
    changeCanvasSize();
    if (!getElements().length) loadTemplate('standard');
  }
}

function scrollToHashSection() {
  const id = sectionIdFromHash(window.location.hash);
  if (!id) return;
  const target = document.getElementById(id);
  if (target) {
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
}

function routeFromLocation() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // SPA fallback paths served by the worker (real URLs, not just hashes).
  if (path === '/pricing') {
    switchMode('guides');
    window.location.hash = '#pricing';
    scrollToHashSection();
    return true;
  }
  if (path === '/reset') {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      switchMode('editor');
      openAuthModal({ mode: 'reset-confirm', token });
      return true;
    }
  }

  const mode = modeFromHash(hash);
  switchMode(mode);
  if (mode === 'guides') scrollToHashSection();
  return true;
}

// Route the visible mode for the header-level export (replaces the removed
// header print button; the per-tool buttons are the primary CTAs).
function exportCurrentWorkspace(button) {
  const mode = MODES.find((m) => !document.getElementById(`mode-${m}`).classList.contains('hidden')) || 'editor';
  if (mode === 'editor') exportEditorLabel(button);
  else if (mode === 'bin') exportBinBatch(button);
  else if (mode === 'whatnot') exportWhatnotBatch(button);
  else if (mode === 'fnsku') exportFnskuLabel(button);
  else window.alert('Open a tool first, then use its Download PDF button.');
}

function runTestPrint(widthIn, heightIn, button) {
  runExport('test_print', () => buildTestPrintJob(widthIn, heightIn), button);
}

// One namespace for every inline handler (full listener migration is a later
// polish brick). Old global names map to their new export-flow implementations.
window.LN = {
  switchMode,
  // editor
  changeCanvasSize,
  addElement,
  updateSelectedElement,
  deleteSelectedElement,
  loadTemplate,
  handleImageUpload,
  exportEditorLabel,
  printEditorLabel: exportEditorLabel,
  printCurrentWorkspace: exportCurrentWorkspace,
  // tools (old names kept so legacy handlers can never 500 the console)
  updateBinPrintHint,
  updateWhatnotPrintHint,
  generateBinBatch: exportBinBatch,
  generateWhatnotBatch: exportWhatnotBatch,
  printSingleFNSKU: exportFnskuLabel,
  exportCurrentWorkspace,
  runTestPrint,
  // auth + exports + paywall
  openAuthSignIn: () => openAuthModal({ mode: 'signin' }),
  openAuthRegister: () => openAuthModal({ mode: 'register' }),
  closeAuthModal,
  authSignOut,
  openExportsDrawer,
  closeExportsDrawer,
  openPaywall,
  closePaywall,
};

function wireDirtyFlags() {
  // Any input/change inside a tool invalidates that tool's idempotency key.
  const map = [
    ['mode-editor', 'editor'],
    ['mode-bin', 'bin'],
    ['mode-whatnot', 'whatnot'],
    ['mode-fnsku', 'fnsku'],
  ];
  for (const [containerId, tool] of map) {
    const container = document.getElementById(containerId);
    if (!container) continue;
    container.addEventListener('input', () => markDirty(tool));
    container.addEventListener('change', () => markDirty(tool));
  }
}

function init() {
  initEditor();
  initAuthUi();
  initPaywall();
  initExporter();
  startSessionWatch();
  wireDirtyFlags();
  updateBinPrintHint();
  updateWhatnotPrintHint();
  routeFromLocation();

  window.addEventListener('hashchange', () => {
    const mode = modeFromHash(window.location.hash);
    switchMode(mode);
    if (mode === 'guides') scrollToHashSection();
  });
}

init();
