// Billing domain: Stripe subscription billing over plain REST (no SDK) — pricing config,
// Checkout Session, Customer Portal, and signature-verified idempotent webhooks driving
// the entitlement state machine (entitlements.js stays the single authority).
// Secrets arrive via env (wrangler secrets / .dev.vars) — never wrangler.toml.

import { ok, json, readJson, HttpError } from './http.js';
import { now, timingSafeEqual } from './db.js';
import { getSessionUser } from './auth.js';
import { isProActive } from './entitlements.js';

const STRIPE_API = 'https://api.stripe.com';
const WEBHOOK_TOLERANCE_S = 300;
const WEBHOOK_MAX_BYTES = 1024 * 1024;

// ---------- Stripe REST helpers ----------

export class StripeError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.stripeCode = code;
  }
}

// form-encoded bodies (URLSearchParams), JSON responses; non-2xx throws {status, code}.
// Logs carry the error code only — response bodies may contain account data.
async function stripeRequest(env, method, path, params) {
  const init = { method, headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } };
  if (params !== undefined) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(`${STRIPE_API}${path}`, init);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body -> handled by the !res.ok branch or returned as null
  }
  if (!res.ok) {
    const code = String((data && data.error && (data.error.code || data.error.type)) || `http_${res.status}`);
    console.error(`stripe ${path} -> ${res.status} ${code}`);
    throw new StripeError(res.status, code);
  }
  return data;
}

function wrapUpstream(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(502, 'stripe_upstream_error', 'The payment provider could not be reached. Try again shortly.');
    }
  };
}

function billingConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

// ---------- GET /api/config/pricing ----------

// Per-isolate cache (Workers memory): a warm isolate serves prices without refetching.
const priceCache = new Map();

async function publicPrice(env, priceId) {
  if (!priceId) return null;
  if (priceCache.has(priceId)) return priceCache.get(priceId);
  const price = await stripeRequest(env, 'GET', `/v1/prices/${encodeURIComponent(priceId)}?expand[]=product`);
  const product = price.product && typeof price.product === 'object' ? price.product : null;
  const shape = {
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring && price.recurring.interval ? price.recurring.interval : null,
    product_name: product && product.name ? product.name : null,
  };
  priceCache.set(priceId, shape);
  return shape;
}

async function pricingConfig(env) {
  if (!billingConfigured(env)) return ok({ configured: false });
  if (!env.STRIPE_PRICE_MONTHLY || !env.STRIPE_PRICE_ANNUAL) {
    return json({ ok: true, configured: false, error: 'prices_not_configured' });
  }
  try {
    const [monthly, annual] = await Promise.all([
      publicPrice(env, env.STRIPE_PRICE_MONTHLY),
      publicPrice(env, env.STRIPE_PRICE_ANNUAL),
    ]);
    return ok({ configured: true, monthly, annual });
  } catch (err) {
    console.error(`pricing fetch failed: ${err.stripeCode || err.message}`);
    return json({ ok: true, configured: false, error: 'price_fetch_failed' });
  }
}

// ---------- POST /api/billing/checkout ----------

async function checkout(request, env) {
  const session = await getSessionUser(env, request);
  if (!session) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  if (!billingConfigured(env)) {
    throw new HttpError(503, 'billing_not_configured', 'Billing is not configured yet.');
  }
  const body = await readJson(request);
  const plan = body.plan;
  const planName = plan === 'monthly' || plan === 'annual' ? plan : null;
  if (!planName) throw new HttpError(400, 'invalid_plan', 'plan must be "monthly" or "annual".');
  const priceId = planName === 'monthly' ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_ANNUAL;
  if (!priceId) throw new HttpError(503, 'billing_not_configured', 'Billing is not configured yet.');

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.id).first();
  if (!user) throw new HttpError(401, 'unauthorized', 'Not signed in.');

  return wrapUpstream(async () => {
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeRequest(env, 'POST', '/v1/customers', {
        email: user.email,
        'metadata[user_id]': user.id,
      });
      customerId = customer.id;
      await env.DB.prepare('UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?')
        .bind(customerId, now(), user.id)
        .run();
    }
    const origin = new URL(request.url).origin;
    const cs = await stripeRequest(env, 'POST', '/v1/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      client_reference_id: user.id,
      'metadata[user_id]': user.id,
      customer: customerId,
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/pricing`,
    });
    return ok({ url: cs.url });
  })();
}

// ---------- POST /api/billing/portal ----------

async function portal(request, env) {
  const session = await getSessionUser(env, request);
  if (!session) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  if (!billingConfigured(env)) {
    throw new HttpError(503, 'billing_not_configured', 'Billing is not configured yet.');
  }
  const user = await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').bind(session.id).first();
  if (!user || !user.stripe_customer_id) {
    throw new HttpError(400, 'no_customer', 'No billing account for this user yet. Start a subscription first.');
  }
  const origin = new URL(request.url).origin;
  return wrapUpstream(async () => {
    const ps = await stripeRequest(env, 'POST', '/v1/billing_portal/sessions', {
      customer: user.stripe_customer_id,
      return_url: `${origin}/billing`,
    });
    return ok({ url: ps.url });
  })();
}

// ---------- POST /api/webhooks/stripe ----------

function parseSignatureHeader(header) {
  const out = { t: null, v1: [] };
  for (const part of String(header || '').split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') out.t = v;
    else if (k === 'v1') out.v1.push(v);
  }
  return out;
}

function hexOf(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Stripe scheme: HMAC-SHA256(secret, `${t}.${body}`) hex, constant-time vs any v1; |now-t| <= 300s.
async function verifyStripeSignature(secret, header, body) {
  const { t, v1 } = parseSignatureHeader(header);
  const tNum = Number(t);
  if (!t || !Number.isFinite(tNum) || v1.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - tNum) > WEBHOOK_TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  const expected = new TextEncoder().encode(hexOf(mac));
  for (const sig of v1) {
    const provided = new TextEncoder().encode(String(sig).toLowerCase());
    if (timingSafeEqual(expected, provided)) return true;
  }
  return false;
}

// Single entitlement-state transition: user row + Stripe subscription object -> synced row.
// plan is derived from the SAME predicate that gates access — no divergence possible.
// Stripe sends current_period_end as unix SECONDS; the column stores ms (like every
// timestamp here), so convert. Handles both sub.current_period_end and items[0].current_period_end.
async function applySubscriptionState(db, userId, sub) {
  let periodEnd = null;
  if (typeof sub.current_period_end === 'number') periodEnd = sub.current_period_end;
  else if (sub.items && Array.isArray(sub.items.data) && sub.items.data[0] && typeof sub.items.data[0].current_period_end === 'number') {
    periodEnd = sub.items.data[0].current_period_end;
  }
  const paidThrough = periodEnd === null ? null : periodEnd * 1000;
  const plan = isProActive({ subscription_status: sub.status, paid_through: paidThrough }) ? 'pro' : 'free';
  await db
    .prepare(
      'UPDATE users SET stripe_subscription_id = ?, subscription_status = ?, paid_through = ?, plan = ?, updated_at = ? WHERE id = ?'
    )
    .bind(sub.id, sub.status, paidThrough, plan, now(), userId)
    .run();
}

async function handleCheckoutCompleted(env, session) {
  const userId = (session.metadata && session.metadata.user_id) || session.client_reference_id;
  if (!userId) return 'no_matching_user';
  const user = await env.DB.prepare('SELECT id, stripe_customer_id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return 'no_matching_user';

  if (!user.stripe_customer_id) {
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?')
      .bind(session.customer, now(), user.id)
      .run();
  } else if (user.stripe_customer_id !== session.customer) {
    // Anti-hijack: a user bound to customer A is NEVER relinked to customer B.
    return 'customer_mismatch_ignored';
  }

  let sub = session.subscription;
  if (typeof sub === 'string') {
    try {
      sub = await stripeRequest(env, 'GET', `/v1/subscriptions/${encodeURIComponent(sub)}`);
    } catch (err) {
      // The accompanying customer.subscription.* event carries the same state —
      // don't fail this delivery over the fetch; state lands via the lifecycle event.
      return 'customer_bound_subscription_fetch_deferred';
    }
  }
  if (sub && typeof sub === 'object' && sub.id) await applySubscriptionState(env.DB, user.id, sub);
  return 'ok';
}

async function handleSubscriptionChange(env, sub) {
  let user = await env.DB.prepare('SELECT id FROM users WHERE stripe_subscription_id = ?').bind(sub.id).first();
  if (!user && sub.customer) {
    const rows = await env.DB.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').bind(sub.customer).all();
    const list = rows.results || [];
    if (list.length === 1) user = list[0];
  }
  if (!user) return 'no_matching_user';
  await applySubscriptionState(env.DB, user.id, sub);
  return 'ok';
}

async function handlePaymentFailed(env, invoice) {
  let user = null;
  if (invoice.subscription) {
    user = await env.DB.prepare('SELECT id, paid_through FROM users WHERE stripe_subscription_id = ?')
      .bind(invoice.subscription)
      .first();
  }
  if (!user && invoice.customer) {
    const rows = await env.DB.prepare('SELECT id, paid_through FROM users WHERE stripe_customer_id = ?')
      .bind(invoice.customer)
      .all();
    const list = rows.results || [];
    if (list.length === 1) user = list[0];
  }
  if (!user) return 'no_matching_user';
  // Access continues through paid_through under the new entitlement semantics.
  const plan = isProActive({ subscription_status: 'past_due', paid_through: user.paid_through }) ? 'pro' : 'free';
  await env.DB.prepare('UPDATE users SET subscription_status = ?, plan = ?, updated_at = ? WHERE id = ?')
    .bind('past_due', plan, now(), user.id)
    .run();
  return 'ok';
}

async function handleEvent(env, event) {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(env, event.data.object);
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return handleSubscriptionChange(env, event.data.object);
    case 'invoice.payment_failed':
      return handlePaymentFailed(env, event.data.object);
    default:
      return 'ignored';
  }
}

async function stripeWebhook(request, env) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > WEBHOOK_MAX_BYTES) throw new HttpError(413, 'payload_too_large', 'Webhook body too large.');

  const body = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature');
  const verified =
    env.STRIPE_WEBHOOK_SECRET && sigHeader && (await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, sigHeader, body));
  if (!verified) throw new HttpError(400, 'invalid_signature', 'Webhook signature verification failed.');

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    throw new HttpError(400, 'invalid_json', 'Webhook body must be JSON.');
  }
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') {
    throw new HttpError(400, 'invalid_event', 'Malformed Stripe event.');
  }

  // Idempotency: first delivery claims the event id. A redelivery short-circuits as a
  // duplicate UNLESS the first attempt errored — Stripe retries those, so the claim is
  // released for reprocessing (result LIKE 'error:%').
  const ins = await env.DB.prepare(
    'INSERT OR IGNORE INTO webhook_events (event_id, type, payload_json, processed_at) VALUES (?,?,?,?)'
  )
    .bind(event.id, event.type, body, now())
    .run();
  if (!ins.meta || ins.meta.changes === 0) {
    const prior = await env.DB.prepare('SELECT result FROM webhook_events WHERE event_id = ?').bind(event.id).first();
    if (!prior || !(typeof prior.result === 'string' && prior.result.startsWith('error:'))) {
      return ok({ duplicate: true });
    }
  }

  let result;
  try {
    result = await handleEvent(env, event);
  } catch (err) {
    const code = err instanceof HttpError ? err.code : String(err.stripeCode || 'handler_error');
    await env.DB.prepare('UPDATE webhook_events SET result = ? WHERE event_id = ?').bind(`error: ${code}`, event.id).run();
    console.error(`webhook ${event.type} failed: ${code}`);
    return json({ error: { code: 'webhook_handler_failed', message: 'Webhook processing failed; delivery will be retried.' } }, 500);
  }
  await env.DB.prepare('UPDATE webhook_events SET result = ? WHERE event_id = ?').bind(result, event.id).run();
  return ok({ result });
}

// ---------- route table (wired by src/worker.js) ----------

export async function handleBillingApi(request, env, path) {
  const route = `${request.method} ${path}`;
  switch (route) {
    case 'GET /api/config/pricing':
      return pricingConfig(env);
    case 'POST /api/billing/checkout':
      return checkout(request, env);
    case 'POST /api/billing/portal':
      return portal(request, env);
    case 'POST /api/webhooks/stripe':
      return stripeWebhook(request, env);
    default:
      throw new HttpError(404, 'not_found', 'Not found.');
  }
}
