# Label Ninja architecture

Label Ninja is a browser label editor with a same-origin Cloudflare Worker API and D1 database. The production app is the Worker on label-ninja.com; the old static Pages mirror cannot provide accounts or exports.

## Product contract (2026-10-01)

Everything is free. There are no plans, quotas, credits, payments or Stripe. Revenue includes owner-authorized affiliate shopping links (2026-10-05); ads are off (public/js/ads-config.js enabled:false) pending an owner decision.

- Studio PDF export still requires a free account (401 without a session). Abuse limits remain: 30 export requests/hour/user (429), 200 pages/batch, spec/image limits, seven-day PDF downloads, saved projects.
- /shipping-label-to-4x6 is a free in-browser tool: no account, no upload, nothing leaves the device.
- /api/auth/me returns user = {id, email, role, plan:"free", unlimited:true, created_at}. Export jobs no longer report remaining_free_uses. Billing routes return 404.

## Backend map

Chris approved Packing Bench on October 5. Historical direction mockups in `design/redesign-20261005/` remain isolated from `public/` Static Assets and do not submit API data. Their README now indexes the real local implementation and acceptance evidence; the approved design contract is `DESIGN.md`.

| File | Responsibility |
| --- | --- |
| src/worker.js | Thin dispatch: redirects first, then /api/* to domain routers, else src/static.js; private API headers; scheduled cleanup |
| src/static.js | Static serving: studio SPA only for /account and /reset (SPA_PATHS); everything else via ASSETS; unknown paths return public/404.html with status 404, noindex, no-store (wrangler not_found_handling = "404-page"). Add only actual SPA deep links to SPA_PATHS; article pages are HTML assets, not SPA routes. |
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
| home-picker | Fixed local sample artwork for real job links; remembers only `ln.home.job`, never a draft/file |
| packing-tools | Accessible editor element selection/nudging; `ln.editor.stock.v1` stock reuse requires an explicit click |
| ../printer-picker | Filters sourced static printer cards; native two-printer comparison dialog; no generated shopping URLs |
| ../site-nav | Shared real-link navigation, native Tools group, fixed-catalog search and optional `ln.theme` preference |

public/index.html is the studio SPA + crawlable home; keep it below the 700-line contract. App-only markup (editor workbench, dashboard, account, dialogs) renders from public/js/app/views/*; live-previews.js + barcode-svg.js draw on-screen barcodes matching the PDF renderer; focus-trap.js handles dialogs. New helpers are registered by initPackingTools(), initHomePicker() and initPrinterPicker() after routeFromLocation() in app.js. Presentation entry/view/enhancement imports share the packing-20261005c cache key; API/output dependency imports remain unchanged. Preview appears before compact controls in the mobile DOM; each visible app mode has one H1 and labelled main landmark.

### Shared Packing Bench presentation

| Source | Responsibility |
| --- | --- |
| public/css/tokens.css | Warm paper/ink/orange semantic colors, light default + dark overrides, shared type/spacing/radius/motion; the only component-color definitions |
| public/css/app.css | Base type, stock/liner, controls, focus, motion reduction and footer primitives; no change to physical label geometry |
| public/css/site.css + public/js/site-nav.js | Consistent header, Tools/Labels & sizes/Printers/Guides grouping, breadcrumbs, search/theme; reserved static controls reduce layout movement |
| public/css/home.css | Job-first homepage, physical sample station, truthful workflow/size/FAQ sections |
| public/css/printers.css + public/js/printer-picker.js | Decision cards, qualified filters, verdicts, mobile sticky selection and comparison dialog |
| public/css/editor.css, tools.css, account.css | Preview-first studio, native settings details, accessible inspector, dashboard/account/overlays |
| public/css/guides.css, whatnot-labels.css, label-crop.css | Scannable static help/legal/recovery pages and converter workspace; existing converter geometry remains in JS |
| public/assets/fonts/ | OFL-licensed Latin-focused Barlow Condensed 700, IBM Plex Sans variable 100–700 and JetBrains Mono 400; 89,324 WOFF2 bytes total, font-display:swap and three shared preloads |

Header/footer use shared markup/classes across the ten canonical documents and 404. Printer cards and editorial text remain crawlable static HTML. Illustrative home/proposal labels are not postage or export results. Editor canvas Helvetica and existing presets/spec builders/renderers retain their physical-output contract. New labels/settings are never added to shopping URLs. Full-stack local preview is port 8797; historical proposal review is 8809.

### Free 4x6 converter
 v2 adds layouts (1/2/4-up sheets, packing slip), batch, jobs, sample (fake SAMPLE ONLY label), errors, prefs (localStorage ln.labelcrop.v1).
public/shipping-label-to-4x6.html with public/js/label-crop/ modules: geometry (pure crop/fit/rotate math), detect (pure label detection on RGBA pixels), sources (PDF/image loading), cropbox (draggable crop editor), pages-view (page picker), output (pdf-lib 4x6 or 100x150 mm PDF, vector crop for PDF sources), app (page wiring; libraries load on first use). Styles in public/css/label-crop.css. Vendored public/vendor/pdfjs-4.10.38 and public/vendor/pdf-lib-1.17.1 are served with immutable cache from public/_headers. Tests: scripts/test-label-crop.mjs.

### Crawlable pages

/whatnot-labels (public/js/whatnot-labels.js form; public/js/whatnot-settings.js is the shared DOM-free validation and URL contract that whatnot-tool also imports) and guides under public/guides: whatnot-labels-printing-too-small, ebay-shipping-label-not-4x6, print-amazon-return-label-4x6, 8-5x11-shipping-label-to-4x6. Worker Static Assets serves extensionless URLs. public/sitemap.xml lists 10 URLs; public/robots.txt disallows /api/. SEO_STRATEGY.md records intent, sources and measurement.

public/css contains tokens and mode-specific styles. public/_headers contains CSP and security headers. Inline event handlers still require unsafe-inline. public/.assetsignore excludes local preview pages. CSV import is not implemented and is not advertised.

## Verification

npm test runs spec-builders, the DOM contract, test-launch, whatnot-feature, routing and affiliate checks against pure modules and real API handlers on SQLite with a fake Resend transport. Routing covers 200/404/301 behavior; scripts/test-label-crop.mjs runs 23 converter tests. npm run test:runtime checks the real password module (LN_CRYPTO_PROBE points it at an isolated real Cloudflare preview; local workerd alone is insufficient). Integration/project suites hit local Wrangler/D1; scripts/test-deploy-canary.mjs requires explicit production opt-in. scripts/check-launch.mjs checks HTTP routes, redirects and headers without mutations. Redesign source, 390px DOM and mobile Lighthouse receipts live in design/redesign-20261005/evidence/. None certifies email delivery, physical printing, field Core Web Vitals or affiliate conversion. The October 5 reviewed candidate is frozen under backups/packing-20261005/release-candidate-v2/ with a 121-file manifest (98 physical public assets); QA.md records actual browser/PDF/Lighthouse/dry-run results. This is release input, not a new canonical source root.

### Affiliate shopping links

Shopping anchors are static HTML on the homepage, Whatnot tool and 4x6 converter; no click redirect, third-party script or user-level tracking is added. `config/affiliates.json` records the active Amazon tag and website-list evidence. `scripts/check-affiliates.mjs` scans public HTML for untagged shopping links, mismatched tags, missing sponsored/noopener attributes and disclosures in the same shopping section. Its `--release` mode fails until Label Ninja is verified in the Associates website list. Manufacturer support and Amazon privacy links remain ordinary source links. Compatibility copy does not certify untested printer/stock combinations.
