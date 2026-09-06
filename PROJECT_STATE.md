# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status (2026-09-06):** Production remains on Worker **`5ccad6c2-1846-49ab-9658-d49b87416c77`**. The Print Bench redesign is now a local, test-clean release candidate; it has not been deployed and still requires Chris's Chrome Ready Check approval.
- **Latest brick:** assembled the complete Print Bench UI into `public/index.html`, added modular CSS, preserved exact print geometry while fitting the editor preview at 320–768 px widths, landed saved-project backend/frontend wiring, and promoted the DOM/design contract to `npm test`.
- **Last change — HOTFIX 2026-09-02:** every deep link was returning a JSON **500** in production. `[assets]` in `wrangler.toml` had no `binding`, so `env.ASSETS` was undefined and any non-asset path (`/pricing`, `/reset?token=`, `/billing`, `/account`, any 404) threw in `serveStatic()`. One config line (`binding = "ASSETS"`) fixed it; all path routes now 200 on apex + www. Sitemap's `/privacy.html` (a 307) repointed to `/privacy`. Details: DECISIONS_LOG 2026-09-02.
- **Release gate:** do not deploy from an uncommitted or mixed working tree. Show this exact candidate in Chrome, obtain explicit approve/deny, then deploy the approved commit without intervening edits.
- **Frontend (brick 3):** all 5 export seams are metered server exports (browser-print bypass removed — server metering is authoritative). ES modules under `public/js/app/` (13 files, entry `app.js`, inline handlers via `window.LN.*`). Spec builders are pure/DOM-free in `spec-builders.js` (node-testable). Auth modal + usage chip, 402 paywall (price area from `/api/config/pricing`), My Exports drawer (re-download/delete, 7-day expiry), WebP→PNG at upload, idempotency key regenerated on any tool-state change. `/pricing` (SPA → guides `#pricing` section) and `/reset?token=` routes work **only as of the 2026-09-02 hotfix** — they 500'd from brick 3 until then. Always curl a real PATH route in prod; a `#hash` route proves nothing (it is served by `/`).
- **Next brick:** align the offer and billing contract to one $9.99/month plan, decide/enforce whether “10 free prints” means PDFs or physical pages, wire the real Stripe price/webhook in test mode, and remove unsupported Pro claims. The exposed test secret must be rotated before the end-of-day close.
- **Local verify:** `npm test`; with `wrangler dev` on port 8787, run `npm run test:integration` and `npm run test:projects`. Current proof: 61/61 spec checks, UI contract pass, 41/41 integration checks, and all project CRUD checks.
- **Do not touch:** `scratch/` + `src/index.js` are preserved prior-session artifacts; `src/*.js` is the live backend (brick 3 touched zero src files). `public/js/ads.js`/`ads-config.js` stay disabled-at-config (do not re-reference).

## 2. Feature Inventory

- [x] Custom visual editor with draggable text, barcode, badge, box, and uploaded-image elements (WebP auto-converts to PNG).
- [x] Browser-only PNG/JPEG/WebP uploads, drag-and-drop placement, and image resizing (8 MB per file limit).
- [x] Exact physical print sizing for editor presets via server PDF export (px→inch conversion through the active preset).
- [x] Warehouse bin batches (4x6 portrait / 6x4 landscape), Whatnot sequences (3 stocks), FNSKU single labels — all metered server PDFs.
- [x] Accounts: register/login/logout/reset, usage chip, My Exports history drawer, 402 paywall modal, 10 free exports.
- [x] Cloudflare Worker production deployment plus Pages mirror; SPA fallback routes `/pricing` and `/reset`.
