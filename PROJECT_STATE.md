# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status:** LIVE — static site + auth API + **server-authoritative PDF export pipeline** (brick 2, 2026-08-31). Worker version `d73cb865-5ca4-4c78-9a02-a2ed39495df8`.
- **Export engine:** `POST /api/export` renders real PDFs server-side (pdf-lib) from validated job specs (text/CODE128/rect/line/PNG-JPEG elements, exact pt sizing), stores bytes in D1 `output_chunks` (400KB chunks, `migrations/0002_outputs.sql`), serves authorized downloads (7-day expiry, `private, no-store`), `GET /api/exports` history, `DELETE /api/export/:id`.
- **Metering:** atomic `INSERT..SELECT..WHERE remaining>0` reservation in `usage_ledger`; `changes=0` → 402 `free_limit_reached` (+`upgrade_url`). Failed renders compensate (delete ledger row) — zero consumption. Idempotency key replays the same job. Pro-active users skip reservation (`src/entitlements.js` = the one formula, used by auth + export). 30 exports/hour/user.
- **Verified:** 13/13 local cases (`scripts/test-export-local.ps1`, incl. race 200+402, compensation, dimension proofs 288x432 / 70.87x36.85pt) + prod canary (`ln-canary-b2+20260831181300@bisket.com`, 1 use burned, remaining 9, exact-dim download proof). Auth suite still 24/24.
- **R2:** still unavailable (error 10042) — D1 blobs are the storage design, not a fallback hack.
- **Frontend:** untouched this brick — still client-side only; wiring the UI to `/api/export` is the next brick (Brick 3 = pdf_convert tool + UI).
- **Local verify:** start `npx wrangler dev`, then `scripts/test-export-local.ps1`; clear `rate_limits` table between full re-runs (both suites share it). `scripts/verify-pdf.mjs <pdf> [w h pages]` proves dimensions.
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
