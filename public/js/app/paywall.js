// Paywall — 402 free_limit_reached modal. Never touches tool state: the user's
// work is exactly as they left it. Price area renders from /api/config/pricing.

import { api } from './api.js';
import { openPricingInPlace } from './workspace-navigation.js';

let initialized = false;

function el(id) {
  return document.getElementById(id);
}

async function renderPricing() {
  const area = el('paywall-pricing');
  area.innerHTML = '<p class="small muted">Checking Pro pricing…</p>';
  try {
    const data = await api('/api/config/pricing');
    if (data && data.configured && data.monthly) {
      area.textContent = '$9.99 USD/month · unlimited PDF batches · cancel anytime.';
      return;
    }
  } catch {
    // degrade to the unconfigured message below
  }
  area.innerHTML = `
    <p class="small"><strong>Pro: $9.99 USD/month</strong></p>
    <p class="small muted">Checkout is currently unavailable. Your design remains open in this tab.</p>`;
}

export function openPaywall() {
  const modal = el('paywall-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  renderPricing();
  const back = el('paywall-back');
  if (back) back.focus();
}

export function closePaywall() {
  const modal = el('paywall-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

export function initPaywall() {
  if (initialized) return;
  initialized = true;
  el('paywall-close').addEventListener('click', closePaywall);
  el('paywall-back').addEventListener('click', closePaywall);
  el('paywall-modal').addEventListener('click', (event) => {
    if (event.target === el('paywall-modal')) closePaywall();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el('paywall-modal').classList.contains('hidden')) closePaywall();
  });
  el('paywall-upgrade').addEventListener('click', (event) => {
    event.preventDefault();
    closePaywall();
    openPricingInPlace();
  });
}
