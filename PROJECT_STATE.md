# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status (2026-09-02):** LIVE SaaS end-to-end — static studio + auth + server-authoritative metered PDF exports + Stripe billing backend + frontend export wiring (brick 3). Live Worker version **`5ccad6c2-1846-49ab-9658-d49b87416c77`**; Pages mirror `f3f75af2.label-ninja.pages.dev` (not touched by the hotfix).
- **Last change — HOTFIX 2026-09-02:** every deep link was returning a JSON **500** in production. `[assets]` in `wrangler.toml` had no `binding`, so `env.ASSETS` was undefined and any non-asset path (`/pricing`, `/reset?token=`, `/billing`, `/account`, any 404) threw in `serveStatic()`. One config line (`binding = "ASSETS"`) fixed it; all path routes now 200 on apex + www. Sitemap's `/privacy.html` (a 307) repointed to `/privacy`. Details: DECISIONS_LOG 2026-09-02.
- **Working tree carries a co-worker's in-flight brick-5 redesign** (11 modified `public/js/app/*`, modified `public/sitemap.xml`/`privacy.html`, untracked `public/css/`, `DESIGN.md`, `.hallmark/`, `src/projects.js`; unpushed commits `f1568db`, `90727f4`). Do not revert it. **Do not `wrangler deploy` from the working tree** until brick 5 lands — deploy from a clean detached worktree instead (see RUNBOOKS "Clean-lane deploy").
- **Frontend (brick 3):** all 5 export seams are metered server exports (browser-print bypass removed — server metering is authoritative). ES modules under `public/js/app/` (13 files, entry `app.js`, inline handlers via `window.LN.*`). Spec builders are pure/DOM-free in `spec-builders.js` (node-testable). Auth modal + usage chip, 402 paywall (price area from `/api/config/pricing`), My Exports drawer (re-download/delete, 7-day expiry), WebP→PNG at upload, idempotency key regenerated on any tool-state change. `/pricing` (SPA → guides `#pricing` section) and `/reset?token=` routes work **only as of the 2026-09-02 hotfix** — they 500'd from brick 3 until then. Always curl a real PATH route in prod; a `#hash` route proves nothing (it is served by `/`).
- **THE remaining external step (Chris):** enable test-mode billing — 4× `npx wrangler secret put` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL) + Stripe dashboard product/prices/webhook endpoint. Exact list: `SYSTEM_REFERENCE.md` § Stripe billing setup. Until then everything billing returns structured 503s / `configured:false` (verified in prod) — the paywall shows "pricing coming soon".
- **Next brick candidates:** B5/B6 billing UI pages (`/pricing` real page, `/billing` portal); B7 CSV batch (PapaParse already loaded; `pdf_convert` tool still 501 server-side). Full listener migration off inline `onclick` is a later polish brick.
- **Local verify:** start `npx wrangler dev` (port 8787; `.dev.vars` has the fakes), then `node scripts/test-spec-builders.mjs` (61 checks, no server needed) and `node scripts/test-b3-integration.mjs` (41 checks vs dev). Older suites: `test-auth-local.ps1` 24/24, `test-export-local.ps1` 27/27, `test-billing-local.ps1` (clear `rate_limits` between runs; shared bucket).
- **Do not touch:** `scratch/` + `src/index.js` are preserved prior-session artifacts; `src/*.js` is the live backend (brick 3 touched zero src files). `public/js/ads.js`/`ads-config.js` stay disabled-at-config (do not re-reference).

## 2. Feature Inventory

- [x] Custom visual editor with draggable text, barcode, badge, box, and uploaded-image elements (WebP auto-converts to PNG).
- [x] Browser-only PNG/JPEG/WebP uploads, drag-and-drop placement, and image resizing (8 MB per file limit).
- [x] Exact physical print sizing for editor presets via server PDF export (px→inch conversion through the active preset).
- [x] Warehouse bin batches (4x6 portrait / 6x4 landscape), Whatnot sequences (3 stocks), FNSKU single labels — all metered server PDFs.
- [x] Accounts: register/login/logout/reset, usage chip, My Exports history drawer, 402 paywall modal, 10 free exports.
- [x] Cloudflare Worker production deployment plus Pages mirror; SPA fallback routes `/pricing` and `/reset`.
