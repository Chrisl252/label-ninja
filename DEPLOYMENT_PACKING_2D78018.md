# Packing Bench deployment receipt — 2d78018

Recorded 2026-10-05T22:55:41+00:00. **Deployed; live HTTP/PDF/browser/traffic acceptance passes. Worker tail remains unverified because no event sample was captured and automatic review rejected the corrective attempt under the one-attempt boundary rule.**

## Authorization and exact release

- Chris approved the exact v2 deployment and Associates website registration (“approved deploy”), then explicitly authorized “No” for the audience declaration covering all three listed properties. Amazon Confirm succeeded; fresh reloaded saved list contains all three in selected store discountd0247-20.
- Registered websites: https://label-ninja.com, https://just-bargains.com and https://seniorsassassins.com. Evidence: `backups/packing-release-20261005/amazon-website-registration-complete.json` and `.png`; reloaded readback true. Config records websiteListed:true and eleven-link release gate passes (`affiliate-release-final.log`). This is listing verification, not purchase/commission evidence.
- Final release commit: `2d78018eff0890e4622b6382536296b4a251d8d8`; candidate code commit f1699eccaf1f47b20a9e93343af6e92b51f7daf7. Detached isolated checkout: `backups/packing-release-20261005/release-checkout`; Git diff/index/status clean after refresh.
- Frozen v2 manifest: `backups/packing-20261005/release-candidate-v2-sha256.json` (SHA-256 `77b61a6b88381c51f3e47489c76250081e2ca187aea3ef546c6b34265e8a4b89`). All 120 protected entries match source/isolated checkout; config/affiliates.json is the sole approved registration metadata exception. Raw frozen bytes preserved. `release-input-final.json` records zero protected mismatches/config equality.
- Locked npm ci installed 40 packages; isolated npm test/dry-run and affiliate release gate exit 0. Approved release 2d78018 is pushed to origin/lane/site-improve-20261004-labelninja with upstream tracking; github-source-push.log records success. No master push, merge or PR.

## Actual deployment

| Field | Observed result |
| --- | --- |
| New Worker | `b7eb4353-a631-45b0-b0b1-b88cdea0dafc` at 100% traffic; `deployments-after.log` |
| Deployment created | 2026-10-05T22:50:45.722Z; Worker version created 22:50:45.071Z |
| Deploy command | Exit 0, `deployment-final.log` / `deploy-wrangler.log` |
| Domains / schedule | Existing label-ninja.com, www.label-ninja.com, `*/15 * * * *` |
| Bindings | DB (`label-ninja-db`), ASSETS, APP_ORIGIN (`https://label-ninja.com`) |
| Assets | 96 served assets:83 uploaded,13 already uploaded; Wrangler enumerated 109 entries |
| Bundle / startup | 977.15 KiB / gzip 244.57 KiB; startup 22 ms |
| Schema/provider change | No pending migration; none applied; no provider secret/plan change |

## Live verification

| Check | Result / receipt |
| --- | --- |
| Public source/headers | PASS: 101 GET checks,96 served SHA-256 matches; `public-v2-production-2026-10-05T22-51-24-066Z.json` |
| Deployment-control files | Two control files hash locally, excluded from serving; 98 physical public files is not96 served-assets count |
| Launch HTTP gate | PASS: 15 checks; `post-deploy-launch-gate-20261005-155130-795.log` |
| Page/redirect/retired-route GET gate | PASS: 31 GET checks; `http-routes-production-2026-10-05T22-51-30-447Z.json`; does not prove retired POST behavior |
| Production canary | PASS: 17 checks; `production-canary-final.log` |
| Fresh live desktop Chrome | PASS: 1902 x 902, runtimeLogEntries:[], no overflow, correct version-c entry; `live-browser-final.json` and reviewed public home in `live-home-reviewed.png` |
| Live mobile/printer controls | PASS: 390 x 844 home/editor/converter each one H1/no overflow; corrected DYMO 30334 and 2 x 1 Product/FNSKU names; fanfold filter 3 of 6/reset 6; correct two-Rollo comparison and cleared selections |
| Latest Worker traffic readback | PASS: 100% new Worker, deployment created 2026-10-05T22:50:45.722Z; `deployments-after.log` |
| Sanitized Worker tail | **UNVERIFIED**: `worker-observation-final.json` has connected:false, health:null, observations:[]; no event sample. JSON-mode banner mismatch; automatic review rejected corrective pretty-mode attempt under the one-attempt boundary rule. No retry or log-health claim |

Browser evidence: `live-browser-final.json`, `live-home-reviewed.png`, `live-home-mobile.png`, `live-editor-mobile.png`, `live-converter-mobile.png` and `live-printer-comparison.png` in release backups. Public home is left visible with H1 “What are you printing?” after explicit brand navigation at restored 1902 x 902 viewport. The owner was already signed in; no owner label content was changed/exported and no owner sign-out occurred. `live-home-final.png` captured Dashboard auto-entry and is not the final public-home evidence. Tail observation is optional follow-up requiring separate authority; its unavailable result does not undo the passed core deployment checks.

Canary timings: register 1695 ms, sign-in 1524 ms, three-page PDF 407 ms, 200-page PDF 888 ms. Every page of both PDFs is exactly 288 x 432 pt (4 x 6 in). Idempotent replay, synthetic project save/reopen/delete and final sign-out pass. Synthetic account `ln-release+20261005225131@bisket.com` retains two expiring PDFs; its one project was deleted. No email/payment or customer-account mutation. Generated credentials are not stored in this receipt.

## Recovery and limits

- Rollback Worker: `1f8eb5e4-8713-47ca-bbbd-579f3d62a450`, confirmed unchanged immediately before deploy (`deployment-immediate-before.log`).
- Immediate pre-deploy D1 bookmark: `00000bf1-00000000-000050fb-4443b3e89188447ff7bd7b371a8e9d1f` (`d1-immediate-before.log`), superseding the older `00000bef-00000000-000050fb-d17b0152450b718a8710492d826a3a6e` preparation bookmark. Worker rollback must preserve newer customer data; do not restore an old full database over it.
- Paid gates are retired; all tools remain free, studio PDF export needs a free account, converter remains local and ads remain disabled.
- Physical print/barcode-scan acceptance, recovery-email delivery and sustained/image-heavy production-capacity acceptance remain unperformed. Local mobile Lighthouse scores are lab evidence across different hosting environments, not field Core Web Vitals or revenue proof. Seven SEO page ideas remain unpublished briefs.
