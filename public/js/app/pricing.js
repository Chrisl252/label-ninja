// Pricing mode — public (no auth) plan page. Price display is REAL data from
// /api/config/pricing only: unconfigured -> honest "early access" state with a
// mailto; configured -> Monthly/Annual cards from actual Stripe strings. No
// invented amounts anywhere. Upgrade: auth check -> POST /api/billing/checkout
// -> redirect to the returned Stripe URL (503 -> friendly toast).

import { api } from './api.js';
import { isSignedIn } from './session.js';
import { openAuthModal, addAfterAuth } from './auth-ui.js';
import { toast } from './toast.js';

const CURRENCY_SYMBOLS = { usd: '$', eur: '€', gbp: '£' };

let initialized = false;

function el(id) {
  return document.getElementById(id);
}

function fmtPrice(plan) {
  if (!plan || plan.amount == null) return '';
  const symbol = CURRENCY_SYMBOLS[String(plan.currency || '').toLowerCase()] || `${(plan.currency || '').toUpperCase()} `;
  const whole = plan.amount / 100;
  const price = Number.isInteger(whole) ? String(whole) : whole.toFixed(2);
  const per = plan.interval === 'year' ? '/yr' : plan.interval === 'month' ? '/mo' : '';
  return `${symbol}${price}${per}`;
}

const PRO_BENEFITS = [
  'Unlimited label PDF exports',
  'Saved projects & templates',
  'Full export history (7-day re-downloads)',
  'No ads — ever',
];

const FREE_FACTS = ['10 free exports', 'Every tool included', 'No watermark', 'No card required'];

function benefitsHtml() {
  return PRO_BENEFITS.map((b) => `<li class="flex gap-2"><span class="text-emerald-400 font-bold">✓</span><span>${b}</span></li>`).join('');
}

function renderUnconfigured(mount, errorMsg) {
  mount.innerHTML = `
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
      <p class="text-xs font-bold uppercase tracking-[.22em] text-emerald-300">Label Ninja Pro</p>
      <h1 class="text-3xl font-black text-white">Early access — pricing launching soon</h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-300">Pro is for the packing table that prints every day. The free plan stays generous while Pro pricing is being finalized.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-700 bg-slate-950 p-5 space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Free</p>
          <p class="text-2xl font-black text-white">$0</p>
          <ul class="space-y-1.5 text-sm text-slate-300">${FREE_FACTS.map((f) => `<li class="flex gap-2"><span class="text-slate-500">·</span><span>${f}</span></li>`).join('')}</ul>
        </div>
        <div class="rounded-xl border border-emerald-900 bg-slate-950 p-5 space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-emerald-300">Pro — coming at launch</p>
          <p class="text-2xl font-black text-white">Early access</p>
          <ul class="space-y-1.5 text-sm text-slate-300">${benefitsHtml()}</ul>
        </div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p class="text-sm font-bold text-white">Want in at launch?</p>
        <p class="mt-1 text-xs text-slate-400">${errorMsg ? 'Pricing is temporarily unavailable — ' + errorMsg + '.' : 'Pricing goes live soon.'} <a href="mailto:chris@bisket.com?subject=Label%20Ninja%20Pro%20early%20access" class="text-blue-400 hover:text-blue-300 underline">Email us to get notified when Pro goes live</a>.</p>
      </div>
    </section>`;
}

function planCard(title, plan, planKey, highlight) {
  const price = fmtPrice(plan);
  const border = highlight ? 'border-emerald-700' : 'border-slate-700';
  const badge = highlight ? '<span class="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300">BEST VALUE</span>' : '';
  const name = plan && plan.product_name ? plan.product_name : 'Label Ninja Pro';
  return `
    <div class="rounded-xl border ${border} bg-slate-950 p-5 space-y-3 flex flex-col">
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400">${title}</p>
        ${badge}
      </div>
      <p class="text-3xl font-black text-white">${price}</p>
      <p class="text-xs text-slate-400">${name}</p>
      <ul class="space-y-1.5 text-sm text-slate-300">${benefitsHtml()}</ul>
      <button data-plan="${planKey}" class="upgrade-btn mt-auto w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 transition">Upgrade to Pro</button>
    </div>`;
}

function renderConfigured(mount, data) {
  mount.innerHTML = `
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
      <p class="text-xs font-bold uppercase tracking-[.22em] text-emerald-300">Label Ninja Pro</p>
      <h1 class="text-3xl font-black text-white">Unlimited label exports for power sellers</h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-300">The free plan includes 10 PDF exports to try every tool. Pro is for the packing table that prints every day.</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-700 bg-slate-950 p-5 space-y-3 flex flex-col">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Free</p>
          <p class="text-3xl font-black text-white">$0</p>
          <ul class="space-y-1.5 text-sm text-slate-300">${FREE_FACTS.map((f) => `<li class="flex gap-2"><span class="text-slate-500">·</span><span>${f}</span></li>`).join('')}</ul>
        </div>
        ${planCard('Monthly', data.monthly, 'monthly', false)}
        ${planCard('Annual', data.annual, 'annual', true)}
      </div>
    </section>`;
  for (const btn of mount.querySelectorAll('.upgrade-btn')) {
    btn.addEventListener('click', () => startCheckout(btn.dataset.plan, btn));
  }
}

export async function renderPricing() {
  const mount = el('pricing-mount');
  if (!mount) return;
  try {
    const data = await api('/api/config/pricing');
    if (data && data.configured) {
      renderConfigured(mount, data);
      return;
    }
    renderUnconfigured(mount, data && data.error === 'price_fetch_failed' ? 'prices could not be loaded' : null);
  } catch {
    renderUnconfigured(mount, null);
  }
}

async function startCheckoutAttempt(plan, button) {
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening checkout…';
  }
  try {
    const data = await api('/api/billing/checkout', { method: 'POST', body: { plan } });
    if (data && data.url) {
      window.location.href = data.url;
      return;
    }
    toast('Checkout could not start. Try again shortly.', { kind: 'error' });
  } catch (err) {
    if (err.status === 503) {
      toast('Billing is not configured yet — pricing launches soon.');
    } else if (err.status === 401) {
      addAfterAuth(() => startCheckout(plan, null));
      openAuthModal({ mode: 'signin', intent: 'upgrade' });
    } else {
      toast(err.message || 'Checkout failed. Try again.', { kind: 'error' });
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Upgrade to Pro';
    }
  }
}

export function startCheckout(plan, button) {
  if (!isSignedIn()) {
    addAfterAuth(() => startCheckout(plan, null));
    openAuthModal({ mode: 'signin', intent: 'upgrade' });
    return;
  }
  startCheckoutAttempt(plan, button);
}

export function initPricing() {
  if (initialized) return;
  initialized = true;
}
