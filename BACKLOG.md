# Label Ninja backlog

## Packing Bench release (2026-10-05, deployed)

- [x] Chris approved Packing Bench; locked DESIGN.md and implemented shared tokens/fonts/themes/nav/search/footer across the full site.
- [x] Job-first home, preview-first editor/batch tools, accessible element movement/explicit stock reuse, qualified printer filtering/two-item comparison, scannable guide/legal/404 treatment.
- [x] Preserve existing URLs/SEO metadata/anchors/control semantics, all eleven affiliate links/config and label/PDF/crop geometry; two truthful preset display-name corrections preserve keys/numeric settings; source report in design/redesign-20261005/evidence/packing-source-audit.md.
- [x] Local npm/HTTP/B3 integration checks and 23 converter fixtures; 390px DOM checks on every canonical in both themes, plus dark 404. Comparison dialog/Escape and actual one-page 4x6 sample download checked.
- [x] Saved mobile Lighthouse score targets met: local home95/100/96/100, converter97/100/100/100, guide98/100/100/100 (P/A/BP/SEO); final guide lab CLS 0 after all three fonts are preloaded.
- [x] Final browser theme/search/comparison/editor/draft/Whatnot/account checks and real Whatnot UI PDF (three 216x144pt pages); final npm/cropper/dry-run exit 0, actual preview opened in Chrome. QA.md records bounded results.
- [x] Freeze v2; final release preserves 120 protected frozen rows with only approved config registration metadata changed. 98 physical public files include two deployment-control files; 96 actual served asset hashes pass.
- [x] Chris approved unchanged v2 deploy/site registration and then explicitly authorized “No” for all three Associates properties. Saved listing readback and eleven-link release gate pass; deployed commit 2d78018 as Worker b7eb4353. Approved source is synced to origin/lane/site-improve-20261004-labelninja; github-source-push.log records success. No master push/merge/PR.
- [x] Live desktop/phone home/editor/converter, corrected stock names, fanfold filter/reset and two-Rollo comparison/selection clearing pass; Worker 100% confirmed. HTTP/source/canary evidence is complete in DEPLOYMENT_PACKING_2D78018.md. Browser receipt: live-browser-final.json; reviewed public home is left visible at restored desktop viewport, owner session untouched.
- [ ] Optional Worker event observation: tail is UNVERIFIED (no sample/connected:false). Automatic review rejected corrective pretty-mode attempt under one-attempt boundary rule; do not retry without fresh authority. This does not block the completed core deployment.

## Affiliate candidate and next content (2026-10-05)

- [x] Local: tag all six existing printer shopping links; add five compatible-stock/holder links with disclosures; keep source links ordinary and tools free.
- [x] Local: sitewide affiliate audit and release registration gate; update privacy/terms and truthful shopping copy.
- [x] Add/verify Label Ninja in selected Associates store discountd0247-20 after explicit owner declaration authorization; saved list persisted after reload, config websiteListed:true and release audit passes.
- [x] Live served public bytes, tags/disclosures and deployed Worker receipt verified: DEPLOYMENT_PACKING_2D78018.md and backups/packing-release-20261005/. Registration/tag presence is not purchase evidence.
- [ ] Next content brick: Whatnot label stock buying guide; exact brief and sources in SEO_STRATEGY.md. Then native Sorting Labels not-printing guide.
- [ ] Follow-up: label cost calculator, Rollo skipping-labels guide and fanfold-vs-roll desk guide; all demand hypotheses until measured.
- [ ] Existing SEO discovery: inspect/link guides hub, eBay and Amazon return guides; GSC says those three are unknown, not the whole site.

## Historical free-everything build backlog (2026-10-01; deployed later that day)

- [x] Remove payment system, Stripe, quota and paywall; keep free account + abuse limits for studio export; billing tables left dormant.
- [x] Free in-browser /shipping-label-to-4x6 converter, three 4x6 guides, rewritten home/Whatnot/privacy/terms, sitemap 9 URLs, canonical and legacy redirects.
- [x] npm test (52 launch, 105 Whatnot), test-label-crop 13, dry-run 976 KiB.
- [ ] Chris: Ready Check of the lane in Chrome (desktop + phone), then approve/deny deploy.
- [ ] Agent, after deploy: RUNBOOKS.md release verification (routes, redirects, /vendor cache) and production canary.
- [ ] Chris/agent, after deploy: resubmit sitemap in Search Console and URL-inspect /shipping-label-to-4x6 and the three new guides; re-read at 28 and 56 days (gate in SEO_STRATEGY.md).
- [ ] Chris: delete STRIPE_* Worker secrets (if any) and disable the Stripe webhook endpoint; revoke the previously exposed test key.
- [ ] Chris: decide ads on/off (public/js/ads-config.js enabled:false). Ads need a privacy/terms disclosure and their own Ready Check.

## Next product work

- [ ] Consider optional-account export (anonymous studio PDFs) now that nothing is metered; needs its own abuse limit design.
- [ ] Maintain the 700-line public/index.html contract; app-only views are already modular. Future large editorial additions should be separate static pages.
- [ ] Physical Rollo 4x6 and tiny-stock print/scan acceptance, including converter output (Chris).
- [ ] Verified recovery-email sender and a successful inbox/reset test.
- [ ] Measure CPU/memory, image-heavy jobs and sustained load; free exports may raise volume.

## After launch / scaling

- [ ] Email verification and stronger signup abuse controls; evaluate account takeover/recovery policy.
- [ ] Automated monitoring and alerts; paging destination needs owner choice.
- [ ] R2 output storage and adaptive cleanup throughput once volume warrants it.
- [ ] Self-service verified account deletion and explicit operational retention policy.
- [ ] Replace inline handlers, tighten CSP, vendor browser dependencies or add SRI.
- [ ] CSV import with its own specification and tests. Do not advertise before implementation.
- [ ] International text/font coverage and physical barcode acceptance across printers.
- [ ] Retire or redirect the old static Pages mirror after explicit approval.
- [ ] Optional cleanup migration to drop dormant billing tables/columns, only after the free release has been stable.

Completed history (upgrade journey, Whatnot launch, compatibility release, paid-offer hardening) lives in DECISIONS_LOG.md and LAUNCH_READINESS.md.
