# Label Ninja current state

## Start here (2026-10-01)

- Owner decision (Chris): payment system and Stripe removed; everything is free; revenue = ads only. Ads are OFF (public/js/ads-config.js enabled:false) pending his call.
- This lane: worktree C:\Code\label-ninja.com\lane-free-20261001, branch lane/free-everything-20261001, base d354b16. NOT YET DEPLOYED, not committed or pushed; awaiting Ready Check.
- Live production is still ceb6a67 / Worker eacac403-fbac-4484-bd6f-24398f2232cf (10-batch quota + paywall) until this lane ships.
- Removed: all billing/Stripe/entitlement modules, dead src/index.js bundle, paywall/pricing/plan frontend, upgrade-flow tests. Billing DB tables dormant, no migration.
- Export: no quota; free account still required (401 without session); 30 exports/hour (429), 200 pages/batch kept. /api/auth/me reports plan:"free", unlimited:true; billing routes 404.
- New: free in-browser /shipping-label-to-4x6 (public/js/label-crop/*, vendored pdfjs 4.10.38 + pdf-lib 1.17.1, no upload/account); guides ebay-shipping-label-not-4x6, print-amazon-return-label-4x6, 8-5x11-shipping-label-to-4x6; rewritten home, Whatnot pages, privacy, terms; sitemap 9 URLs; robots disallows /api/.
- New src/redirects.js: www/http -> https://label-ninja.com 301 (308 non-GET); /pricing, /billing -> / 301. wrangler.toml run_worker_first = true; npm run dev uses --local-upstream localhost:8787.
- Evidence: npm test pass (spec-builders, redesign-contract, launch 52, Whatnot 105); test-label-crop 13 pass; dry-run bundle 976 KiB. No Chrome Ready Check yet.
- GSC baseline (90d pre-lane): ~150 impressions, 13 clicks; "shipping label generator" pos 9.7, "whatnot sorting labels" pos 7.4.
- Next: Ready Check -> approve -> commit + clean release deploy -> RUNBOOKS verify + canary -> GSC sitemap resubmit/inspect. Chris: delete STRIPE_* secrets + disable Stripe webhook after deploy; decide ads.
- Superseded $9 Stripe candidate preserved at C:\Code\label-ninja.com\label-ninja\backups\uncommitted-9usd-candidate.bak-20261001-154856.patch.

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
