// App entry — mode switching, hash/path routing, the window.LN namespace that
// keeps the inline handlers working, and the init sequence. All real logic
// lives in the sibling modules; this file only wires.

import { modeFromHash, sectionIdFromHash } from './guides.js';
import { startSessionWatch, onSessionChange, isSignedIn } from './session.js';
import { initAuthUi, openAuthModal, closeAuthModal, authSignOut } from './auth-ui.js';
import { initExporter, runExport, markDirty, openExportsDrawer, closeExportsDrawer } from './exporter.js';
import { buildTestPrintJob } from './spec-builders.js';
import {
  initEditor, addElement, updateSelectedElement, deleteSelectedElement,
  changeCanvasSize, loadTemplate, handleImageUpload, getElements, exportEditorLabel,
} from './editor.js';
import { updateBinPrintHint, exportBinBatch } from './bin-tool.js';
import { initWhatnotTool, updateWhatnotPrintHint, exportWhatnotBatch } from './whatnot-tool.js';
import { exportFnskuLabel } from './fnsku-tool.js';
import { initToast, toast } from './toast.js';
import { initProjects, saveProject } from './projects.js';
import { refreshDashboard } from './dashboard.js';
import { initAccount, showAccount } from './account.js';
import { rememberWorkspace, lastWorkspaceLink } from './workspace-navigation.js';
import { mountViews } from './views/mount.js';
import { initLivePreviews } from './live-previews.js';

const MODES = ['home', 'dashboard', 'editor', 'bin', 'whatnot', 'fnsku', 'guides', 'account'];
const AUTH_ONLY_MODES = new Set(['dashboard', 'account']);
let pendingAccountRoute = false;
let accountPrompted = false;

export function switchMode(mode) {
  if (mode !== 'account') pendingAccountRoute = false;
  for (const m of MODES) {
    const container = document.getElementById(`mode-${m}`);
    if (container) container.classList.add('hidden');
  }
  document.getElementById('mode-editor').classList.remove('flex');

  // Roll tabs: the active tool is the white printed label (.is-active); the rest stay blank stock.
  for (const m of MODES) {
    const tab = document.getElementById(`tab-${m}`);
    if (tab) {
      tab.classList.remove('is-active');
      tab.removeAttribute('aria-current');
    }
  }

  if (!MODES.includes(mode) || (AUTH_ONLY_MODES.has(mode) && !isSignedIn())) mode = 'editor';
  rememberWorkspace(mode);
  document.body.dataset.mode = mode; // CSS: the tool tab row shows in app modes only (desktop)
  document.getElementById(`mode-${mode}`).classList.remove('hidden');
  const activeTab = document.getElementById(`tab-${mode}`);
  if (activeTab && !activeTab.classList.contains('hidden')) {
    activeTab.classList.add('is-active');
    activeTab.setAttribute('aria-current', 'page');
    if (typeof activeTab.scrollIntoView === 'function') {
      activeTab.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }
  if (mode === 'editor') {
    document.getElementById('mode-editor').classList.add('flex');
    changeCanvasSize();
    if (!getElements().length) loadTemplate('standard');
  }
  if (mode === 'dashboard') refreshDashboard();
  if (mode === 'home') renderHomeResume();
  if (mode === 'account') showAccount();
}

// Home page: offer a way back to an unsaved in-tab draft (modes only hide).
function renderHomeResume() {
  const link = document.getElementById('home-resume');
  if (!link) return;
  const last = lastWorkspaceLink();
  link.classList.toggle('hidden', !last);
  if (last) {
    link.href = last.hash;
    link.textContent = last.label;
  }
}

// Mode for the current hash; a bare "/" (no hash) lands on the home page.
function modeForLocation(hash) {
  return hash ? modeFromHash(hash) : 'home';
}

function scrollToHashSection() {
  const id = sectionIdFromHash(window.location.hash);
  if (!id) return;
  const target = document.getElementById(id);
  if (target) {
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
}

let navigatedExplicitly = false;

function routeFromLocation() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // SPA fallback paths served by the worker (real URLs, not just hashes).
  if (path === '/account') {
    navigatedExplicitly = true;
    pendingAccountRoute = true;
    switchMode('account');
    return true;
  }
  if (path === '/reset') {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      navigatedExplicitly = true;
      switchMode('editor');
      openAuthModal({ mode: 'reset-confirm', token });
      return true;
    }
  }

  const mode = modeForLocation(hash);
  if (hash) navigatedExplicitly = true;
  switchMode(mode);
  if (mode === 'guides' || mode === 'home') scrollToHashSection();
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
  else toast('Open a tool first, then use its Download PDF button.');
}

function runTestPrint(widthIn, heightIn, button) {
  runExport('test_print', () => buildTestPrintJob(widthIn, heightIn), button);
}

// Common-sizes shortcuts (dashboard): open the editor on a given preset.
function openEditorPreset(presetKey) {
  switchMode('editor');
  const select = document.getElementById('preset-size');
  if ([...select.options].some((o) => o.value === presetKey)) {
    select.value = presetKey;
    changeCanvasSize();
  }
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
  openEditorPreset,
  // tools (old names kept so legacy handlers can never 500 the console)
  updateBinPrintHint,
  updateWhatnotPrintHint,
  generateBinBatch: exportBinBatch,
  generateWhatnotBatch: exportWhatnotBatch,
  printSingleFNSKU: exportFnskuLabel,
  exportCurrentWorkspace,
  runTestPrint,
  // projects
  saveProject,
  refreshDashboard,
  // auth + exports
  openAuthSignIn: () => openAuthModal({ mode: 'signin' }),
  openAuthRegister: () => openAuthModal({ mode: 'register' }),
  closeAuthModal,
  authSignOut,
  openExportsDrawer,
  closeExportsDrawer,
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

function renderAuthNav(user) {
  const dashTab = document.getElementById('tab-dashboard');
  if (dashTab) dashTab.classList.toggle('hidden', !user);
}

function wireSessionDefaults() {
  onSessionChange((user) => {
    renderAuthNav(user);
    // Session bootstrap is asynchronous. Preserve the /account deep link
    // until identity is known, including when a returning customer must sign in.
    if (pendingAccountRoute) {
      if (user) {
        pendingAccountRoute = false;
        switchMode('account');
      } else if (!accountPrompted) {
        accountPrompted = true;
        openAuthModal({ mode: 'signin' });
      }
      return;
    }
    const visible = MODES.find((m) => !document.getElementById(`mode-${m}`).classList.contains('hidden')) || 'home';
    if (!user && (visible === 'dashboard' || visible === 'account')) {
      switchMode('home'); // signed out of an authed view — fall back to the home page
      return;
    }
    // First load, signed in, no explicit route: the account home is Dashboard.
    if (user && !navigatedExplicitly && visible === 'home') {
      navigatedExplicitly = true;
      switchMode('dashboard');
    }
  });
}

// Skip link: focus the visible view instead of changing the hash (a hash
// change would route to another mode).
function wireSkipLink() {
  const skip = document.querySelector('.skip-link');
  if (!skip) return;
  skip.addEventListener('click', (event) => {
    const visible = MODES.map((m) => document.getElementById(`mode-${m}`)).find((node) => node && !node.classList.contains('hidden'));
    if (!visible) return;
    event.preventDefault();
    if (!visible.hasAttribute('tabindex')) visible.setAttribute('tabindex', '-1');
    visible.focus();
  });
}

function init() {
  mountViews(); // app-only views + overlays must exist before any module queries them
  initToast();
  initEditor();
  initAuthUi();
  initExporter();
  initProjects();
  initAccount();
  startSessionWatch();
  wireSessionDefaults();
  wireDirtyFlags();
  updateBinPrintHint();
  initWhatnotTool();
  initLivePreviews();
  wireSkipLink();
  routeFromLocation();

  window.addEventListener('hashchange', () => {
    navigatedExplicitly = true;
    const mode = modeForLocation(window.location.hash);
    switchMode(mode);
    if (mode === 'guides' || mode === 'home') scrollToHashSection();
  });

  // The brand is a real link to "/" for crawlers; in-app it switches to the
  // home mode without a reload so unsaved drafts stay in memory.
  const wordmark = document.querySelector('.site-brand');
  if (wordmark) {
    wordmark.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (window.location.pathname !== '/') return;
      event.preventDefault();
      if (window.location.hash) history.pushState(null, '', '/');
      navigatedExplicitly = true;
      switchMode('home');
      window.scrollTo({ top: 0 });
    });
  }
}

init();
