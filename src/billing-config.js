// Only the approved $9.99 USD/month offer can reach Checkout.
import { HttpError, ok } from './http.js';
import { stripeRequest, stripeMode } from './stripe-client.js';
export const OFFER = Object.freeze({ amount: 999, currency: 'usd', interval: 'month', product_name: 'Label Ninja Pro' });
export function billingConfigured(env) {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_MONTHLY);
}
export async function monthlyPrice(env) {
  if (!billingConfigured(env)) throw new HttpError(503, 'billing_not_configured', 'Checkout is temporarily unavailable.');
  const price = await stripeRequest(env, 'GET', `/v1/prices/${encodeURIComponent(env.STRIPE_PRICE_MONTHLY)}?expand[]=product`);
  if (price.unit_amount !== OFFER.amount || price.currency !== OFFER.currency ||
      price.type !== 'recurring' || price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1 || !price.active || !price.product?.active ||
      price.billing_scheme !== 'per_unit' || price.recurring.usage_type !== 'licensed' ||
      price.livemode !== (stripeMode(env) === 'live')) {
    throw new HttpError(503, 'price_mismatch', 'Checkout is temporarily unavailable.');
  }
  return { ...OFFER };
}
export async function pricingConfig(env) {
  const base = { monthly: OFFER, mode: stripeMode(env), free_batches: 10, batch_page_limit: 200, exports_per_hour: 30 };
  if (!billingConfigured(env)) return ok({ ...base, configured: false, error: 'billing_not_configured' });
  try { return ok({ ...base, configured: true, monthly: await monthlyPrice(env) }); }
  catch (err) { return ok({ ...base, configured: false, error: err.code || 'price_fetch_failed' }); }
}
