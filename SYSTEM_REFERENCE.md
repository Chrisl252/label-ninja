# Label Ninja system reference

- Canonical code: C:\Code\label-ninja.com\label-ninja
- GitHub: https://github.com/Chrisl252/label-ninja ; branch master
- Local full-stack preview: http://127.0.0.1:8787 (npm run dev)
- Production Worker: https://label-ninja.com (www and http redirect to it via src/redirects.js once this lane deploys)
- Historical static mirror: https://label-ninja.pages.dev ; not a full-stack release target
- Worker configuration: wrangler.toml, src/worker.js, public ASSETS (run_worker_first = true), nodejs_compat
- D1: label-ninja-db / 852d3ccd-83b6-4ab9-9c39-49a1cf77b88b / binding DB
- Local D1: .wrangler/state/v3/d1 ; do not confuse --local and --remote
- Runtime dependencies: pdf-lib and pinned @noble/hashes 2.4.0; browser JsBarcode/PapaParse remain CDN-loaded; the 4x6 converter uses vendored public/vendor/pdfjs-4.10.38 and pdf-lib-1.17.1
- Scheduler: */15 * * * * ; cleanup is bounded, monitor backlog
- Live source ceb6a67 / Worker eacac403-fbac-4484-bd6f-24398f2232cf (2026-09-07 UTC; receipt DEPLOYMENT_UPGRADE_CEB6A67.md). The free-everything lane (branch lane/free-everything-20261001) is NOT deployed

## Secrets and provider configuration

| Name | Purpose |
| --- | --- |
| RESEND_API_KEY | Transactional recovery email |
| EMAIL_FROM | Sender address on a verified sending domain |
| APP_ORIGIN | Non-secret canonical origin; production https://label-ninja.com |

Local secrets belong in ignored .dev.vars. Production values belong in the Worker secret store, entered through a secure prompt/dashboard. Never put values in docs, chat or command arguments.

Payments were removed on 2026-10-01. STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_MONTHLY are no longer read by any code. If any exist in the Worker secret store (the 2026-09-06 read-only check returned []), Chris can delete them after this lane deploys and disable any Stripe webhook endpoint that pointed at /api/webhooks/stripe (now 404). Use a protected credential store for any remaining keys; Obsidian/Jarvis may hold a path and purpose only.

## Capacity

Workers Paid was confirmed as the current plan in Chrome on 2026-09-06; no hosting plan or spending change was made. Native PBKDF2 rejects more than 100,000 rounds remotely even though local workerd accepts it. The deployed password module now uses portable @noble/hashes at 600,000 rounds with the same stored format, independently verified on real remote preview and by a live legacy-account upgrade.

Live synthetic measurements: registration 4242 ms, sign-in 4234 ms, three-page vector export 483 ms, 200-page vector export 1340 ms; both PDFs download with exact 4x6-inch pages. These are one-run client wall times, not CPU percentiles, memory/load certification or physical-printer acceptance. Image-heavy and sustained-load cases remain open.

D1 output cap is 12.5 MiB per PDF; images are limited to 4096 px/edge and 4 million decoded pixels across the batch, plus encoded-byte caps. Cleanup deletes at most 10 expired PDFs per scheduled invocation plus lazy sweeps. Watch storage/backlog and provision larger throughput as actual volume grows.
