# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session

- **Status:** LIVE and verified on 2026-08-31. Ads removed site-wide.
- **Production:** `https://label-ninja.com` and `https://www.label-ninja.com`.
- **Mirror:** `https://label-ninja.pages.dev`.
- **Git:** GitHub `Chrisl252/label-ninja`, branch `master`, release commit `ef33427`.
- **Hosting:** Cloudflare Worker Static Assets; Pages is a synchronized mirror.
- **Worker version:** `9a41b050-7bc3-4946-8ba9-87a7aee5b1e2`.
- **Verification (2026-08-31):** apex, www, and Pages returned HTTP 200 with zero ad strings (adsterra/thrillingdeepcutlery/invoke.js/adsbygoogle) and no ad slot containers. Pages `index.html` SHA-256 `16603D9D17D7CA8AB...B5E130540` matches local byte-for-byte; apex differs only by the edge-injected Cloudflare insights beacon.
- **Ads:** Disabled at config (`ads-config.js` `enabled: false`); operational pages ad-free pending SaaS redesign. `js/ads.js` + config kept in repo for possible future use on public SEO guides; `ads.txt` kept.
- **Next brick:** physical-printer acceptance on Chris's Rollo using 4x6 portrait stock and 1x0.5 landscape stock.
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
