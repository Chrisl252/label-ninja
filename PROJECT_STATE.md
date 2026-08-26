# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status:** LIVE and verified on 2026-08-26.
- **Production:** `https://label-ninja.com` and `https://www.label-ninja.com`.
- **Mirror:** `https://label-ninja.pages.dev`.
- **Git:** GitHub `Chrisl252/label-ninja`, branch `master`, release commit `478ca96`.
- **Hosting:** Cloudflare Worker Static Assets; Pages is a synchronized mirror.
- **Worker version:** `d4135cb7-017a-4eef-a303-ba7096a77df7`.
- **Verification:** all three live hosts returned HTTP 200 and matched local `public/index.html` SHA-256 `C3BC081E...F69B6F3E`.
- **Next brick:** physical-printer acceptance on Chris's Rollo using 4x6 portrait stock and 1x0.5 landscape stock; no code or deployment blocker remains.
- **Do not touch:** untracked `scratch/` and `src/` are preserved prior-session artifacts and are not part of the deployed static-assets path.

## 2. Feature Inventory

- [x] Custom visual editor with draggable text, barcode, badge, box, and uploaded-image elements.
- [x] Browser-only PNG/JPEG/WebP uploads, drag-and-drop placement, and image resizing (8 MB per file limit).
- [x] Responsive navigation and mobile-safe fixed-coordinate canvas workspace.
- [x] Exact physical print sizing for editor presets, including 4x6 shipping labels.
- [x] Warehouse bin batches: one complete 4x6 portrait label per page with bin text and Code128 barcode.
- [x] Whatnot sequential numbers on selectable 1x0.5, 2x1, and 3x2 stock.
- [x] FNSKU single-label and CSV batch tooling.
- [x] Cloudflare Worker production deployment plus Pages mirror.
