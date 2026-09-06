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
  return PRO_BENEFITS.map((b) => `<li><span class="tick">✓</span><span>${b}</span></li>`).join('');
}

function freeFactsHtml() {
  return FREE_FACTS.map((f) => `<li><span class="dot">·</span><span>${f}</span></li>`).join('');
}

function renderUnconfigured(mount, errorMsg) {
  mount.innerHTML = `
    <section class="panel stack stack--lg">
      <div class="stack stack--xs">
        <p class="label led led--ready">Label Ninja Pro</p>
        <h1>Early access — pricing launching soon</h1>
        <p class="lede">Pro is for the packing table that prints every day. The free plan stays generous while Pro pricing is being finalized.</p>
      </div>
      <div class="plans plans--2">
        <div class="plan">
          <p class="label">Free</p>
          <p class="plan__price">$0</p>
          <ul class="dot-list">${freeFactsHtml()}</ul>
        </div>
        <div class="plan plan--pro">
          <div class="plan__head"><p class="label">Pro — coming at launch</p><span class="chip chip--ready">Pro</span></div>
          <p class="plan__price">Early access</p>
          <ul class="tick-list">${benefitsHtml()}</ul>
        </div>
      </div>
      <div class="note pricing-notify">
        <strong>Want in at launch?</strong>
        <span>${errorMsg ? 'Pricing is temporarily unavailable — ' + errorMsg + '.' : 'Pricing goes live soon.'} <a href="mailto:chris@bisket.com?subject=Label%20Ninja%20Pro%20early%20access">Email us to get notified when Pro goes live</a>.</span>
      </div>
    </section>`;
}

function planCard(title, plan, planKey, highlight) {
  const price = fmtPrice(plan);
  const badge = highlight ? '<span class="chip chip--ready">Best value</span>' : '';
  const name = plan && plan.product_name ? plan.product_name : 'Label Ninja Pro';
  // The highlighted plan carries the one blue; the other upgrade is white stock.
  const btnClass = highlight ? 'btn btn--primary btn--block' : 'btn btn--stock btn--block';
  return `
    <div class="plan${highlight ? ' plan--pro' : ''}">
      <div class="plan__head">
        <p class="label">${title}</p>
        ${badge}
      </div>
      <p class="plan__price">${price}</p>
      <p class="plan__name">${name}</p>
      <ul class="tick-list">${benefitsHtml()}</ul>
      <button type="button" data-plan="${planKey}" class="upgrade-btn ${btnClass}">Upgrade to Pro</button>
    </div>`;
}

function renderConfigured(mount, data) {
  mount.innerHTML = `
    <section class="panel stack stack--lg">
      <div class="stack stack--xs">
        <p class="label led led--ready">Label Ninja Pro</p>
        <h1>Unlimited label exports for power sellers</h1>
        <p class="lede">The free plan includes 10 PDF exports to try every tool. Pro is for the packing table that prints every day.</p>
      </div>
      <div class="plans plans--3">
        <div class="plan">
          <p class="label">Free</p>
          <p class="plan__price">$0</p>
          <ul class="dot-list">${freeFactsHtml()}</ul>
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
