// App entry — mode switching, hash/path routing, the window.LN namespace that
// keeps the inline handlers working, and the init sequence. All real logic
// lives in the sibling modules; this file only wires.

import { modeFromHash, sectionIdFromHash } from './guides.js';
import { startSessionWatch, onSessionChange, isSignedIn } from './session.js';
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
import { initToast } from './toast.js';
import { initProjects, saveProject } from './projects.js';
import { refreshDashboard } from './dashboard.js';
import { initPricing, renderPricing, startCheckout } from './pricing.js';
import { initAccount, showAccount } from './account.js';

const MODES = ['dashboard', 'editor', 'bin', 'whatnot', 'fnsku', 'guides', 'pricing', 'account'];
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
  if (mode === 'pricing') renderPricing();
  if (mode === 'account') showAccount();
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
  if (path === '/pricing') {
    navigatedExplicitly = true;
    switchMode('pricing');
    return true;
  }
  if (path === '/billing' || path === '/account') {
    navigatedExplicitly = true;
    pendingAccountRoute = true;
    switchMode('account'); // /billing carries ?checkout=success — banner shown by showAccount
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

  const mode = modeFromHash(hash);
  if (hash) navigatedExplicitly = true;
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
  // pricing
  startCheckout,
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

function renderAuthNav(user) {
  const dashTab = document.getElementById('tab-dashboard');
  if (dashTab) dashTab.classList.toggle('hidden', !user);
}

function wireSessionDefaults() {
  onSessionChange((user) => {
    renderAuthNav(user);
    // Session bootstrap is asynchronous. Preserve checkout/account deep links
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
    const visible = MODES.find((m) => !document.getElementById(`mode-${m}`).classList.contains('hidden')) || 'editor';
    if (!user && (visible === 'dashboard' || visible === 'account')) {
      switchMode('editor'); // signed out of an authed view — fall back to the tools
      return;
    }
    // First load, signed in, no explicit route: the account home is Dashboard.
    if (user && !navigatedExplicitly && visible === 'editor') {
      navigatedExplicitly = true;
      switchMode('dashboard');
    }
  });
}

function init() {
  initToast();
  initEditor();
  initAuthUi();
  initPaywall();
  initExporter();
  initProjects();
  initPricing();
  initAccount();
  startSessionWatch();
  wireSessionDefaults();
  wireDirtyFlags();
  updateBinPrintHint();
  updateWhatnotPrintHint();
  routeFromLocation();

  window.addEventListener('hashchange', () => {
    navigatedExplicitly = true;
    const mode = modeFromHash(window.location.hash);
    switchMode(mode);
    if (mode === 'guides') scrollToHashSection();
  });
}

init();
