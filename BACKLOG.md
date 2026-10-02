# Label Ninja backlog

## Free-everything lane (2026-10-01, NOT deployed)

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
- [ ] Split public/index.html (952 lines) into smaller templates/partials per Hard Rule 11.
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
