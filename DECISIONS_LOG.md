# DECISIONS_LOG.md — Label Ninja Decision Record

## 2026-08-25: Freemium Pivot & Domain Acquisition

- **Decision:** Chris acquired `label-ninja.com`. Pivot project to 100% Freemium & Unlimited tool.
- **Changes:**
  - Removed all payment gates, LemonSqueezy modals, and MVP mentions.
  - Implemented 100% client-side CSV manifest parsing via PapaParse.
  - Added support for 5 thermal printer label presets and 5 barcode symbology types (CODE128, UPC-A, EAN-13, CODE39, QR Code).
- **Deployment Plan:** Target Cloudflare Pages static edge host for zero hosting costs.
