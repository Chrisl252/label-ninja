// Signed events reconcile current provider state; failed renewals never extend paid access.
import { stripeRequest } from './stripe-client.js';
import { isProActive } from './entitlements.js';
import { HttpError } from './http.js';
export async function syncSubscription(env, subscriptionId, customerId, eventCreated = 0) {
  const sub = await stripeRequest(env, 'GET', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=latest_invoice`);
  const customer = typeof sub.customer === 'object' ? sub.customer.id : sub.customer;
  if (customer !== customerId) throw new HttpError(400, 'customer_mismatch', 'Subscription customer mismatch.');
  const items = sub.items?.data || [];
  if (items.length !== 1 || items[0].price?.id !== env.STRIPE_PRICE_MONTHLY) return 'other_product_ignored';
  const rows = await env.DB.prepare('SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 2').bind(customerId).all();
  if (rows.results?.length !== 1) return 'no_matching_user';
  const user = rows.results[0];
  if (eventCreated && eventCreated < user.billing_event_created) return 'stale_event_ignored';
  if (user.stripe_subscription_id && user.stripe_subscription_id !== sub.id) {
    const previous = await stripeRequest(env, 'GET', `/v1/subscriptions/${encodeURIComponent(user.stripe_subscription_id)}`);
    if (!['canceled', 'incomplete_expired'].includes(previous.status) || previous.created >= sub.created) return 'other_subscription_ignored';
  }
  const periodEnd = sub.current_period_end || items[0].current_period_end || 0;
  const invoice = sub.latest_invoice;
  const invoicePaid = invoice && typeof invoice === 'object' && invoice.status === 'paid';
  const paidThrough = Math.max(user.paid_through || 0, invoicePaid ? periodEnd * 1000 : 0) || null;
  const status = sub.status;
  const plan = isProActive({ subscription_status: status, paid_through: paidThrough }) ? 'pro' : 'free';
  const updated = await env.DB.prepare(`UPDATE users SET stripe_subscription_id = ?, subscription_status = ?, paid_through = ?,
    plan = ?, cancel_at_period_end = ?, billing_event_created = MAX(billing_event_created, ?), updated_at = ?
    WHERE id = ? AND billing_event_created = ? AND stripe_subscription_id IS ?
      AND subscription_status IS ? AND paid_through IS ? AND cancel_at_period_end = ?`)
    .bind(sub.id, status, paidThrough, plan, sub.cancel_at_period_end ? 1 : 0,
      eventCreated || user.billing_event_created, Date.now(), user.id, user.billing_event_created,
      user.stripe_subscription_id, user.subscription_status, user.paid_through, user.cancel_at_period_end).run();
  if (!updated.meta?.changes) throw new HttpError(503, 'billing_changed', 'Billing is updating. Please try again shortly.');
  return 'ok';
}
