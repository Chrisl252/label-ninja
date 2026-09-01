// Account mode — signed-in profile: email, plan + subscription status in
// human words, free-uses bar, Stripe billing portal launch, checkout success
// banner, sign out. Account deletion is NOT implemented server-side yet —
// rendered disabled with an honest tooltip (server work lands in B8).

import { api } from './api.js';
import { getUser, refreshSession } from './session.js';
import { authSignOut } from './auth-ui.js';
import { toast } from './toast.js';

let initialized = false;

function el(id) {
  return document.getElementById(id);
}

function fmtDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function subscriptionWords(user) {
  const sub = user.subscription || {};
  const status = sub.status;
  if (isProStatus(user)) {
    if (status === 'active') return 'Active';
    if (status === 'trialing') return 'Trial';
    if (status === 'canceled') return `Canceled (access until ${fmtDate(sub.paid_through)})`;
    if (status === 'past_due') return 'Past due';
    return 'Active';
  }
  return 'Free';
}

function isProStatus(user) {
  const fu = user.free_uses || {};
  return !!fu.unlimited;
}

function renderAccount() {
  const user = getUser();
  const wrap = el('account-mount');
  if (!user) {
    wrap.innerHTML = '<p class="text-sm text-slate-400">Sign in to manage your account.</p>';
    return;
  }
  const fu = user.free_uses || {};
  const pro = isProStatus(user);
  let usesBar = '';
  if (!pro) {
    const granted = fu.granted == null ? 10 : fu.granted;
    const remaining = fu.remaining == null ? granted : fu.remaining;
    const used = Math.max(0, granted - remaining);
    const pct = granted ? Math.min(100, Math.round((used / granted) * 100)) : 100;
    usesBar = `
      <div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div class="flex justify-between items-center">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Free exports</p>
          <p class="text-xs font-mono text-slate-300">${remaining} of ${granted} left</p>
        </div>
        <div class="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden"><div class="h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-blue-500'}" style="width:${pct}%"></div></div>
        <a href="#pricing" class="mt-2 inline-block text-xs font-bold text-emerald-300 hover:text-emerald-200">Upgrade for unlimited →</a>
      </div>`;
  } else {
    usesBar = `
      <div class="rounded-xl border border-emerald-900 bg-emerald-950/30 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-emerald-300">Plan</p>
        <p class="mt-1 text-lg font-black text-white">PRO · unlimited exports</p>
      </div>`;
  }
  wrap.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Account</p>
        <p class="text-sm font-mono text-white break-all">${user.email}</p>
        <p class="text-xs text-slate-400">Plan: <span class="font-bold ${pro ? 'text-emerald-300' : 'text-slate-200'}">${pro ? 'PRO' : 'Free'}</span></p>
        <p class="text-xs text-slate-400">Subscription: <span class="font-bold text-slate-200">${subscriptionWords(user)}</span></p>
      </div>
      ${usesBar}
    </div>
    <div class="flex flex-wrap gap-3">
      <button id="account-billing-btn" class="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2.5 transition">Manage billing</button>
      <button id="account-signout-btn" class="rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 transition">Sign out</button>
      <button id="account-delete-btn" disabled title="Available soon" class="rounded-lg bg-slate-900 border border-slate-800 text-slate-600 font-bold text-sm px-4 py-2.5 cursor-not-allowed">Delete account</button>
    </div>
    <p class="text-[11px] text-slate-500">Delete account arrives in a coming update — email chris@bisket.com if you need data removed sooner.</p>`;
  el('account-billing-btn').addEventListener('click', manageBilling);
  el('account-signout-btn').addEventListener('click', async () => {
    await authSignOut();
    window.LN.switchMode('editor');
  });
}

async function manageBilling() {
  const button = el('account-billing-btn');
  button.disabled = true;
  try {
    const data = await api('/api/billing/portal', { method: 'POST' });
    if (data && data.url) {
      window.location.href = data.url;
      return;
    }
    toast('Could not open the billing portal. Try again.', { kind: 'error' });
  } catch (err) {
    if (err.code === 'no_customer') {
      toast('No subscription yet — upgrade from Pricing.');
    } else if (err.status === 503) {
      toast('Billing is not configured yet — pricing launches soon.');
    } else {
      toast(err.message || 'Could not open the billing portal.', { kind: 'error' });
    }
  } finally {
    button.disabled = false;
  }
}

export async function showAccount() {
  const banner = el('account-checkout-banner');
  banner.classList.add('hidden');
  if (new URLSearchParams(window.location.search).get('checkout') === 'success') {
    banner.classList.remove('hidden');
    await refreshSession(); // webhook may have landed the new plan already
    window.history.replaceState({}, '', window.location.pathname);
  }
  renderAccount();
}

export function initAccount() {
  if (initialized) return;
  initialized = true;
}
