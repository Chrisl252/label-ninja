# PROJECT_STATE.md — Label Ninja State Snapshot

## 1. Start Here Next Session (≤20 lines)

- **Status:** Active & Ready for Cloudflare Pages / Edge deployment (2026-08-25).
- **Domain:** `label-ninja.com` (Owned by Chris).
- **Model:** 100% Freemium & Unlimited.
- **Current Stack:** Client-side HTML5 studio with single barcode generator (FNSKU, UPC, EAN, CODE128, QR) & bulk CSV batch generator (PapaParse + JsBarcode + @media print).
- **Next Brick:** Deploy static `public/` directory to Cloudflare Pages and attach custom domain `label-ninja.com`.

---

## 2. Feature Inventory

- [x] House documentation & modular architecture scaffolded.
- [x] Single-label interactive generator UI (FNSKU, Code128, UPC-A, EAN-13, QR Code).
- [x] Thermal label size presets (2"x1" 30334, 2.25"x1.25" 30336, 1.125"x3.5" 30252, 2"x2" Square, 4"x6" Rollo/Zebra).
- [x] Direct vector print styling (`@media print`) with page-break pagination for thermal printers.
- [x] Unlimited Bulk CSV upload batch generator (PapaParse integration, auto column detection).
- [x] 100% Freemium model (paywalls and MVP references removed).
