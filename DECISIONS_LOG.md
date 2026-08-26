# DECISIONS_LOG.md — Label Ninja Decision Record

## 2026-08-25: Freemium Pivot & Domain Acquisition

- **Decision:** Chris acquired `label-ninja.com`. Pivot project to 100% Freemium & Unlimited tool.
- **Changes:**
  - Removed all payment gates, LemonSqueezy modals, and MVP mentions.
  - Implemented 100% client-side CSV manifest parsing via PapaParse.
  - Added support for 5 thermal printer label presets and 5 barcode symbology types (CODE128, UPC-A, EAN-13, CODE39, QR Code).
- **Deployment Plan:** Target Cloudflare Pages static edge host for zero hosting costs.

## 2026-08-26: Physical Print Contracts, Local Artwork, and Production Hosting

- **Decision:** Every generator sets an explicit physical CSS page size before printing. Warehouse bins use 4x6 portrait pages; Whatnot stock is selectable and defaults to 1x0.5 landscape.
- **Reason:** Browser viewport sizing and printer-driver defaults produced oversized or clipped labels. Exact CSS inches keep one complete label on each physical sheet when the matching driver paper, zero margins, and 100% scale are selected.
- **Decision:** Custom-editor image uploads remain browser-only. Accept PNG, JPEG, and WebP files up to 8 MB; do not upload or retain user files on a server.
- **Reason:** This preserves privacy, eliminates storage cost, and keeps untrusted files away from a server boundary.
- **Decision:** `label-ninja.com` and `www` are served by Cloudflare Worker Static Assets. `label-ninja.pages.dev` remains a synchronized mirror.
- **Reason:** The custom domains were already attached to the Worker; static-assets mode deploys the canonical `public/` directory directly and removes the stale generated-worker seam.
