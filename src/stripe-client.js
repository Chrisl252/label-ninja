// Bounded Stripe transport. Credentials and provider response bodies never enter logs.
import { HttpError } from './http.js';
export async function stripeRequest(env, method, path, params, idempotencyKey) {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, 'billing_not_configured', 'Checkout is temporarily unavailable.');
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const init = { method, headers, signal: AbortSignal.timeout(10000) };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (params !== undefined) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(params).toString();
  }
  try {
    const res = await fetch(`https://api.stripe.com${path}`, init);
    const data = await res.json();
    if (!res.ok || !data) throw new Error('provider_failed');
    return data;
  } catch {
    console.error(JSON.stringify({ event: 'stripe_request_failed', method, route: path.split('?')[0].split('/').slice(0, 3).join('/') }));
    throw new HttpError(502, 'stripe_upstream_error', 'The payment provider could not be reached. Try again shortly.');
  }
}
export function stripeMode(env) { return /^sk_live_/.test(env.STRIPE_SECRET_KEY || '') ? 'live' : 'test'; }
