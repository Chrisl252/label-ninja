# Label Ninja: approved Packing Bench implementation

Chris approved **Packing Bench** on October 5. The full-site implementation is reviewed and frozen locally, awaiting Associates registration and exact-candidate release approval. No production deployment, GitHub push, affiliate-account change or new public route has occurred. DESIGN.md is the approved visual contract.

The **working full-stack candidate is http://127.0.0.1:8797/**. Use `/#editor`, `/shipping-label-to-4x6`, `/#best-label-printers` and `/guides/` to review real tools and content. Port 8809 is the historical direction-mockup board, not a Cloudflare preview deployment or the working website.

## Implemented

- Warm paper/ink/orange identity, light default and matching dark theme, local Barlow Condensed/IBM Plex Sans/JetBrains Mono with OFL licenses, shared tokens/components/footer and grouped navigation with Find/Theme controls.
- Job-first home with real tool links and illustrative physical label samples. It distinguishes the local converter from server/account-backed studio downloads.
- Mobile preview before compact controls in editor/bin/Whatnot/FNSKU; native settings details, keyboard element selection/movement and explicit last-stock reuse that never silently overwrites a draft. Existing physical geometry/presets/export path remain intact.
- Sourced static printer cards with qualified use/connection/fanfold filters, who-for/skip-if verdicts, two-item comparison and sticky phone selection. Shopping hrefs and compliance configuration remain unchanged.
- Scannable guide/Whatnot/legal/recovery pages using the same system; every canonical URL, SEO metadata/anchor and seven unpublished SEO brief remains. Two incorrect DYMO/FNSKU display names were corrected while preserving preset keys/numeric dimensions.

## Current evidence

`QA.md` is the final browser/output/performance receipt. The actual preview is open in Chrome. Final npm/cropper/dry-run commands exit 0. The frozen candidate is `backups/packing-20261005/release-candidate-v2/`, with a 121-file manifest (98 physical public assets) in `release-candidate-v2-sha256.json`; independently checked source/frozen-copy hashes match every entry. The v2 snapshot includes the final UI cache wiring, verified by browser reload with the corrected stock names and search/Escape. The full npm suite passed again after that wiring. Wrangler reports 109 asset entries, a different count from physical files. This frozen copy is release input, not canonical source.

- `evidence/packing-source-audit.md`: canonical/404 metadata, IDs/controls/anchors, preserved affiliate tuples, output geometry/checksums, font tables and helper boundaries. The final version-c snapshot and raw `evidence/packing-source-final.json` identify the checked bytes. Historical source baseline is `evidence/seo-before.json` (local affiliate candidate, not live production metadata).
- `evidence/packing-mobile-pages.json`: 390px DOM checks for all ten canonical pages in light/dark, plus dark 404; no document overflow and one visible H1. Detailed browser task/keyboard checks are recorded separately in QA.md.
- Local npm/HTTP/DB checks and B3 integration passed; the generated three-page PDF is 4x6. Converter fixtures: 23 passed. Actual sample download: one 288x432pt page. Comparison two-selection limit, phone dialog/Escape/focus restore, theme/search/editor/draft/Whatnot/account checks passed; an actual studio Whatnot UI download is three 216x144pt pages.
- `evidence/lighthouse/`: actual mobile Lighthouse JSON, live before versus loopback local after. The scores are observed lab results across different hosting environments, not a production performance/field-CWV claim.
- `screens/`: working-site editor and Lighthouse mobile screenshots captured during implementation. `screenshots/` contains the earlier proposal images; do not substitute those for final-candidate review.
- `npm run check:affiliates`: eleven shopping links, zero content errors, `websiteListed:false`. The registration/release gate is still closed. Ordinary manufacturer/help links remain sources.

| Mobile Lighthouse page | Live before P / A / BP / SEO | Local after P / A / BP / SEO | Local lab CLS |
| --- | --- | --- | --- |
| Home | 99 / 97 / 92 / 100 | 95 / 100 / 96 / 100 | 0 |
| Shipping converter | 89 / 100 / 92 / 100 | 97 / 100 / 100 / 100 | 0.000393 |
| eBay printing guide | 91 / 100 / 92 / 100 | 98 / 100 / 100 / 100 | 0 |

The final v2 homepage run has LCP 2.79s, TBT 0 and CLS 0. The guide's earlier 0.14149 layout shift was traced to JetBrains Mono changing breadcrumb width/wrapping; final preload of all three fonts produced lab CLS 0. Do not infer real-user Core Web Vitals from this single local run.

## Approval and physical acceptance

Functional acceptance described in QA.md is complete; the actual frozen candidate is ready for Chris to approve or amend. Chris owns approval of that visible candidate, separate Associates website-registration authorization and physical Rollo/tiny-stock print/scan acceptance. No mockup, score or local PDF proves physical output or affiliate revenue. After explicit approvals, follow RUNBOOKS.md, verify the website listing, timestamp-backup/update its evidence, pass check:affiliates:release and release the unchanged isolated candidate.

ZPL rendering, 203/300 DPI selection, PNG download, durable draft autosave, 4x4 and 1x2.125 presets remain capability gaps. The current converter handles PDF/images locally and outputs PDF; no meaningless DPI selector or fictional output is delivered. Seven next-page briefs stay in SEO_STRATEGY.md; start with Whatnot label stock, then native Sorting Labels troubleshooting.

## Historical direction review

The owner brief required presenting directions and waiting for approval. That gate was satisfied by Chris's Packing Bench approval; it does not authorize deployment. The earlier board remains at **http://127.0.0.1:8809/index.html** with `packing.html`, `cut-line.html` and `dispatch.html`. Each proposal has home/tool/component/guide sketches and light/dark controls. Their label artwork/barcode patterns are illustrative, not scannable outputs; edited mockup settings do not transfer into the real studio. Local OFL font copies/licenses remain in `fonts/`; proposal mono is the older system-font stack.

- `AUDIT.md`: inspected stack/routes, real tool capabilities, safe rollout and preserved SEO briefs.
- `baseline/`: ten live screenshots of home/editor/PDF-image converter/eBay guide/printer comparison at desktop1440/mobile390. No ZPL implementation existed to capture.
- `screenshots/`: 24 proposal screenshots, three directions × home/tool × desktop/mobile × light/dark; contact sheets combine them.
- `evidence/responsive-checks.json`, `interactive-checks.json` and `contrast-results.json`: **proposal-only** viewport/interactions/default text contrast checks; they do not certify the real implementation.
- `evidence/public-preservation.json`: the direction-only stage kept all 87 earlier affiliate assets unchanged. It is historical; the approved implementation now changes presentation source.

Proposal build/evidence scripts write only inside this design directory, outside `public/` and the Worker release. Rebuild them only to revise historical mockups. Earlier presence :5200 refused once; no restart/retry was attempted. Edit-time rollback and local implementation receipts live in `backups/packing-20261005/`; earlier affiliate receipts remain in `backups/affiliate-20261005/`.
