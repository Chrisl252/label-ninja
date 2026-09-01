// Auth UI — header chip / sign-in area, the auth modal (sign in, create
// account, forgot password, reset confirm), and the post-auth continuation
// hook the exporter uses to resume a pending export after login.

import { api } from './api.js';
import { getUser, isSignedIn, onSessionChange, applyUser, refreshSession } from './session.js';

let afterAuthCallback = null;
let initialized = false;

export function setAfterAuth(fn) {
  afterAuthCallback = fn;
}

function el(id) {
  return document.getElementById(id);
}

// ---- header auth area + usage chip ----

function renderHeaderAuth() {
  const user = getUser();
  const chip = el('usage-chip');
  const email = el('user-email');
  const signin = el('signin-btn');
  const signout = el('signout-btn');
  const exportsBtn = el('my-exports-btn');
  if (!chip) return;

  if (user) {
    const fu = user.free_uses || {};
    if (fu.unlimited) {
      chip.textContent = 'PRO';
      chip.className = 'text-[11px] font-mono font-bold px-2 py-1 rounded border border-emerald-600 bg-emerald-950/50 text-emerald-300';
    } else {
      const granted = fu.granted == null ? 10 : fu.granted;
      const remaining = fu.remaining == null ? granted : fu.remaining;
      chip.textContent = `${remaining} of ${granted} free`;
      chip.className = 'text-[11px] font-mono px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-300';
    }
    chip.classList.remove('hidden');
    email.textContent = user.email;
    email.title = user.email;
    email.classList.remove('hidden');
    signout.classList.remove('hidden');
    signin.classList.add('hidden');
    exportsBtn.classList.remove('hidden');
  } else {
    chip.classList.add('hidden');
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
      btn.className = active
        ? 'flex-1 px-3 py-2 text-xs font-bold rounded bg-blue-600 text-white'
        : 'flex-1 px-3 py-2 text-xs font-semibold rounded text-slate-400 hover:text-white';
    }
  }
  const tabsRow = el('auth-tabs');
  if (tabsRow) tabsRow.classList.toggle('hidden', !tabs.includes(mode));
  const firstInput = modal.querySelector(`[data-panel="${mode}"] input`);
  if (firstInput) firstInput.focus();
}

export function openAuthModal({ mode = 'signin', intent = null, token = null } = {}) {
  const modal = el('auth-modal');
  if (!modal) return;
  el('auth-error').classList.add('hidden');
  el('auth-error').textContent = '';
  const msg = el('auth-msg');
  if (intent === 'export') {
    msg.textContent = 'Create a free account to export — you get 10 free exports.';
    msg.classList.remove('hidden');
  } else {
    msg.classList.add('hidden');
  }
  if (mode === 'reset-confirm' && token) {
    el('auth-reset-confirm-token').value = token;
  }
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  showPanel(mode);
}

export function closeAuthModal() {
  const modal = el('auth-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  for (const form of modal.querySelectorAll('form')) form.reset();
}

function authError(message) {
  const box = el('auth-error');
  box.textContent = message;
  box.classList.remove('hidden');
}

async function handleAuthSuccess() {
  await refreshSession(); // register/login responses lack free_uses — /me has the full shape
  closeAuthModal();
  const cb = afterAuthCallback;
  afterAuthCallback = null;
  if (typeof cb === 'function') cb();
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
  } catch {
    // cookie already dead — clear client state regardless
  }
  applyUser(null);
}

export function initAuthUi() {
  if (initialized) return;
  initialized = true;
  onSessionChange(renderHeaderAuth);
  renderHeaderAuth();

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
    const confirm = form.elements.confirm.value;
    if (password !== confirm) throw new Error('Passwords do not match.');
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
    msg.classList.remove('hidden');
  });
}
