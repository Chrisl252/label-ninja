// Billing registration; each domain has its own module.
import { HttpError } from './http.js';
import { pricingConfig } from './billing-config.js';
import { checkout, portal, confirmCheckout } from './billing-checkout.js';
import { stripeWebhook } from './stripe-webhook.js';
export async function handleBillingApi(request, env, path) {
  switch (`${request.method} ${path}`) {
    case 'GET /api/config/pricing': return pricingConfig(env);
    case 'POST /api/billing/checkout': return checkout(request, env);
    case 'POST /api/billing/portal': return portal(request, env);
    case 'POST /api/billing/confirm': return confirmCheckout(request, env);
    case 'POST /api/webhooks/stripe': return stripeWebhook(request, env);
    default: throw new HttpError(404, 'not_found', 'Not found.');
  }
}
