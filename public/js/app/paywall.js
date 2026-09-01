// Paywall — 402 free_limit_reached modal. Never touches tool state: the user's
// work is exactly as they left it. Price area renders from /api/config/pricing.

import { api } from './api.js';

let initialized = false;
let upgradeTarget = '#pricing';

function el(id) {
  return document.getElementById(id);
}

async function renderPricing() {
  const area = el('paywall-pricing');
  area.innerHTML = '<p class="text-xs text-slate-400">Checking Pro pricing…</p>';
  try {
    const data = await api('/api/config/pricing');
    if (data && data.configured && Array.isArray(data.plans) && data.plans.length) {
      const rows = data.plans
        .map((p) => `<div class="flex justify-between text-sm"><span class="text-slate-300">${p.name || 'Pro'}</span><span class="font-mono text-white">${p.price || ''}</span></div>`)
        .join('');
      area.innerHTML = rows;
      return;
    }
  } catch {
    // degrade to the unconfigured message below
  }
  area.innerHTML = `
    <p class="text-sm font-semibold text-white">Pro pricing coming soon — early access</p>
    <a href="mailto:chris@bisket.com?subject=Label%20Ninja%20Pro%20early%20access" class="mt-2 inline-flex rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Notify me when Pro launches</a>`;
}

export function openPaywall(upgradeUrl) {
  if (upgradeUrl) upgradeTarget = upgradeUrl;
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
    // Same-origin SPA: /pricing serves the app; the shell routes to the
    // pricing section in guides mode (see app.js path routing).
    if (upgradeTarget && upgradeTarget.startsWith('/') && !upgradeTarget.includes('#')) {
      window.location.href = upgradeTarget;
    } else {
      window.location.hash = '#pricing';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
}
