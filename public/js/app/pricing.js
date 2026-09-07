// The agreed offer stays visible; only verified Stripe configuration enables Checkout.
import { api } from './api.js';
import { isSignedIn, isPro, getUser, onSessionChange } from './session.js';
import { openAuthModal, addAfterAuth } from './auth-ui.js';
import { toast } from './toast.js';
import { FREE_FACTS, pricingSummary } from './plan.js';
import { pricingReturn, navigateInPlace } from './workspace-navigation.js';
let starting = false;
let initialized = false;
let renderVersion = 0;
let focusRequested = false;
export async function renderPricing({ focus = false } = {}) {
  const mount = document.getElementById('pricing-mount');
  if (!mount) return;
  focusRequested ||= focus;
  const version = ++renderVersion;
  let data;
  try { data = await api('/api/config/pricing'); } catch { data = { configured: false }; }
  if (version !== renderVersion) return;
  data ||= { configured: false };
  const summary = pricingSummary(getUser());
  const back = pricingReturn();
  mount.innerHTML = `
    <section class="panel stack stack--lg">
      <div class="stack stack--xs">
        <p class="label">Label Ninja</p>
        <h1 tabindex="-1">${summary.heading}</h1>
        <p class="lede">Print bin labels, Whatnot numbers, FNSKUs, and custom designs. Keep going with Pro for $9.99 a month.</p>
      </div>
      <div class="plans plans--2">
        <div class="plan">
          <p class="label">Free</p><p class="plan__price">$0</p>
          <ul class="dot-list">${FREE_FACTS.map(f => `<li><span class="dot">·</span><span>${f}</span></li>`).join('')}</ul>
          ${summary.balance ? `<p class="note" role="status">${summary.balance}</p>` : ''}
          <a id="pricing-return-link" href="${back.hash}" class="btn btn--stock btn--block">${back.label}</a>
        </div>
        <div class="plan plan--pro">
          <div class="plan__head"><p class="label">Pro</p><span class="chip">Monthly</span></div>
          <p class="plan__price">$9.99<span class="small"> / month</span></p>
          <p class="small muted">USD · renews monthly · cancel in your account</p>
          <ul class="tick-list">
            <li><span class="tick">✓</span><span>Unlimited PDF batches while subscribed</span></li>
            <li><span class="tick">✓</span><span>Everything in Free</span></li>
            <li><span class="tick">✓</span><span>Invoices and billing controls in your account</span></li>
          </ul>
          <button type="button" id="pricing-upgrade-btn" class="btn btn--primary btn--block" ${!data.configured && !isPro() ? 'disabled' : ''}>${isPro() ? 'Manage subscription' : data.configured ? 'Upgrade to Pro' : 'Checkout unavailable'}</button>
        </div>
      </div>
      ${!data.configured ? `<p class="note">Pro checkout is not available yet. ${summary.unavailable}</p>` : data.mode === 'test' ? '<p class="note">Test checkout is enabled. Real subscriptions are not available yet.</p>' : ''}
      <div class="stack stack--xs">
        <h2>What counts as a batch?</h2>
        <p>One successfully generated PDF uses one free batch, whether it contains one label or 200. Re-downloading that PDF is free. Failed exports do not use a batch.</p>
        <p>The 10 free batches are a one-time allowance per account. Pro has no monthly batch quota. Both plans allow up to 200 labels per batch and 30 export requests per hour to keep the service responsive.</p>
        <p>Saved projects, seven-day downloads, and an ad-free workspace are included on both plans. Cancel Pro through Manage billing; access continues through the period already paid for.</p>
      </div>
    </section>`;
  mount.querySelector('#pricing-return-link').addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateInPlace(back.hash);
  });
  mount.querySelector('#pricing-upgrade-btn').addEventListener('click', event => {
    if (isPro()) { window.location.href = '/billing'; return; }
    startCheckout('monthly', event.currentTarget);
  });
  if (focusRequested && !document.getElementById('mode-pricing').classList.contains('hidden')) {
    mount.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  focusRequested = false;
}
async function attempt(button) {
  if (starting) return;
  starting = true;
  if (button) { button.disabled = true; button.textContent = 'Opening checkout…'; }
  try {
    const data = await api('/api/billing/checkout', { method: 'POST', body: { plan: 'monthly' } });
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout destination.');
    window.location.href = url.href;
  } catch (err) {
    if (err.status === 401) {
      addAfterAuth(() => startCheckout('monthly', null));
      openAuthModal({ mode: 'signin', intent: 'upgrade' });
    } else if (err.code === 'subscription_exists') {
      toast(err.message); window.location.href = '/billing';
    } else toast(err.message || 'Checkout is unavailable. Please try again.', { kind: 'error' });
  } finally {
    starting = false;
    if (button) { button.disabled = false; button.textContent = 'Upgrade to Pro'; }
  }
}
export function startCheckout(_plan, button) {
  if (!isSignedIn()) {
    addAfterAuth(() => startCheckout('monthly', null));
    openAuthModal({ mode: 'signin', intent: 'upgrade' }); return;
  }
  return attempt(button);
}
export function initPricing() {
  if (initialized) return;
  initialized = true;
  onSessionChange(() => {
    const section = document.getElementById('mode-pricing');
    if (section && !section.classList.contains('hidden')) renderPricing();
  });
}
