# Label Ninja current state

## Start here (2026-10-05, Packing Bench frozen; release approval pending)

- Active source: C:\Code\label-ninja.com\lane-site-improve-20261004, branch lane/site-improve-20261004-labelninja, base 379fb71; uncommitted candidate. Preserve the other lane's unrelated dirty work.
- Chris approved Packing Bench. Full-site warm-paper/light-default and dark design is implemented: shared fonts/nav/search, job-first home, preview-first studio, printer filtering/comparison, guides and legal/recovery pages. DESIGN.md is the approved contract.
- Actual full-stack preview: http://127.0.0.1:8797/. Proposal board on 8809 is historical mockup review, not the working site or a cloud preview deployment.
- Everything remains free; studio PDF export/saved projects need a free account, shipping PDF/image cropper is local/no account. Ads OFF; no new ZPL, PNG download or DPI-output control.
- Verified locally: npm suite, 23 converter fixtures, HTTP/DB/header checks and B3 integration with a three-page 4x6 PDF. Source audit preserves ten canonical pages/404, existing controls/anchors, eleven affiliate links/config and output geometry. Only two preset display names were corrected; keys/numbers are preserved.
- 390px DOM checks: ten canonical pages in both themes plus dark 404, no page overflow and one visible H1. Browser theme/search/comparison/editor/draft/Whatnot/account flows pass; real converter and Whatnot UI PDFs verified (288x432pt one page; 216x144pt three pages).
- Saved mobile Lighthouse (P/A/BP/SEO): live before home99/97/92/100, converter89/100/92/100, guide91/100/92/100; local after home95/100/96/100, converter97/100/100/100, guide98/100/100/100. These are different hosting environments.
- Final saved lab CLS: home0, converter0.000393, guide0 after all three font preloads. Final npm/cropper/dry-run exit 0. Physical printer/scan acceptance remains unperformed.
- Chris still owns Associates website registration and final-candidate deployment approval. config/affiliates.json has websiteListed:false; release affiliate gate remains closed. No push, deploy or external account change.
- Ready for approval: frozen 121-file candidate (98 physical public files) in backups/packing-20261005/release-candidate-v2/, matching release-candidate-v2-sha256.json. Final evidence: design/redesign-20261005/QA.md and evidence/packing-source-audit.md; earlier affiliate history retained.
- Seven unpublished SEO briefs remain in SEO_STRATEGY.md; next content is Whatnot label stock, then native Sorting Labels troubleshooting. GSC traffic is not affiliate purchase evidence.
- Last recorded public release: October 1 source ab63404 / Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450. Re-read actual Cloudflare version before release. Article URLs are static HTML; only account/reset use SPA fallback.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Remaining work: BACKLOG.md and HANDOFF.md.

## History

### Earlier October 5 direction-review snapshot (superseded by approved implementation)

- Active source: C:\Code\label-ninja.com\lane-site-improve-20261004, branch lane/site-improve-20261004-labelninja, base 379fb71; uncommitted candidate changes. Former label-ninja checkout was deleted by Chris October 1; preserve lane-free-20261001 and its unrelated dirty PROJECT_STATE.md.
- Chris requested a full tool-first redesign. His attached brief explicitly gates implementation on approval of 2–3 directions. Audit and Packing Bench / Cut Line / Dispatch Desk mockups are in design/redesign-20261005/; review board http://127.0.0.1:8809/index.html, opened in Chrome. Packing Bench recommended; direction NOT approved.
- All 87 public assets still match the frozen affiliate candidate. No production source, output, URL or affiliate-config change in this design slice. 24 mockup shots cover desktop/mobile and light/dark; ten live baseline shots and ten-page source SEO metadata saved. Default-state text contrast and mockup interaction/viewport checks passed; Lighthouse/full WCAG/output acceptance remain unmeasured.
- Product remains free; studio export needs a free account; cropper is local/no account. Ads OFF. No API, auth, export, database schema, CSP or payment changes in this brick.
- Chris authorized appropriate affiliate links and new-page ideas October 5. Local candidate: six existing printer links tagged + five supply links, same-section disclosures and privacy/terms updates. Manufacturer support links stay ordinary.
- Amazon tag discountd0247-20 verified in signed-in Chrome October 5. Label Ninja is NOT listed in that selected store's website list. No account changes made; registration and deployment require approval.
- npm test passes (builders, DOM contract, 52 launch, 129 Whatnot, 79 routing, affiliate audit 11 links); cropper 23 tests pass. HTTP gate passes with local DB healthy and security headers. Worker dry run passes with DB/ASSETS. Release affiliate gate intentionally fails on missing site registration.
- Chrome: tagged anchors/disclosures checked; home, Whatnot and converter fit a 355 CSS-pixel phone viewport without page overflow. Supply-checklist hash opens guides and its heading clears sticky navigation. Existing reset view renders with a fake local token; no reset submitted.
- Exact preview: http://127.0.0.1:8797/#best-label-printers (local Wrangler PID 2704, local D1 migrations only). Backups/logs and frozen public asset hashes: backups/affiliate-20261005/. Temporary Wrangler registry is kept there to avoid sandbox writes to shared user config.
- Next Chris action: choose the redesign direction; agent then implements reviewable slices from the attached brief. Associates registration and final-candidate deployment remain separate pending approvals; no account change, push or deploy yet.
- New page briefs: SEO_STRATEGY.md lists seven; start with Whatnot label stock, then native Sorting Labels not printing. Briefs are not public URLs or sitemap entries.
- GSC September 6–October 3: 14 clicks/221 impressions, Whatnot tool 7/94. Guides hub/eBay/Amazon return guides unknown to Google; improve discovery before broad shipping expansion. Traffic is not affiliate purchase evidence.
- Last recorded v2 release October 1: source ab63404, Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450. Re-read actual Cloudflare version before release; older paid receipts below are historical.
- Real article paths are static HTML assets. Add only SPA deep links (/account,/reset) to SPA_PATHS.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Evidence: LAUNCH_READINESS.md. Backlog: BACKLOG.md.

### Previous start here (2026-09-06; deployment evidence Sep 7 UTC)

- LIVE: approved upgrade-flow repair ceb6a67b6dfa8fe3634b53fa0d1fbfe7d091c877, Worker eacac403-fbac-4484-bd6f-24398f2232cf, on label-ninja.com and www. Receipt: DEPLOYMENT_UPGRADE_CEB6A67.md.
- Preserves the already-live Whatnot feature from 79842db. Paywall opens pricing in the same document; return restores the same tool and draft; pricing shows actual allowance and focuses the offer on deliberate entry.
- Both domains: all 41 public file hashes match approved source; route/header/DB/offer gates pass. Live synthetic account/PDF/project canary passes 17/17; sanitized health/pricing tail: two ok outcomes, zero exceptions.
- Live browser: SHIP-21 through SHIP-75 on 3x2 stock survives pricing -> return; 55 labels / 1 PDF batch, no warnings/errors. No mutation of the owner's account.
- Offer unchanged: 10 PDF batches TOTAL, then $9.99 USD/month. Production pricing remains configured:false, mode:test; --require-live-billing correctly fails. Payment/recovery setup is the next revenue brick.
- Release gate: 61 builders, DOM contract, 60 launch, 87 Whatnot and 25 upgrade checks pass. Earlier local runtime, real D1/PDF/quota integration and phone UI checks passed. No post-approval product edits.
- Clean isolated release: backups/release-upgrade-20260907. Exact reviewed bytes retained across Git newline normalization. Worker bundle 995.30 KiB / gzip 248.99 KiB; startup 31 ms; existing DB/ASSETS/APP_ORIGIN and cleanup schedule.
- Rollback target: Whatnot Worker 99bd8c27-c9e0-479d-b418-08727ff37aa3. Pre-release D1 bookmark: 00000072-00000000-000050df-86835d5328f34df70c38e7fd61fec466. No migrations pending or applied.
- Canary footprint: ln-release+20260907053132@bisket.com, two expiring PDFs, 8 batches remaining; its synthetic project deleted. No payment/email or customer record change.
- No provider credentials, pricing, hosting plan, DNS or GitHub push changed. Saved projects remain necessary for durable drafts across full reload/external checkout.
- Earlier Stripe handoff records an owner identity/payout task and exposed test key; this release did not recheck the dashboard. Do not ask for the previously nonexistent credential file or copy old keys.
- Other paid-launch gates: recovery delivery, real checkout/webhook/portal lifecycle, key rotation, operations/capacity, terms review and physical Rollo/tiny-stock acceptance.
- Preserve prior release worktrees, DEPLOYMENT_WHATNOT_79842db.md, public/_preview-tools.html and unrelated scratch files. Canonical source remains C:\Code\label-ninja.
