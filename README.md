# Label Ninja

Thermal label PDFs for bins, Whatnot numbers, Amazon FNSKUs and custom designs.

Free for everyone: no plans, quotas or payments. Studio export needs a free account and is subject to abuse limits (30 exports/hour, 200 pages/batch). The free in-browser /shipping-label-to-4x6 tool needs no account or upload. Revenue is planned from ads only; ads are currently off.

## Develop

Use Node 24 and npm ci. Apply local D1 migrations, then npm run dev on http://127.0.0.1:8787. Run npm test and the integration checks in [CONTRIBUTING.md](CONTRIBUTING.md).

The app is Cloudflare Worker + D1 with browser ES modules. [ARCHITECTURE.md](ARCHITECTURE.md) maps modules; [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) lists configuration names, never credentials. [RUNBOOKS.md](RUNBOOKS.md) covers verification and owner-approved release.
