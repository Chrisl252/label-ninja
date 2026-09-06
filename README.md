# Label Ninja

Thermal label PDFs for bins, Whatnot numbers, Amazon FNSKUs and custom designs.

Free: 10 PDF batches total. Pro: $9.99 USD/month, unlimited batches during paid access. Both plans have documented resource limits. Paid launch is not yet cleared; see [LAUNCH_READINESS.md](LAUNCH_READINESS.md).

## Develop

Use Node 24 and npm ci. Apply local D1 migrations, then npm run dev on http://127.0.0.1:8787. Run npm test and the integration checks in [CONTRIBUTING.md](CONTRIBUTING.md).

The app is Cloudflare Worker + D1 with browser ES modules. [ARCHITECTURE.md](ARCHITECTURE.md) maps modules; [SYSTEM_REFERENCE.md](SYSTEM_REFERENCE.md) lists configuration names, never credentials. [RUNBOOKS.md](RUNBOOKS.md) covers verification and owner-approved release.
