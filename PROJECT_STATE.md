# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status:** LIVE — static site + auth API + server-authoritative PDF export + **Stripe billing backend** (brick 4, 2026-08-31). Worker version `5e799b62-7c72-4fb8-bce5-4e421fd5b30a`.
- **Billing (src/billing.js, REST-only, no SDK):** `GET /api/config/pricing` (cached real Stripe prices; graceful `price_fetch_failed` degrade), `POST /api/billing/checkout` (ensure-customer + Checkout Session), `POST /api/billing/portal`, `POST /api/webhooks/stripe` (HMAC t±300s + constant-time v1 verify; idempotent via `webhook_events` with release-on-error so Stripe retries work; anti-hijack: a user never relinks to a different Stripe customer). Entitlement semantics FIXED: access persists through `paid_through` after cancellation (`canceled|past_due` + future `paid_through` = pro; `incomplete`/`unpaid` never grant; `plan` is a display column synced FROM the predicate).
- **THE remaining external step (Chris):** enable test-mode billing — 4× `npx wrangler secret put` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL) + Stripe dashboard product/prices/webhook endpoint. Exact list: `SYSTEM_REFERENCE.md` § Stripe billing setup. Until then everything billing returns structured 503s / `configured:false` (verified in prod).
- **Frontend (brick 5?):** billing UI pages (`/pricing`, `/billing`) + export wiring still client-side only — another brick owns `public/`; brick 4 touched zero frontend files.
- **Local verify:** start `npx wrangler dev` (needs `.dev.vars` with the fakes — see `.dev.vars.example`), then `scripts/test-billing-local.ps1` (Phase A: rename `.dev.vars` away, run with `-NoKey`; Phase B: restore + default run — signs its own webhooks). Clear `rate_limits` between suite runs (shared bucket; auth/export suites unchanged: 24/24, 27/27).
- **Do not touch:** `scratch/` and `src/index.js` are preserved prior-session artifacts; `src/*.js` modules are the live backend. A stale `wrangler dev` on 8787 from brick 3's session was killed during brick 4 (its runtime had crashed; dev-local.log is now exclusively owned by whoever starts dev next).

## 2. Feature Inventory

- [x] Custom visual editor with draggable text, barcode, badge, box, and uploaded-image elements.
- [x] Browser-only PNG/JPEG/WebP uploads, drag-and-drop placement, and image resizing (8 MB per file limit).
- [x] Responsive navigation and mobile-safe fixed-coordinate canvas workspace.
- [x] Exact physical print sizing for editor presets, including 4x6 shipping labels.
- [x] Warehouse bin batches: one complete 4x6 portrait label per page with bin text and Code128 barcode.
- [x] Whatnot sequential numbers on selectable 1x0.5, 2x1, and 3x2 stock.
- [x] FNSKU single-label and CSV batch tooling.
- [x] Cloudflare Worker production deployment plus Pages mirror.
