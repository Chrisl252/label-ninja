# Label Ninja current state

## Start here (2026-10-06 docs sweep) - READ: live is NOT this branch

- **LIVE = Packing Bench release 2d78018** (Worker b7eb4353-a631-45b0-b0b1-b88cdea0dafc, deployed 2026-10-05) from branch `lane/site-improve-20261004-labelninja`, worktree `C:\Code\label-ninja.com\lane-site-improve-20261004` (pushed to origin as that branch; NOT merged to master). Its PROJECT_STATE is the detailed live record.
- **This checkout (`master`, 83e9e24 + docs) is BEHIND live.** Deploying from master would revert the Packing Bench identity, the 10-04 SEO/perf fixes and the Associates registration config. Merge the lane into master (Chris OK) before any deploy from here.
- Verified 2026-10-06: https://label-ninja.com returns 200. Everything free, no Stripe, no quota; ads still off (CSP decision open).
- HANDOFF.md's "next = Stripe test provisioning" is obsolete since the 2026-10-01 free-everything ruling.

## Previous start here (2026-10-01, v2 LIVE - superseded by Packing Bench 10-05)

- LIVE: commit ab63404 (branch lane/pages-v2-20261001, worktree C:\Code\label-ninja.com\lane-free-20261001), Worker version 1f8eb5e4-8713-47ca-bbbd-579f3d62a450 on label-ninja.com + www. Pushed to origin/master.
- Rollback: Worker 28e897a3 (v1 free build, 03a1229); before that eacac403 (old paywall build).
- Product: everything free, no Stripe, no quota; studio export needs a free account (401 without session); 4x6 tool is local-only, no account. Ads OFF — enabling needs a looser CSP on SEO pages, which the permission classifier blocked; Chris must explicitly approve that trade-off.
- v2: real 404s (not_found_handling=404-page + src/static.js SPA allowlist /account,/reset), shared site-header + breadcrumb (public/css/site.css), /guides/ hub, favicons/OG images/manifest, sitemap 10 URLs, home landing + FAQ schema, index.html 685 lines, one-modal free signup, no CDN deps, 4x6 tool 2/4-up sheets + packing slip + sample + paste + prefs.
- Live evidence: 19 legit routes 200; /nope-xyz + /guides/nope 404 with X-Robots-Tag noindex; /pricing 301; www 301; /guides 307 -> /guides/. npm test exit 0 (launch 52, whatnot 128, routing 79, contract, spec-builders); test-label-crop 23 pass.
- Any new real front-end path must be added to SPA_PATHS in src/static.js or it 404s.
- GSC: submit sitemap + inspect /guides/ and /shipping-label-to-4x6 in the UI (API token read-only). Baseline 90d: ~150 impr, 13 clicks. Check at 28/56 days.
- Next: decide ads/CSP; GSC sitemap submit + 28/56-day check. 2026-10-01: old checkout C:\Code\label-ninja.com\label-ninja DELETED on Chris's order; this folder is now the ONLY copy (standalone repo, master tracks origin). Its backups/.dev.vars/old deploy notes are in backupsold-checkout-*.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Evidence: LAUNCH_READINESS.md. Backlog: BACKLOG.md.

## History

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
