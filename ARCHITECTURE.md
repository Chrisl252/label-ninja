# Label Ninja architecture

Label Ninja is a browser label editor with a same-origin Cloudflare Worker API and D1 database. The production app is the Worker on label-ninja.com; the old static Pages mirror cannot provide accounts or exports.

## Product contract (2026-10-01)

Everything is free. There are no plans, quotas, credits, payments or Stripe. Revenue is planned from ads only; ads are off (public/js/ads-config.js enabled:false) pending an owner decision.

- Studio PDF export still requires a free account (401 without a session). Abuse limits remain: 30 export requests/hour/user (429), 200 pages/batch, spec/image limits, seven-day PDF downloads, saved projects.
- /shipping-label-to-4x6 is a free in-browser tool: no account, no upload, nothing leaves the device.
- /api/auth/me returns user = {id, email, role, plan:"free", unlimited:true, created_at}. Export jobs no longer report remaining_free_uses. Billing routes return 404.

## Backend map

| File | Responsibility |
| --- | --- |
| src/worker.js | Thin dispatch: redirects first, then /api/* to domain routers, else src/static.js; private API headers; scheduled cleanup |
| src/static.js | Static serving: studio SPA only for /account and /reset (SPA_PATHS); everything else via ASSETS; unknown paths return public/404.html with status 404, noindex, no-store (wrangler not_found_handling = "404-page"). Add any new real front-end path to SPA_PATHS. |
| src/redirects.js | www/http to https://label-ninja.com (301 GET/HEAD, 308 otherwise); legacy /pricing and /billing to / (301) |
| src/security.js | Same-origin write guard, JSON request content type, canonical app origin |
| src/http.js | Sanitized errors, streaming byte-limited body reads |
| src/auth.js | Register/login/logout, HttpOnly sessions, reset lifecycle, session-safe hash upgrade, /api/auth/me |
| src/db.js | Token hashing, constant-time byte comparison and IDs |
| src/passwords.js | Portable PBKDF2-SHA256 600,000 rounds, legacy verification and unknown-user work; pinned @noble/hashes |
| src/validate.js, src/ratelimit.js | Input shape, per-IP auth and per-user write/export limits |
| src/export.js | Idempotent job claim, render, chunk commit, history/download/delete; no quota or credit math |
| src/spec-validate.js, src/image-size.js, src/limits.js | Export limits, pre-decode image dimensions, bounded resource use |
| src/render/pdf-label.js, src/code128.js | Exact-inch PDF geometry and vector CODE128 |
| src/projects.js | Owner-scoped project CRUD; 256 KiB UTF-8 limit, 60 writes/hour |
| src/mailer.js | Configured Resend delivery with a canonical one-use recovery URL |
| src/maintenance.js | Every-15-minute expiry/recovery of export jobs; bounded work |

wrangler.toml sets [assets] run_worker_first = true so every request, static included, passes the Worker once (needed for the canonical redirect). npm run dev passes --local-upstream localhost:8787 so that redirect does not fire in wrangler dev.

## Data and state transitions

Migrations 0001 and 0002 create account/project/ledger tables and PDF chunks. 0003 adds export input hashes, billing event/cancellation fields, checkout attempts, and cleanup indexes. Applied migrations are immutable. The billing tables and columns (subscriptions, webhook events, checkout attempts, credit fields) are dormant: no code reads or writes them, and no migration drops them.

Export requests validate before rendering. One D1 transaction inserts the unique user/key job; a hash binds the key to the submitted content, so a replay returns the same job. The chunk transaction may only complete a processing job. A lost response after a successful commit returns the completed job.

PDF bytes live in output_chunks, at most 32 chunks of 400 KiB (12.5 MiB). Expired downloads are denied at request time even before deletion runs. Cleanup expires at most 10 completed jobs and recovers at most 5 processing jobs per scheduled run; lazy cleanup also runs during export/history requests. Job audit records remain after bytes expire.

Reset tokens are stored only as hashes, expire in one hour, and are single-use in a transaction that revokes sessions. Sessions last 30 days and use Secure/HttpOnly/SameSite=Lax cookies. Registration does not promote an unverified administrator email.

## Frontend map

Entry is public/js/app/app.js. It owns mode routing (home, dashboard, editor, bin, whatnot, fnsku, guides, account) and the window.LN handler bridge. Account deep links wait for the asynchronous session lookup. Existing physical canvas coordinates stay unchanged when the preview is scaled for phones.

| Modules | Purpose |
| --- | --- |
| editor, presets, spec-builders | Design state, stocks, pure PDF request builders |
| bin-tool, whatnot-tool, fnsku-tool | Tool-specific settings and export intents |
| whatnot-text-fit | Pure Helvetica Bold advance metrics and stock-aware text fit, checked against pdf-lib |
| api, session, auth-ui | API transport, session updates, sign-in/reset UI |
| exporter | Retry keys, PDF downloads/history |
| projects, dashboard | Save/open/duplicate/delete and recent work |
| account | Account details (no plan or billing UI) |
| html | Shared escapeHtml for every user string at an HTML sink |
| workspace-navigation | Remember the last label tool for the home resume link |
| guides, toast | Guide hashes and user feedback |

public/index.html is the studio SPA + crawlable home (685 lines). App-only markup (editor workbench, dashboard, account, dialogs) renders from public/js/app/views/*; live-previews.js + barcode-svg.js draw on-screen barcodes matching the PDF renderer; focus-trap.js handles dialogs. Shared header/breadcrumb: public/css/site.css + public/js/site-nav.js on every page; 404 page public/404.html; guides hub public/guides/index.html.

### Free 4x6 converter
 v2 adds layouts (1/2/4-up sheets, packing slip), batch, jobs, sample (fake SAMPLE ONLY label), errors, prefs (localStorage ln.labelcrop.v1).
public/shipping-label-to-4x6.html with public/js/label-crop/ modules: geometry (pure crop/fit/rotate math), detect (pure label detection on RGBA pixels), sources (PDF/image loading), cropbox (draggable crop editor), pages-view (page picker), output (pdf-lib 4x6 or 100x150 mm PDF, vector crop for PDF sources), app (page wiring; libraries load on first use). Styles in public/css/label-crop.css. Vendored public/vendor/pdfjs-4.10.38 and public/vendor/pdf-lib-1.17.1 are served with immutable cache from public/_headers. Tests: scripts/test-label-crop.mjs.

### Crawlable pages

/whatnot-labels (public/js/whatnot-labels.js form; public/js/whatnot-settings.js is the shared DOM-free validation and URL contract that whatnot-tool also imports) and guides under public/guides: whatnot-labels-printing-too-small, ebay-shipping-label-not-4x6, print-amazon-return-label-4x6, 8-5x11-shipping-label-to-4x6. Worker Static Assets serves extensionless URLs. public/sitemap.xml lists 9 URLs; public/robots.txt disallows /api/. SEO_STRATEGY.md records intent, sources and measurement.

public/css contains tokens and mode-specific styles. public/_headers contains CSP and security headers. Inline event handlers still require unsafe-inline. public/.assetsignore excludes local preview pages. CSV import is not implemented and is not advertised.

## Verification

npm test runs spec-builders, the DOM contract, test-launch (52) and whatnot-feature (105) against pure modules and real API handlers on SQLite with a fake Resend transport. node scripts/test-routing.mjs (in npm test) covers 200/404/301 routing. node scripts/test-label-crop.mjs runs 23 converter tests. npm run test:runtime checks the real password module (LN_CRYPTO_PROBE points it at an isolated real Cloudflare preview; local workerd alone is insufficient). Integration/project suites hit a local Wrangler/D1 instance. scripts/test-deploy-canary.mjs requires explicit production opt-in. scripts/check-launch.mjs checks HTTP routes, redirects and headers without mutations. None certifies email delivery, image-heavy load or physical printing.
