# Label Ninja system reference

- Canonical code: C:\Code\label-ninja
- GitHub: https://github.com/Chrisl252/label-ninja ; branch master
- Local full-stack preview: http://127.0.0.1:8787 (npm run dev)
- Production Worker: https://label-ninja.com and https://www.label-ninja.com
- Historical static mirror: https://label-ninja.pages.dev ; not a full-stack release target
- Worker configuration: wrangler.toml, src/worker.js, public ASSETS, nodejs_compat
- D1: label-ninja-db / 852d3ccd-83b6-4ab9-9c39-49a1cf77b88b / binding DB
- Local D1: .wrangler/state/v3/d1 ; do not confuse --local and --remote
- Runtime dependency: pdf-lib; browser JsBarcode/PapaParse remain CDN-loaded
- Scheduler: */15 * * * * ; cleanup is bounded, monitor backlog

## Secrets and provider configuration

| Name | Purpose |
| --- | --- |
| STRIPE_SECRET_KEY | Project-scoped Stripe API access; keep test and live separate |
| STRIPE_WEBHOOK_SECRET | Signing secret for this environment's webhook destination |
| STRIPE_PRICE_MONTHLY | Active $9.99 USD recurring monthly price in the same mode |
| RESEND_API_KEY | Transactional recovery email |
| EMAIL_FROM | Sender address on a verified sending domain |
| APP_ORIGIN | Non-secret canonical origin; production https://label-ninja.com |

Local secrets belong in ignored .dev.vars. Production values belong in the Worker secret store, entered through a secure prompt/dashboard. A Stripe publishable key is not needed for server-created hosted Checkout. No annual price is used.

A reusable credential directory was not created and the secret pasted in chat was not copied. Use a protected credential store for replacements; Obsidian/Jarvis may contain a path and purpose only, never values. Prefer separate restricted keys per project so one project's compromise does not expose every SaaS.

Read-only inspection on 2026-09-06 returned [] from wrangler secret list. The public pricing endpoint returned configured:false. No live price ID, portal configuration, sending domain, or payment lifecycle has been verified.

Stripe destination: /api/webhooks/stripe. Subscribe to checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed. Configure Stripe's public terms URL /terms, privacy URL /privacy, and Customer Portal cancellation/payment-method/invoice features. Checkout requires terms consent.

## Capacity

The workerd password test runs 600,000 PBKDF2-SHA256 iterations in about 209 ms on this PC. Production CPU usage is not measured; the Workers Free 10 ms CPU budget is not a safe assumption. Confirm a sufficient paid/runtime budget and test 200-page batches before collecting money. No hosting plan or spending change has been made.

D1 output cap is 12.5 MiB per PDF; images are limited to 4096 px/edge and 4 million decoded pixels across the batch, plus encoded-byte caps. Cleanup deletes at most 10 expired PDFs per scheduled invocation plus lazy sweeps. Watch storage/backlog and provision larger throughput as actual volume grows.
