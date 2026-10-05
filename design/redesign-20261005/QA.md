# Packing Bench — completed candidate

Chris approved this direction on October 5, 2026. The full implementation is available at
[the local preview](http://localhost:8797/), opened in Chrome. Nothing has been deployed.

## What changed

Warm packing paper, a cut-label brand mark, local typography, measuring details and a
complete dark theme now connect every page and tool. The homepage starts with a working
printing-job picker. Phone tools put their preview and export before optional controls.
The editor supports keyboard selection and movement, explicit last-stock reuse and
collapsible controls. Search accepts Ctrl/Cmd+K and links to real tools and fixes.
The sourced printer selector filters six models and compares two. Guides lead with the
symptom and fix. Account, legal and error views use the same system.

The interface entry and changed view imports have explicit cache versions so returning
visitors receive the redesigned markup and styling together. Existing numerical sizes,
preset values, rendering, auth and server export behavior are
preserved. Two incorrect DYMO names were corrected in the interface: 30334 belongs to the
2.25 x 1.25 preset; 2 x 1 is generic Product / FNSKU. See the
[manufacturer's dimensions](https://www.dymo.com/labels-tapes/labelwriter-labels/dymo-labelwriter-multi-purpose-labels/SAP_30334.html).

## Verification

| Mobile Lighthouse page | Live baseline P / A / BP / SEO | Final local P / A / BP / SEO | Final LCP | Final CLS |
| --- | --- | --- | --- | --- |
| Home | 99 / 97 / 92 / 100 | 95 / 100 / 96 / 100 | 2.79 s | 0 |
| Converter | 89 / 100 / 92 / 100 | 97 / 100 / 100 / 100 | 2.04 s | 0.00039 |
| eBay print-size guide | 91 / 100 / 92 / 100 | 98 / 100 / 100 / 100 | 1.84 s | 0 |

These are Lighthouse 13.5 mobile lab runs. The baseline uses production and the candidate
uses loopback, so their speeds are not a controlled comparison or field Core Web Vitals.
Home's best-practices deduction is the existing signed-out `/api/auth/me` 401. All final
runs have no warnings, accessibility failures or SEO failures. Font trace evidence and
before/after JSON are in `evidence/lighthouse/`; the mono-font preload resolved a measured
breadcrumb wrap. Local fonts total 89,324 bytes and carry their OFL licenses.

- All ten canonical pages were checked at 390 CSS pixels in both themes, plus the 404:
  one visible H1 and no page overflow. Actual account and comparison dialogs also fit.
- Browser checks cover theme persistence, search/no matches/Escape and focus restoration,
  two-printer selection limits and filters, editor arrow movement and draft preservation,
  Whatnot range validation and settings transfer, signed-in account and sign-out.
- A real converter sample download is one 288 x 432 pt page (4 x 6 in).
  A studio Whatnot UI download is three 216 x 144 pt pages (3 x 2 in).
  Both PDFs are saved under `evidence/`.
- The local B3 integration proves three-page bin PDF geometry, idempotent export,
  authenticated downloads and eleven free exports. It created two synthetic local users
  and twelve expiring PDFs; the browser check added one Whatnot PDF to the same local user.
  No customer account or external email was used.
- Final tests pass: 70 builder checks, DOM contract (51 queried IDs / 18 handlers),
  52 launch checks, 131 Whatnot checks, 79 routing checks, 11 affiliate links and 23 cropper tests.
- Worker dry run passes with 109 assets, 983.15 KiB bundle / 244.77 KiB gzip and the expected
  DB, ASSETS and APP_ORIGIN bindings. Logs are in `backups/packing-20261005/final-*.log`.
- The independent source audit records URLs, metadata, affiliate preservation and print
  geometry in `evidence/packing-source-audit.md`. Actual desktop captures and final mobile
  Lighthouse captures are under `screens/`.

## Publication boundary

The source remains an uncommitted reviewable candidate in the isolated site-improvement
lane. No production deployment, GitHub push or Amazon account change occurred. The existing
Associates configuration still records `websiteListed:false`; public release stays gated
on approval to register the domain and deploy this exact candidate. Physical printer and
barcode-scanner acceptance remain unperformed. The seven new-page ideas in `SEO_STRATEGY.md`
remain briefs, with no invented public URLs or sitemap entries.
