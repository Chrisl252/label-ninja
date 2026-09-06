import { ok, readJson, HttpError } from './http.js';
import { getSessionUser } from './auth.js';
import { enforceUserRateLimit } from './ratelimit.js';
import { appOrigin } from './security.js';
import { stripeRequest } from './stripe-client.js';
import { monthlyPrice } from './billing-config.js';
import { syncSubscription } from './subscriptions.js';
const idOf = value => typeof value === 'string' ? value : value?.id;
async function userFor(request, env) {
  const session = await getSessionUser(env, request);
  if (!session) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  await enforceUserRateLimit(env.DB, session.id, 'billing', 20);
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.id).first();
}
export async function checkout(request, env) {
  const user = await userFor(request, env);
  const body = await readJson(request);
  if (body.plan !== 'monthly') throw new HttpError(400, 'invalid_plan', 'Choose the monthly plan.');
  await monthlyPrice(env);
  let customer = user.stripe_customer_id;
  if (!customer) {
    const created = await stripeRequest(env, 'POST', '/v1/customers', {
      email: user.email, 'metadata[label_ninja_user_id]': user.id,
    }, `ln-customer-${user.id}`);
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ? AND stripe_customer_id IS NULL').bind(created.id, user.id).run();
    customer = (await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').bind(user.id).first()).stripe_customer_id;
  }
  const subscriptions = await stripeRequest(env, 'GET', `/v1/subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=100`);
  if (subscriptions.has_more || subscriptions.data?.some(s =>
    !['canceled', 'incomplete_expired'].includes(s.status) &&
    s.items?.data?.some(item => item.price?.id === env.STRIPE_PRICE_MONTHLY))) {
    throw new HttpError(409, 'subscription_exists', 'You already have a subscription. Use Manage billing.');
  }
  let attempt = await env.DB.prepare('SELECT * FROM checkout_attempts WHERE user_id = ?').bind(user.id).first();
  if (attempt?.session_id) {
    const prior = await stripeRequest(env, 'GET', `/v1/checkout/sessions/${encodeURIComponent(attempt.session_id)}`);
    if (prior.status === 'open') return ok({ url: prior.url });
    if (prior.status === 'complete') {
      const purchased = subscriptions.data?.find(s => s.id === idOf(prior.subscription));
      if (!purchased || !['canceled', 'incomplete_expired'].includes(purchased.status)) {
        throw new HttpError(409, 'subscription_exists', 'Checkout has completed. Open your account to check access.');
      }
      // A completed checkout must not prevent buying again after cancellation.
      // The provider list above has already ruled out another active purchase.
      await syncSubscription(env, purchased.id, customer);
      const latest = await env.DB.prepare('SELECT paid_through FROM users WHERE id = ?').bind(user.id).first();
      if (latest.paid_through > Date.now()) {
        throw new HttpError(409, 'subscription_exists', 'Your paid access has not ended yet. Open Manage billing or contact support.');
      }
    }
    await env.DB.prepare('DELETE FROM checkout_attempts WHERE user_id = ? AND attempt_id = ?').bind(user.id, attempt.attempt_id).run();
    attempt = null;
  }
  // Ambiguous outcomes keep the same provider idempotency key.
  if (!attempt) {
    await env.DB.prepare('INSERT OR IGNORE INTO checkout_attempts (user_id, attempt_id, created_at) VALUES (?,?,?)')
      .bind(user.id, crypto.randomUUID(), Date.now()).run();
    attempt = await env.DB.prepare('SELECT * FROM checkout_attempts WHERE user_id = ?').bind(user.id).first();
  }
  if (Date.now() - attempt.created_at > 23 * 3600000) {
    throw new HttpError(503, 'checkout_needs_reconciliation', 'Please contact support to resume checkout.');
  }
  const cs = await stripeRequest(env, 'POST', '/v1/checkout/sessions', {
    mode: 'subscription', customer, client_reference_id: user.id,
    'metadata[label_ninja_user_id]': user.id, 'subscription_data[metadata][label_ninja_user_id]': user.id,
    'line_items[0][price]': env.STRIPE_PRICE_MONTHLY, 'line_items[0][quantity]': '1',
    'consent_collection[terms_of_service]': 'required',
    success_url: `${appOrigin(env)}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appOrigin(env)}/pricing`,
  }, `ln-checkout-${attempt.attempt_id}`);
  await env.DB.prepare('UPDATE checkout_attempts SET session_id = ? WHERE user_id = ? AND attempt_id = ?')
    .bind(cs.id, user.id, attempt.attempt_id).run();
  return ok({ url: cs.url });
}
export async function portal(request, env) {
  const user = await userFor(request, env);
  if (!user.stripe_customer_id) throw new HttpError(400, 'no_customer', 'No subscription yet. Start from Pricing.');
  const session = await stripeRequest(env, 'POST', '/v1/billing_portal/sessions', {
    customer: user.stripe_customer_id, return_url: `${appOrigin(env)}/billing`,
  }, `ln-portal-${user.id}-${Math.floor(Date.now() / 300000)}`);
  return ok({ url: session.url });
}
export async function confirmCheckout(request, env) {
  const user = await userFor(request, env);
  const body = await readJson(request);
  if (!/^cs_[A-Za-z0-9_]+$/.test(body.session_id || '')) throw new HttpError(400, 'invalid_session', 'Invalid checkout reference.');
  const cs = await stripeRequest(env, 'GET', `/v1/checkout/sessions/${encodeURIComponent(body.session_id)}`);
  if (idOf(cs.customer) !== user.stripe_customer_id || cs.client_reference_id !== user.id) throw new HttpError(404, 'not_found', 'Checkout not found.');
  if (cs.status !== 'complete' || !idOf(cs.subscription)) return ok({ pending: true });
  await syncSubscription(env, idOf(cs.subscription), user.stripe_customer_id);
  return ok({ pending: false });
}
