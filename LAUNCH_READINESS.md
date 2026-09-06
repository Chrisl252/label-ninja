# Label Ninja launch readiness

Status: local hardening complete; paid production launch blocked. Updated 2026-09-06. No live code, payment configuration, hosting plan, or customer data was changed during this audit.

## Confirmed offer

Chris confirmed 10 PDF batches total. A PDF containing 1 or 200 labels consumes one free batch. Failed generation consumes no batch; an available PDF may be re-downloaded without another charge. Pro is $9.99 USD/month with unlimited batches during paid access, subject to the disclosed 200-page and 30-request/hour safeguards. There is no annual plan.

## Audit findings addressed locally

| Severity | Finding | Fix and evidence |
| --- | --- | --- |
| High | Duplicate/concurrent exports could miscount credits; expiry could reopen a free allowance path | Atomic D1 claim/reservation, content hash, immutable completed/expired keys, race and expiry tests |
| High | A lost commit response or abandoned render could leave charging/output state inconsistent | Guarded chunk commit and compensation; interrupted-render recovery; failure-injection tests |
| High | Subscription status alone could grant Pro indefinitely | Paid-through required for all eligible states; missed/failed renewals and cancellation tests |
| High | Duplicate checkout and stale/retried billing events could corrupt customer access | Stable provider keys, saved attempts, duplicate purchase guard, current-state reconciliation, optimistic update, leased webhook claims |
| High | Saved project names reached HTML without escaping | Shared HTML encoder at dashboard and account sinks; ownership and XSS regression |
| High | Password recovery could log tokens instead of delivering email, and reset reuse was not atomic | Removed log fallback, configured provider only, bounded canonical email delivery, atomic reset and session revocation |
| Medium | Password work factor was 100,000 PBKDF2 iterations | Native crypto 600,000; compatible old-hash verification and upgrade-on-login; workerd proof |
| Medium | Cross-origin mutation/body handling and API caching were not explicit | Same-origin guard, JSON/byte caps, private no-store API responses, security headers |
| Medium | Image dimensions were trusted before decompression | Header-only dimension checks, total decoded-pixel cap; reject before reserving quota |
| Medium | Checkout/account deep links raced session bootstrap | Preserve requested account route through sign-in; tested in Chrome |
| Medium | Mobile signed-in header overlapped and hid account access | Responsive account/action layout; phone-width browser check |
| Medium | UI advertised unfinished conversion/import and exposed SEO planning text | Removed unsupported claims, rewrote guide section for actual label workflows |

## Completed verification

- npm test: 61 spec-builder checks, DOM/handler contract (42 queried IDs, 18 handlers, 123 unique page IDs), and 60 launch regressions passed, including bodyless browser sign-out and billing-portal POSTs.
- npm run test:runtime: native workerd PBKDF2-SHA256 at 600,000 iterations passed; approximately 209 ms on this PC. This is not a production CPU measurement.
- npm run test:integration: real local Wrangler/D1 register, export, replay, history, exact 4x6 three-page PDF, ten-batch exhaustion, and eleventh-batch 402 passed after resetting only exhausted local test rate counters.
- npm run test:projects: local CRUD, ownership isolation, 256 KiB rejection, deletion, and 60/hour write limit passed.
- node scripts/check-launch.mjs: six real paths/content markers, security headers, D1 health, private API cache policy, and offer contract passed locally.
- The same HTTP script with --require-live-billing exits 1, correctly reporting unconfigured test-mode billing.
- npm audit --omit=dev: zero production dependency vulnerabilities reported. Browser CDN libraries and operational settings are separate surfaces.
- Wrangler dry-run: valid bundle with DB + ASSETS + APP_ORIGIN; no deployment. Public preview files are excluded by .assetsignore.
- Chrome: protected /billing prompts for sign-in; successful sign-in returns to account; reload retains the path. Mobile Account control works, pricing states checkout unavailable, no observed console errors in those flows. Final approval remains separate.
- Migration 0003 applied only to local D1. Production has not been migrated by this work.

## Gates still open

| Gate | Evidence / next action | Owner |
| --- | --- | --- |
| Stripe provisioning | Production secret list returned []; public /api/config/pricing returned configured:false. Need matching test and live API key, monthly price, signing secret, terms URL, and enabled billing portal. Screenshot of a product is not checkout proof. | Chris provides secure access; agent wires and verifies |
| Real billing lifecycle | Mock-provider checks passed; no actual purchase, webhook delivery, portal cancellation, renewal failure, or live payment has been tested. Test-mode acceptance first; live payment only with explicit approval. | Agent + Chris |
| Recovery email | No production RESEND_API_KEY or verified EMAIL_FROM. Need a delivered recovery message and completed single-use reset from an owner-controlled inbox. | Chris + agent |
| Hosting capacity | Current account CPU plan is unverified. Strong hashing and worst-case PDF generation need more than an assumed free-tier CPU allowance. Measure 200-page/image-heavy cases and approve spending if needed. | Chris + agent |
| Operational readiness | Configure error/delivery alerts, verify backup/recovery, check bounded cleanup keeps up with output volume, and choose support ownership. No monitoring service was provisioned. | Chris + agent |
| Public terms | Service-terms/privacy drafts now describe the offer and data flows. Confirm business operator, support mailbox, refund handling, retention and tax requirements. No legal/tax compliance clearance claimed. | Chris |
| Secrets | The pasted test secret remains exposed and needs rotation. It was not saved to Obsidian, Jarvis, source, or a new reusable store. Use project-scoped restricted replacements and a secure store. | Chris |
| Release | Show exact fully configured candidate in Chrome, obtain approval, apply additive production migration, deploy the approved Worker commit, then verify served bytes and API/lifecycle behavior. | Chris approval; agent release |
| Physical output | Exact PDF geometry is proven. Rollo/tiny-stock printing and barcode scanning still need physical acceptance. | Chris |

## Limits and follow-ups

Email ownership verification, self-service account deletion, stricter CSP without inline handlers, automated billing reconciliation, high-volume output storage, and crawlable per-tool pages remain backlog items. Free credits are per account, not per real-world person. Existing IP limits mitigate abuse but do not prevent repeated account creation.

The historical Pages mirror is static and has no first-party API. Its deployment script was removed from the SaaS release path; no external mirror/DNS setting was changed. Decide whether to retire or redirect it before advertising the launch.

## Reference basis

- [Stripe webhook handling](https://docs.stripe.com/webhooks): signature verification, duplicate/out-of-order delivery, and retries.
- [Cloudflare native crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/): node:crypto availability with compatibility settings.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): PBKDF2-HMAC-SHA256 work factor.
- [Cloudflare runtime limits](https://developers.cloudflare.com/workers/platform/limits/): CPU/memory budgets require production verification.
- [FTC ROSCA guidance](https://www.ftc.gov/business-guidance/blog/2018/07/time-rosca-recap-ftc-says-risk-free-trial-was-risky-not-free): clear terms, informed consent and cancellation. This checklist is engineering evidence, not legal advice.
