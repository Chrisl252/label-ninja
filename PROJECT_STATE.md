# Label Ninja current state

## Start here (2026-10-05, Packing Bench live; Worker tail unverified)

- LIVE: Packing Bench commit 2d78018eff0890e4622b6382536296b4a251d8d8, Worker b7eb4353-a631-45b0-b0b1-b88cdea0dafc, on https://label-ninja.com and www. Approved release 2d78018 is synced to origin/lane/site-improve-20261004-labelninja (github-source-push.log); no master push/merge/PR.
- Canonical source: C:\Code\label-ninja.com\lane-site-improve-20261004; branch lane/site-improve-20261004-labelninja. Release checkout: backups/packing-release-20261005/release-checkout (detached, clean).
- Chris approved the exact v2 deploy/site registration and then explicitly authorized “No” for the audience declaration covering all three listed properties. Associates confirm succeeded; reloaded saved list includes all three in store discountd0247-20. Config websiteListed:true; eleven-link release gate passed.
- Release input preserves all 120 protected frozen rows; config/affiliates.json is the sole approved metadata exception. Source and isolated release hashes match; raw frozen bytes preserved.
- Deploy exit 0: 96 assets (83 uploaded / 13 existing), 977.15 KiB / gzip 244.57 KiB, startup 22ms; DB/ASSETS/APP_ORIGIN, existing apex/www and */15 cleanup schedule.
- Live verification passes: 101 GET checks / 96 served asset SHA-256 matches, 15 launch checks and 31 route GET checks. Two deployment-control files are local-only hashes.
- Production canary passes 17 checks: register/sign-in, replay, exact 3/200-page 288x432pt PDFs, synthetic project lifecycle and sign-out; no payment/email or customer-account change.
- Synthetic footprint: ln-release+20261005225131@bisket.com; two expiring PDFs remain, its one project deleted, final sign-out. Do not expose generated credentials.
- Live Chrome: desktop 1902 x 902 has correct versioned entry, no overflow/runtime errors; phone 390 x 844 home/editor/converter each has one H1/no overflow. Corrected stock names, fanfold filter 3/6 → reset 6 and Rollo two-printer comparison pass. live-browser-final.json records runtimeLogEntries:[]; normal viewport restored and reviewed public home left visible. Owner session/content unchanged.
- Recovery: rollback Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450; immediate pre-deploy D1 bookmark 00000bf1-00000000-000050fb-4443b3e89188447ff7bd7b371a8e9d1f supersedes earlier bef bookmark. No pending/applied migration for this release; preserve newer data on rollback.
- Everything stays free; studio exports need a free account, cropper stays local, ads OFF. Physical print/scan acceptance and recovery-email/capacity checks remain unperformed product limits.
- Worker traffic is 100% (deployments-after.log; deployment 2026-10-05T22:50:45.722Z). Tail UNVERIFIED: no event sample; correction rejected by automatic review under one-attempt boundary rule. No retry; optional follow-up requires authority. Next separate brick: SEO content; seven briefs remain unpublished.

Canonical receipt: DEPLOYMENT_PACKING_2D78018.md. Raw evidence: backups/packing-release-20261005/. Module map: ARCHITECTURE.md; procedures: RUNBOOKS.md.

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
