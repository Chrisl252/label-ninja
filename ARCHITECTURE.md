# Label Ninja architecture

Label Ninja is a browser label editor with a same-origin Cloudflare Worker API and D1 database. The production app is the Worker on label-ninja.com; the old static Pages mirror cannot provide accounts or billing.

## Product contract

Free accounts get 10 PDF batches total, not 10 pages and not a monthly reset. One completed PDF costs one batch. Re-downloads and failed exports cost nothing. Pro costs $9.99 USD/month and has no monthly batch quota while paid access is active. Both plans have 200 pages/batch, 30 export requests/hour, saved projects, and seven-day PDF downloads.

## Backend map

| File | Responsibility |
| --- | --- |
| src/worker.js | Thin route dispatch, private API headers, scheduled cleanup |
| src/security.js | Same-origin write guard, JSON request content type, canonical app origin |
| src/http.js | Sanitized errors, streaming byte-limited body reads |
| src/auth.js | Register/login/logout, HttpOnly sessions, reset lifecycle, session-safe hash upgrade |
| src/db.js | Token hashing, constant-time byte comparison and IDs |
| src/passwords.js | Portable PBKDF2-SHA256 600,000 rounds, legacy verification and unknown-user work; pinned @noble/hashes |
| src/validate.js, src/ratelimit.js | Input shape, per-IP auth and per-user write limits |
| src/entitlements.js | Shared quota math and paid-through access predicate |
| src/export.js | Idempotent claim + atomic credit reservation, render, chunk commit, history/download/delete |
| src/spec-validate.js, src/image-size.js, src/limits.js | Export limits, pre-decode image dimensions, bounded resource use |
| src/render/pdf-label.js, src/code128.js | Exact-inch PDF geometry and vector CODE128 |
| src/projects.js | Owner-scoped project CRUD; 256 KiB UTF-8 limit, 60 writes/hour |
| src/billing.js | Billing route registration only |
| src/billing-config.js | Validate real Stripe price against the approved monthly offer |
| src/stripe-client.js | 10-second Stripe REST calls; provider idempotency keys, sanitized logging |
| src/billing-checkout.js | Customer/session creation, duplicate purchase guard, portal, owned checkout confirmation |
| src/subscriptions.js | Reconcile current Stripe state, stale-event and optimistic-concurrency guards |
| src/stripe-webhook.js | Raw-body signature/mode verification, bounded event lease, retry-safe processing |
| src/mailer.js | Configured Resend delivery with a canonical one-use recovery URL |
| src/maintenance.js | Every-15-minute expiry/recovery; bounded work, no credit refunds on normal expiry |

## Data and state transitions

Migrations 0001 and 0002 create account/project/ledger tables and PDF chunks. 0003 adds export input hashes, billing event/cancellation fields, checkout attempts, and cleanup indexes. Applied migrations are immutable.

Export requests validate before spending. One D1 transaction inserts the unique user/key job and reserves a free credit only if that exact new job exists. A hash binds the key to the submitted content. Rendering follows the claim; the chunk transaction may only complete a processing job. Completed/expired jobs cannot be refunded through replay. Failed or abandoned processing jobs return their reservation. A lost response after a successful database commit returns the completed job.

PDF bytes live in output_chunks, at most 32 chunks of 400 KiB (12.5 MiB). Expired downloads are denied at request time even before deletion runs. Cleanup expires at most 10 completed jobs and recovers at most 5 processing jobs per scheduled run. Lazy cleanup also runs during export/history requests. Output and old metadata retention are distinct: job/ledger audit records remain after bytes expire.

Pro requires status active, canceled, or past_due AND a future paid_through timestamp. Trialing/unpaid/incomplete never grant access. Only a paid latest invoice advances the stored paid-through date; a failed renewal does not. Webhooks fetch current Stripe state, verify customer and price ownership, reject older event timestamps, and fail retryably on a concurrent state change. A missed webhook cannot leave an expired subscription active forever.

Reset tokens are stored only as hashes, expire in one hour, and are single-use in a transaction that revokes sessions. No console-token fallback exists. Sessions last 30 days and use Secure/HttpOnly/SameSite=Lax cookies. Registration does not promote an unverified administrator email.

## Frontend map

Entry is public/js/app/app.js. It owns mode routing and the window.LN handler bridge. Billing/account deep links wait for the asynchronous session lookup. Existing physical canvas coordinates stay unchanged when the preview is scaled for phones.

| Modules | Purpose |
| --- | --- |
| editor, presets, spec-builders | Design state, stocks, pure PDF request builders |
| bin-tool, whatnot-tool, fnsku-tool | Tool-specific settings and export intents |
| whatnot-text-fit | Pure Helvetica Bold advance metrics and stock-aware text fit, independently checked against pdf-lib |
| api, session, auth-ui | API transport, session updates, sign-in/reset UI |
| exporter, paywall | Retry keys, PDF downloads/history, exhausted allowance |
| projects, dashboard | Save/open/duplicate/delete and recent work; escape project names |
| pricing, account, plan | Shared offer copy, checkout availability, real subscription confirmation |
| guides, toast | Guide hashes and user feedback |

The crawlable Whatnot feature lives in public/whatnot-labels.html and public/guides/whatnot-labels-printing-too-small.html. Worker Static Assets serves their extensionless URLs directly. public/js/whatnot-labels.js owns only the public setup form; public/js/whatnot-settings.js is the shared DOM-free validation and URL contract. The existing whatnot-tool imports this contract and initializes settings once from an allowlisted complete deep link. Export still uses exporter.js and the authenticated /api/export ledger; no quota, account or payment state lives on the landing page. public/css/whatnot-labels.css consumes the existing Print Bench tokens. SEO_STRATEGY.md records intent, sources and measurement limits.

public/css contains tokens and mode-specific styles. public/_headers contains CSP and security headers. Inline event handlers still require unsafe-inline; replacing them is a follow-up. public/.assetsignore excludes local preview pages. PDF conversion and CSV import are not implemented and are not advertised as working features.

## Verification

npm test runs pure builders, the DOM contract, and actual API handlers against SQLite with fake Stripe/Resend transports. npm run test:runtime bundles the real password module and checks native-oracle equality, legacy login and wrong-password rejection; LN_CRYPTO_PROBE points it to an isolated real Cloudflare preview. Local workerd alone is insufficient because the native production PBKDF2 ceiling differs. Integration/project suites hit a local Wrangler/D1 instance. scripts/test-deploy-canary.mjs requires explicit production opt-in and exercises one synthetic account, two batches (3/200 pages) and one owned project. scripts/check-launch.mjs checks HTTP without mutations. None certifies payments, email delivery, image-heavy load, or physical printing.
