// Account mode — signed-in profile: email, plan + subscription status in
// human words, free-uses bar, Stripe billing portal launch, checkout success
// banner, sign out, and a private support path for account deletion.

import { api } from './api.js';
import { getUser, refreshSession } from './session.js';
import { authSignOut } from './auth-ui.js';
import { toast } from './toast.js';
import { escapeHtml } from './plan.js';

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
    if (status === 'active') return sub.cancel_at_period_end ? `Cancels ${fmtDate(sub.paid_through)}` : 'Active';
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
    wrap.innerHTML = '<p class="small muted">Sign in to manage your account.</p>';
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
      <div class="panel panel--tight stack stack--xs">
        <div class="row spread">
          <p class="label led${remaining <= 2 ? ' led--attn' : ''}">Free PDF batches</p>
          <p class="mono small">${remaining} of ${granted} left</p>
        </div>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${granted}" aria-valuenow="${used}" aria-label="Free PDF batches used"><div class="meter__fill${pct >= 90 ? ' meter__fill--attn' : ''}" style="width:${pct}%"></div></div>
        <div><a href="#pricing" class="link small">Upgrade for unlimited →</a></div>
      </div>`;
  } else {
    usesBar = `
      <div class="panel panel--tight stack stack--xs">
        <p class="label led led--ready">Plan</p>
        <p class="usage__num">Pro · unlimited exports</p>
      </div>`;
  }
  wrap.innerHTML = `
    <div class="grid grid--2">
      <div class="panel panel--tight stack stack--xs">
        <p class="label">Account</p>
        <div class="kv kv--acct">
          <span class="kv__k">Email</span><span class="kv__v mono">${escapeHtml(user.email)}</span>
          <span class="kv__k">Plan</span><span class="kv__v">${pro ? '<span class="led led--ready">Pro</span>' : 'Free'}</span>
          <span class="kv__k">Subscription</span><span class="kv__v">${subscriptionWords(user)}</span>
        </div>
      </div>
      ${usesBar}
    </div>
    <div class="acct-actions">
      <button type="button" id="account-billing-btn" class="btn btn--primary">Manage billing</button>
      <button type="button" id="account-signout-btn" class="btn btn--ghost">Sign out</button>
      <a href="mailto:chris@bisket.com?subject=Label%20Ninja%20account%20deletion" class="btn btn--ghost">Request account deletion</a>
    </div>
    <p class="tiny muted">Need help or account deletion? Contact chris@bisket.com. Cancel a paid subscription in Manage billing before requesting deletion.</p>`;
  el('account-billing-btn').addEventListener('click', manageBilling);
  el('account-signout-btn').addEventListener('click', async () => {
    if (await authSignOut()) window.LN.switchMode('editor');
  });
}

async function manageBilling() {
  const button = el('account-billing-btn');
  button.disabled = true;
  try {
    const data = await api('/api/billing/portal', { method: 'POST' });
    if (data && data.url) {
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com') throw new Error('Invalid billing destination.');
      window.location.href = url.href;
      return;
    }
    toast('Could not open the billing portal. Try again.', { kind: 'error' });
  } catch (err) {
    if (err.code === 'no_customer') {
      toast('No subscription yet — upgrade from Pricing.');
    } else if (err.status === 503) {
      toast('Billing is not configured yet — please try again later.');
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
  const query = new URLSearchParams(window.location.search);
  if (query.get('checkout') === 'success') {
    banner.classList.remove('hidden');
    banner.textContent = 'Checking your subscription…';
    try {
      if (query.get('session_id')) await api('/api/billing/confirm', { method: 'POST', body: { session_id: query.get('session_id') } });
      const user = await refreshSession();
      banner.textContent = user?.free_uses?.unlimited ? 'Pro is active. Your PDF batches are unlimited.' : 'Payment is still being confirmed. Refresh your account shortly, or contact support.';
    } catch {
      banner.textContent = 'We could not confirm payment yet. Refresh your account shortly, or contact support.';
    }
    window.history.replaceState({}, '', window.location.pathname);
  }
  renderAccount();
}

export function initAccount() {
  if (initialized) return;
  initialized = true;
}
