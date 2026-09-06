import { ok, readText, HttpError } from './http.js';
import { timingSafeEqual } from './db.js';
import { stripeMode } from './stripe-client.js';
import { syncSubscription } from './subscriptions.js';
const idOf = value => typeof value === 'string' ? value : value?.id;
export async function verifyStripeSignature(secret, header, body) {
  if (!secret || !header) return false;
  const parts = header.split(',').map(p => p.trim().split('='));
  const t = parts.find(([key]) => key === 't')?.[1];
  if (!/^\d+$/.test(t || '') || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  const expected = new TextEncoder().encode([...bytes].map(b => b.toString(16).padStart(2, '0')).join(''));
  return parts.some(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value || '') &&
    timingSafeEqual(expected, new TextEncoder().encode(value.toLowerCase())));
}
async function applyEvent(env, event) {
  const object = event.data.object;
  let subscription;
  if (event.type.startsWith('customer.subscription.')) subscription = object.id;
  else if (event.type === 'checkout.session.completed') subscription = idOf(object.subscription);
  else subscription = idOf(object.subscription || object.parent?.subscription_details?.subscription);
  const customer = idOf(object.customer);
  if (!subscription || !customer) return 'no_subscription';
  return syncSubscription(env, subscription, customer, event.created);
}
const TYPES = new Set(['checkout.session.completed', 'customer.subscription.created',
  'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed']);
export async function stripeWebhook(request, env) {
  const body = await readText(request, 1024 * 1024);
  if (!await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, request.headers.get('Stripe-Signature'), body)) {
    throw new HttpError(400, 'invalid_signature', 'Webhook signature verification failed.');
  }
  let event;
  try { event = JSON.parse(body); } catch { throw new HttpError(400, 'invalid_event', 'Invalid event.'); }
  if (!event || typeof event.id !== 'string' || !event.id.startsWith('evt_') ||
      !Number.isSafeInteger(event.created) || !event.data?.object || typeof event.livemode !== 'boolean') {
    throw new HttpError(400, 'invalid_event', 'Invalid event.');
  }
  if (event.livemode !== (stripeMode(env) === 'live')) throw new HttpError(400, 'mode_mismatch', 'Webhook mode mismatch.');
  if (!TYPES.has(event.type)) return ok({ result: 'ignored' });
  const t = Date.now();
  const result = `processing:${crypto.randomUUID()}`;
  const claimed = await env.DB.prepare(`INSERT INTO webhook_events (event_id,type,payload_json,processed_at,result) VALUES (?,?,?,?,?)
    ON CONFLICT(event_id) DO UPDATE SET processed_at=excluded.processed_at, result=excluded.result
    WHERE webhook_events.result LIKE 'error:%' OR
      (webhook_events.result IS NULL AND webhook_events.processed_at < ?) OR
      (webhook_events.result LIKE 'processing:%' AND webhook_events.processed_at < ?)
    RETURNING event_id`).bind(event.id, event.type, JSON.stringify({ id: event.id, type: event.type, created: event.created }), t, result, t - 60000, t - 60000).first();
  if (!claimed) {
    const prior = await env.DB.prepare('SELECT result FROM webhook_events WHERE event_id = ?').bind(event.id).first();
    if (!prior?.result || prior.result.startsWith('processing:')) throw new HttpError(503, 'webhook_busy', 'Delivery is processing.');
    return ok({ duplicate: true });
  }
  try {
    const outcome = await applyEvent(env, event);
    await env.DB.prepare('UPDATE webhook_events SET result = ? WHERE event_id = ? AND result = ?').bind(outcome, event.id, result).run();
    return ok({ result: outcome });
  } catch {
    await env.DB.prepare('UPDATE webhook_events SET result = ? WHERE event_id = ? AND result = ?').bind('error:processing_failed', event.id, result).run();
    console.error(JSON.stringify({ event: 'webhook_failed', id: event.id, type: event.type }));
    throw new HttpError(503, 'webhook_handler_failed', 'Delivery will be retried.');
  }
}
