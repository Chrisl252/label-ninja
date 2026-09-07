// Regression: viewing Pro must never reload an unsaved label or promise spent credits.
import assert from 'node:assert/strict';
import { pricingSummary } from '../public/js/app/plan.js';
import { rememberWorkspace, pricingReturn, navigateInPlace } from '../public/js/app/workspace-navigation.js';
import { modeFromHash } from '../public/js/app/guides.js';
import { openPaywall, initPaywall } from '../public/js/app/paywall.js';
import { renderPricing, initPricing } from '../public/js/app/pricing.js';
import { applyUser } from '../public/js/app/session.js';

let checks = 0;
function check(condition, message) { assert.ok(condition, message); console.log('PASS ' + message); checks++; }
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) {
    const classes = new Set();
    nodes.set(id, { innerHTML: '', textContent: '', handlers: {},
      classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) },
      addEventListener(type, fn) { this.handlers[type] = fn; }, focus() {},
      querySelector(selector) { return node(selector.replace(/^#/, '')); },
    });
  }
  return nodes.get(id);
}
const savedGlobals = new Map(['window', 'document', 'fetch', 'HashChangeEvent'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const location = { hash: '#editor', pathname: '/', search: '?stock=1x0.5' };
let reloads = 0;
let routeEvents = 0;
let scrolls = 0;
Object.defineProperty(location, 'href', { set() { reloads++; } });
globalThis.window = { location, dispatchEvent() { routeEvents++; }, scrollTo() { scrolls++; } };
globalThis.document = { getElementById: node, body: node('body'), addEventListener() {} };
globalThis.HashChangeEvent = class { constructor(type) { this.type = type; } };
let response = { configured: false };
globalThis.fetch = async () => Response.json(response);
const click = id => node(id).handlers.click({ preventDefault() {}, currentTarget: node(id) });
const freeUser = remaining => ({ free_uses: { remaining, granted: 10, unlimited: false } });
try {
  check(pricingReturn().label === 'Start creating labels', 'direct pricing visit offers a starting point');
  initPaywall();
  for (const mode of ['editor', 'bin', 'whatnot', 'fnsku']) {
    rememberWorkspace(mode);
    rememberWorkspace('pricing');
    const back = pricingReturn();
    location.hash = back.hash;
    openPaywall('/pricing'); // Actual API error destination that previously reloaded.
    click('paywall-upgrade');
    check(reloads === 0 && location.hash === '#pricing' && node('paywall-modal').classList.contains('hidden'), `${mode}: paywall opens pricing without a document navigation`);
    navigateInPlace(back.hash);
    check(modeFromHash(location.hash) === mode, `${mode}: return targets the original workspace`);
  }
  const events = routeEvents;
  location.hash = '#pricing';
  openPaywall('/pricing');
  click('paywall-upgrade');
  check(routeEvents === events + 1 && reloads === 0, 'already-pricing hash still opens pricing without reload');
  rememberWorkspace('__proto__');
  navigateInPlace('https://untrusted.example/');
  check(location.hash === '#pricing' && pricingReturn().hash.includes('fnsku'), 'unknown destinations cannot replace the return workspace');
  check(location.pathname === '/' && location.search === '?stock=1x0.5', 'in-tab navigation preserves the document and incoming settings URL');

  check(pricingSummary(null).heading === 'Your first 10 batches are free.', 'visitor sees the approved free offer');
  check(pricingSummary(freeUser(1)).heading === 'You have 1 free batch left.', 'one remaining batch uses the actual balance');
  check(pricingSummary(freeUser(0)).heading === 'You’ve used your 10 free batches.', 'exhausted customer is not promised ten more batches');
  check(!pricingSummary({ free_uses: { remaining: '<script>', granted: 10 } }).heading.includes('<script>'), 'untrusted balance cannot inject pricing markup');
  check(pricingSummary({}).balance.includes('Check your account'), 'missing balance is not treated as a fresh allowance');

  applyUser(freeUser(0));
  await renderPricing({ focus: true });
  let html = node('pricing-mount').innerHTML;
  check(html.includes('0 of 10 free batches left') && !html.includes('You can use your 10 free batches now'), 'rendered exhausted pricing tells the truth while checkout is unavailable');
  check(html.includes('Checkout unavailable') && html.includes('disabled'), 'unconfigured checkout remains disabled');
  check(scrolls === 1 && html.includes('tabindex="-1"'), 'entering pricing presents the heading and top of the offer');
  const prior = routeEvents;
  location.hash = pricingReturn().hash;
  click('pricing-return-link');
  check(routeEvents === prior + 1 && reloads === 0, 'return link works when tab navigation left the same URL hash');
  applyUser({ free_uses: { unlimited: true } });
  await renderPricing();
  html = node('pricing-mount').innerHTML;
  check(html.includes('Manage subscription') && !html.match(/id="pricing-upgrade-btn"[^>]*disabled/), 'current Pro customer retains account access during a pricing outage');

  initPricing();
  initPricing();
  applyUser(freeUser(2));
  await new Promise(resolve => setImmediate(resolve));
  check(node('pricing-mount').innerHTML.includes('2 of 10 free batches left'), 'session bootstrap updates pricing instead of leaving the visitor offer');
  check(scrolls === 1, 'background session updates do not scroll the customer away from their place');
  let releaseOld;
  globalThis.fetch = () => new Promise(resolve => { releaseOld = () => resolve(Response.json({ configured: true })); });
  const oldRender = renderPricing();
  globalThis.fetch = async () => Response.json({ configured: false });
  await renderPricing();
  releaseOld();
  await oldRender;
  check(node('pricing-mount').innerHTML.includes('Checkout unavailable'), 'late stale pricing response cannot re-enable checkout');
  console.log(`${checks} upgrade journey checks passed`);
} finally {
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
}
