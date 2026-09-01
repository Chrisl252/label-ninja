# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status:** LIVE — static site unchanged + **backend API live at `/api/*`** (brick 1 of SaaS pivot, 2026-08-31).
- **Production:** `https://label-ninja.com` + `www` (Worker, version `0e4d7460-db61-4bac-8be9-2a183d51e2d6`); Pages mirror at `label-ninja.pages.dev` (static only, no backend).
- **Backend:** plain-ESM Worker (`src/worker.js` router + `src/{auth,db,http,validate,ratelimit}.js`), D1 `label-ninja-db` (`DB`, id `852d3ccd-83b6-4ab9-9c39-49a1cf77b88b`), schema v1 (`migrations/0001_init.sql`) applied local+remote — all 9 tables incl. export_jobs/usage_ledger/projects/printer_profiles/webhook_events.
- **Auth live:** register/login/logout/me + password-reset plumbing; sessions via `ln_session` HttpOnly cookie; 10/hr per-IP rate limit on auth endpoints; `ADMIN_EMAILS=chrislucas252@gmail.com` → admin role.
- **Canary:** `ln-canary+20260831175445@bisket.com` registered + verified in prod (register/me/login/logout/404 all green).
- **R2:** NOT enabled on the account (create failed, code 10042) — no `OUTPUTS` binding. Brick 2 falls back to D1 blobs or Chris enables R2 in dashboard.
- **Next brick:** export jobs + metering (POST /api/exports, usage_ledger writes, free-uses decrement visible in /me).
- **Local verify:** `scripts/test-auth-local.ps1` (24 checks) against `npx wrangler dev` — clear local `rate_limits` table between full re-runs.
- **Do not touch:** `scratch/` and `src/index.js` are preserved prior-session artifacts; `src/*.js` modules are the live backend.

## 2. Feature Inventory

- [x] Custom visual editor with draggable text, barcode, badge, box, and uploaded-image elements.
- [x] Browser-only PNG/JPEG/WebP uploads, drag-and-drop placement, and image resizing (8 MB per file limit).
- [x] Responsive navigation and mobile-safe fixed-coordinate canvas workspace.
- [x] Exact physical print sizing for editor presets, including 4x6 shipping labels.
- [x] Warehouse bin batches: one complete 4x6 portrait label per page with bin text and Code128 barcode.
- [x] Whatnot sequential numbers on selectable 1x0.5, 2x1, and 3x2 stock.
- [x] FNSKU single-label and CSV batch tooling.
- [x] Cloudflare Worker production deployment plus Pages mirror.
