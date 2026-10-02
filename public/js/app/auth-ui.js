// Auth UI — header chip / sign-in area, the auth modal (sign in, create
// account, forgot password, reset confirm), and the post-auth continuation
// hook the exporter uses to resume a pending export after login.

import { api } from './api.js';
import { getUser, isSignedIn, onSessionChange, applyUser, refreshSession } from './session.js';
import { toast, announce } from './toast.js';
import { rememberOpener, restoreOpener, trapFocus } from './focus-trap.js';

let afterAuthBaseline = null; // persistent: exporter's pending-export resume (setAfterAuth)
const afterAuthOnce = []; // one-shot continuations: pending save…
let initialized = false;
const RETURNING_KEY = 'ln-has-account'; // per-browser hint: open "Sign in" first for returning users

// Copy per intent: one modal, the free/no-card promise up front, and the
// submit buttons say what happens next.
const INTENT_COPY = {
  export: {
    title: 'Download your PDF',
    msg: 'Downloading needs a free account so your PDFs and projects stay with you. Your download starts as soon as you are in.',
    register: 'Create free account and download',
    signin: 'Sign in and download',
  },
  save: {
    title: 'Save your project',
    msg: 'Saved projects live in a free account. Your project saves as soon as you are in.',
    register: 'Create free account and save',
    signin: 'Sign in and save',
  },
  default: {
    title: 'Your account',
    msg: 'Sign in to download PDFs and keep your saved projects.',
    register: 'Create free account',
    signin: 'Sign in',
  },
};

function isReturningVisitor() {
  try { return window.localStorage.getItem(RETURNING_KEY) === '1'; } catch { return false; }
}

function markReturningVisitor() {
  try { window.localStorage.setItem(RETURNING_KEY, '1'); } catch { /* storage blocked: harmless */ }
}

export function setAfterAuth(fn) {
  afterAuthBaseline = typeof fn === 'function' ? fn : null;
}

// Queue a one-shot continuation that runs on the NEXT successful auth, after
// the baseline resume. Cleared once run.
export function addAfterAuth(fn) {
  if (typeof fn === 'function') afterAuthOnce.push(fn);
}

function el(id) {
  return document.getElementById(id);
}

// ---- header auth area ----

function renderHeaderAuth() {
  const user = getUser();
  const email = el('user-email');
  const signin = el('signin-btn');
  const signout = el('signout-btn');
  const exportsBtn = el('my-exports-btn');
  if (!email) return;

  if (user) {
    email.textContent = 'Account';
    email.title = user.email;
    email.classList.remove('hidden');
    signout.classList.remove('hidden');
    signin.classList.add('hidden');
    exportsBtn.classList.remove('hidden');
  } else {
    email.classList.add('hidden');
    signout.classList.add('hidden');
    exportsBtn.classList.add('hidden');
    signin.classList.remove('hidden');
  }
}

// ---- modal ----

function showPanel(mode) {
  const modal = el('auth-modal');
  modal.dataset.mode = mode;
  for (const panel of modal.querySelectorAll('[data-panel]')) {
    panel.classList.toggle('hidden', panel.dataset.panel !== mode);
  }
  const tabs = ['signin', 'register'];
  for (const t of tabs) {
    const btn = el(`auth-tab-${t}`);
    if (btn) {
      const active = mode === t;
      btn.className = active ? 'tabs__btn is-active' : 'tabs__btn';
    }
  }
  const tabsRow = el('auth-tabs');
  if (tabsRow) tabsRow.classList.toggle('hidden', !tabs.includes(mode));
  const firstInput = modal.querySelector(`[data-panel="${mode}"] input`);
  if (firstInput) firstInput.focus();
}

// mode 'auto' opens "Create free account" for new visitors and "Sign in"
// for browsers that have signed in before.
export function openAuthModal({ mode = 'signin', intent = null, token = null } = {}) {
  const modal = el('auth-modal');
  if (!modal) return;
  if (mode === 'auto') mode = isReturningVisitor() ? 'signin' : 'register';
  el('auth-error').classList.add('hidden');
  el('auth-error').textContent = '';
  const copy = INTENT_COPY[intent] || INTENT_COPY.default;
  el('auth-title').textContent = copy.title;
  el('auth-msg').textContent = copy.msg;
  el('auth-register-submit').textContent = copy.register;
  el('auth-signin-submit').textContent = copy.signin;
  if (mode === 'reset-confirm' && token) {
    el('auth-reset-confirm-token').value = token;
  }
  if (modal.classList.contains('hidden')) rememberOpener(modal);
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  showPanel(mode);
  if (intent === 'export') announce(`${copy.title}: ${copy.msg}`);
}

export function closeAuthModal() {
  const modal = el('auth-modal');
  if (!modal) return;
  const wasOpen = !modal.classList.contains('hidden');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  for (const form of modal.querySelectorAll('form')) form.reset();
  el('auth-register-password').type = 'password';
  if (wasOpen) restoreOpener(modal);
}

function authError(message) {
  const box = el('auth-error');
  box.textContent = message;
  box.classList.remove('hidden');
}

async function handleAuthSuccess() {
  await refreshSession(); // /me is the authoritative session shape
  markReturningVisitor();
  closeAuthModal();
  if (typeof afterAuthBaseline === 'function') {
    try {
      await afterAuthBaseline();
    } catch {
      // baseline continuation failing must not block one-shots
    }
  }
  const once = afterAuthOnce.splice(0);
  for (const cb of once) {
    try {
      await cb();
    } catch {
      // one continuation failing must not block the rest
    }
  }
}

function wireForm(formId, submitFn) {
  const form = el(formId);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Working…';
    try {
      await submitFn(form);
    } catch (err) {
      authError(err.message || 'Something went wrong. Try again.');
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

export async function authSignOut() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    if (err.status !== 401) {
      toast('Sign out did not finish. Check your connection and try again.', { kind: 'error' });
      return false;
    }
  }
  applyUser(null);
  return true;
}

export function initAuthUi() {
  if (initialized) return;
  initialized = true;
  onSessionChange(renderHeaderAuth);
  renderHeaderAuth();

  trapFocus(el('auth-modal'));
  el('auth-register-show').addEventListener('change', (event) => {
    el('auth-register-password').type = event.target.checked ? 'text' : 'password';
  });
  el('auth-close').addEventListener('click', closeAuthModal);
  el('auth-cancel').addEventListener('click', closeAuthModal);
  el('auth-modal').addEventListener('click', (event) => {
    if (event.target === el('auth-modal')) closeAuthModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!el('auth-modal').classList.contains('hidden')) closeAuthModal();
    }
  });

  el('auth-tab-signin').addEventListener('click', () => showPanel('signin'));
  el('auth-tab-register').addEventListener('click', () => showPanel('register'));
  el('auth-to-register').addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('register');
  });
  el('auth-to-signin').addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('signin');
  });
  el('auth-to-reset').addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('reset-request');
  });
  el('auth-reset-back').addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('signin');
  });

  wireForm('auth-form-signin', async (form) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email: form.elements.email.value, password: form.elements.password.value },
    });
    await handleAuthSuccess(data.user);
  });

  wireForm('auth-form-register', async (form) => {
    const password = form.elements.password.value;
    if (!form.elements.email.value.includes('@')) throw new Error('Enter the email address you want to sign in with.');
    if (password.length < 10) throw new Error('Password must be at least 10 characters.');
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: { email: form.elements.email.value, password },
    });
    await handleAuthSuccess(data.user);
  });

  wireForm('auth-form-reset-request', async (form) => {
    await api('/api/auth/reset-request', {
      method: 'POST',
      body: { email: form.elements.email.value },
    });
    el('auth-reset-sent').classList.remove('hidden');
  });

  wireForm('auth-form-reset-confirm', async (form) => {
    await api('/api/auth/reset-confirm', {
      method: 'POST',
      body: { token: form.elements.token.value, new_password: form.elements.password.value },
    });
    authError('');
    el('auth-error').classList.add('hidden');
    showPanel('signin');
    const msg = el('auth-msg');
    msg.textContent = 'Password updated — sign in with your new password.';
  });
}
