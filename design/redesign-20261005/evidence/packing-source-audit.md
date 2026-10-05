# Packing Bench source and preservation audit

Reviewed October 5, 2026; final source recheck at **22:23:35 UTC**, after shared header reservation, font preloads and `packing-20261005c` resource versioning. This is a local source audit of the approved Packing Bench candidate, not a production, Search Console, physical-print, Lighthouse or full WCAG acceptance receipt. No production file, browser session, external account or deployment was changed by this audit. Findings were sent to the implementation owners; their small fixes are identified below.

## Result

No material source regression found in the ten canonical pages plus the 404 recovery page. Existing metadata, canonical URLs, JSON-LD, IDs, links, affiliate destinations, control semantics and output modules are preserved. All current tools remain PDF tools; the redesign adds no ZPL renderer, PNG download or DPI-output control.

| Check | Evidence/result |
| --- | --- |
| Frozen HTML comparison | All 10 pre-edit backups match the SHA-256 values in `seo-before.json`. |
| Titles, descriptions, canonicals, robots metadata | 10/10 canonical pages equal their verified pre-edit HTML; one self-canonical per page. |
| JSON-LD | All 11 canonical-page JSON-LD blocks parse and are equal as JSON objects before/after. No schema added to the 404. |
| Existing HTML IDs | No prior ID removed; no duplicate HTML ID in any audited page. New mode-heading IDs are additive. |
| Internal links and assets | No missing local routes, linked assets or fragment targets found. Existing SPA tool hashes are treated as routes, not DOM IDs. |
| Accessible references | No missing `for`, `aria-labelledby` or `aria-describedby` target in audited HTML plus mounted view markup. |
| Existing controls | All 71 prior identified input/select/textarea/button controls preserve type, name, default value, range, file acceptance and event attributes; existing select values/default states match; two editor display labels were corrected. No prior inline event handler removed. |
| Affiliate links | All 11 href/rel/target/data-affiliate tuples match before/after: homepage 9, converter 1, Whatnot landing 1. |
| Sensitive output/config files | 10/11 byte-identical; presets.js changes exactly two display names. Every key/numeric value and numeric helper remains identical. |
| Complete converter implementation | All 13 `public/js/label-crop/` modules equal the frozen affiliate candidate. Both standalone Whatnot JS modules also match. |
| Sitemap and crawler/security files | All ten sitemap URLs retained. Sitemap, robots.txt, headers/CSP, ads configuration, ads.txt and webmanifest are byte-identical to the frozen affiliate candidate. |
| Server/dependency changes | `git diff --numstat -- src package-lock.json wrangler.toml` returns no changes. No new UI framework, backend route, auth/payment/API or deployment configuration. |
| Fonts | Three local WOFF2 files, 89,324 bytes total, `font-display:swap`, compact Latin-focused character maps and accompanying OFL licenses. No Google Fonts request in audited HTML. |

## Baseline and method

`design/redesign-20261005/evidence/seo-before.json` captured the **local affiliate candidate** at `2026-10-05T20:50:47.509548+00:00`; it is not a live production SEO baseline. The source audit reads the HTML with Python's `HTMLParser`, limits the document title to `<head>`, compares decoded meta/canonical values and parsed JSON-LD, records main/hidden ancestry for H1s, and resolves internal links against canonical paths and actual local assets. Mounted editor/account/overlay markup is included when validating root-document references.

The original snapshot's `title` field also captures SVG `<title>` text on several pages. That capture defect is handled by comparing real head titles from **SHA-matched pre-edit HTML**, rather than mistaking illustration titles for a changed SEO title. Before sources are:

- Homepage: `backups/packing-20261005/index.html.bak-20261005-145322-home-printers`.
- Nine other canonical pages and 404: backup paths in `backups/packing-20261005/content-before-20261005-145340.json`.
- Public JS/security manifest: `backups/affiliate-20261005/review-public-sha256.json` (87 files).
- Output/config manifest: `backups/packing-20261005/tool-output-before-20261005-145059.json`.

The public manifest comparison has 29 changed presentation/HTML/navigation/preset-label files and 11 additions: three WOFF2 fonts, three OFL licenses, `home.css`, `printers.css`, `home-picker.js`, `packing-tools.js` and `printer-picker.js`. No frozen file is missing. The redesign is intentionally no longer byte-identical as a whole; the preservation checks isolate protected behavior and output.

## SEO before/after

The title below is the true head title. Title, description, canonical, robots and JSON-LD are unchanged on every row. Static H1 text is unchanged except the deliberate task-first homepage heading; tool headings are additive improvements in hidden SPA modes.

| Canonical path | Preserved head title | Current default-page H1 |
| --- | --- | --- |
| `/` | Free Thermal Label Maker – 4x6, Bin & FNSKU \| Label Ninja | What are you printing? |
| `/shipping-label-to-4x6` | 4x6 Shipping Label Converter, Free, No Upload \| Label Ninja | Shipping Label to 4x6 Converter |
| `/whatnot-labels` | Free Whatnot Number Labels & Tags (PDF) \| Label Ninja | Free Whatnot number labels |
| `/guides/` | Thermal Label Printing Guides \| Label Ninja | Label printing guides |
| `/guides/8-5x11-shipping-label-to-4x6` | Convert an 8.5x11 Shipping Label to 4x6 (Free) | Convert an 8.5×11 shipping label to 4×6 |
| `/guides/ebay-shipping-label-not-4x6` | eBay Shipping Label Not 4x6? Fix the 8.5x11 Format | eBay shipping label not printing 4×6? |
| `/guides/print-amazon-return-label-4x6` | How to Print an Amazon Return Label on a 4x6 Printer | How to print an Amazon return label on 4×6 |
| `/guides/whatnot-labels-printing-too-small` | Whatnot Label Too Small, Cropped or Sideways? 4x6 Fix | Whatnot labels printing too small? Here is the fix |
| `/privacy` | Privacy Policy \| Label Ninja | Privacy policy |
| `/terms` | Terms of Use \| Label Ninja | Terms of use |

All pages retain their existing robots configuration. The homepage has no explicit robots meta, as before; absence is not an added `noindex`. The other indexable pages retain their previous values. Actual HTTP status/X-Robots behavior must be verified against the running candidate, separately from this source check.

The recovery page preserves `Page not found | Label Ninja`, its description, no canonical, and `noindex,follow`. Its visible H1 changes to “This page didn't print”. `src/static.js` still returns a real 404, adds `X-Robots-Tag: noindex` and `Cache-Control: no-store`, and permits only `/account[/]` and `/reset[/]` through the SPA fallback. No redirect is introduced by this redesign; existing canonical-host/retired-billing redirects remain in unchanged server code.

H1s now exist once per app mode: home, bin, Whatnot, FNSKU, embedded printer guides, editor, dashboard and account. Only home is unhidden in default root HTML. The presence of hidden mode H1s is not evidence of multiple simultaneous page headings; route/session code controls visibility. Current dynamic view headings are “Make a label that fits.”, “Back to the packing bench.” and “Your account”.

All prior fragment IDs survive, including `free-tools`, `faq`, `printer-setup-checklist`, `best-label-printers`, `label-supplies`, `seo-keywords`, `rollo-setup`, `zebra-setup` and `dymo-setup`. The added `label-sizes` section has matching home-mode routing. Existing bin/Whatnot/FNSKU deep hashes retain their routes. Printer cards, verdicts, sources and shopping anchors remain static HTML; filtering only hides cards after user-selected criteria.

Guide visible published/updated dates and Article dates remain October 1. The comparison visibly says “Specifications checked October 5, 2026” and qualifies variable Amazon search results. The seven proposal briefs remain at `SEO_STRATEGY.md:61`; their proposed paths are still absent from the sitemap. They remain briefs, not published pages. No frozen full-file hash for the SEO plan itself was supplied, so its seven current brief rows were checked directly rather than claimed byte-identical.

## Output preservation

Ten SHA-256 values below match the pre-edit tool-output snapshot exactly. The current presets.js hash differs only for two corrected display names; this intentional exception is proved below.

| File | SHA-256 |
| --- | --- |
| `public/js/app/editor.js` | `92f652c2d994c17fac4b19e804fb8832b2d51c4896329f963bbcaae7f0399658` |
| `public/js/app/spec-builders.js` | `9ba6292863af46719c1b67e95884f73352009cdcb9f9b778cdd97ba7f25b7635` |
| `public/js/app/barcode-svg.js` | `315d807b8ade664fdc670edb38b5f2a24f71cd3e081a90ece1c2cad23c50ab30` |
| `public/js/app/live-previews.js` | `9031539872dafaf2f6dbbaf6613ac89cda68d57b1960dd9d8c845b49d6813690` |
| `public/js/app/presets.js` | `3f0ed4aabcd196a0088f6cc1723507202d40b2543a93ae1b2c21f0f36e9e8c30` |
| `public/js/app/exporter.js` | `8fe38d9779674c0d7e612b55ef5a0e1af6c8c42c86a3267365a3f2d6d737df4c` |
| `public/js/label-crop/geometry.js` | `abfaa004893c071a9f46e7cf234e76bafc1a558ef5949acf1e0a358798b57bff` |
| `public/js/label-crop/output.js` | `cc866b5099ef855c2f06fa87fc7e1d9321f9d7ca8294aca3e378fbe37eaa4d0a` |
| `public/js/label-crop/cropbox.js` | `e4517b648ac48ca3418459841795b90c6b4fb0eb0dc3ae4217b17541159bfc5d` |
| `src/render/pdf-label.js` | `49d324a384e41d2eddbd11084c60ddbdb8ceaf7dd4a4a4f0ba3900f12d8b181a` |
| `config/affiliates.json` | `82cc345ea88aecd8402323993b75d4a25120b8ad527725b78f64e1089de8d954` |


The pre-change presets backup SHA is `8591455ac8c21073822e5d3aff58d9d0de1aface3cbe3f3842c275fc0932b9b5`, exactly the original snapshot. Its only changes are `2.25x1.25 Dymo 30336` → `2.25x1.25 DYMO 30334` and `2x1 Dymo 30334` → `2x1 Product / FNSKU`. Replacing only `name` string literals with a placeholder makes the entire before/after source identical. All preset keys, canvas width/height, printWidth/printHeight, Whatnot stocks, bin layouts and clampNumber source are unchanged. Matching editor option labels and the homepage stock row were corrected; option values/defaults stay the same. No preset display name is consumed by the PDF specification builder. The spec-builder/barcode fixture suite passed again after this correction.

The editor `.canvas` physical block and all five `.canvas-element*` CSS blocks equal their initial Packing Bench backups. The canvas still uses Helvetica/Arial/Liberation Sans to track PDF Helvetica; shared `.stock` adds no geometry-changing border/padding. Batch `.sample*` size/layout rules match their backups; surrounding interface fonts and panels intentionally use the new tokens. This is source/fixture evidence, not a claim that browser sample glyphs or printed pixels have been physically compared.

Commands rerun by this reviewer:

```text
node --check public/js/app/home-picker.js
node --check public/js/printer-picker.js
node --check public/js/app/packing-tools.js
node --check public/js/site-nav.js
  -> exit 0

node scripts/test-spec-builders.mjs
  -> ALL SPEC-BUILDER TESTS PASSED
  -> includes CODE128 preview/PDF bar equality, physical dimensions and editor coordinates

node scripts/test-label-crop.mjs
  -> 23 tests passed
  -> includes vector PDF and image-to-PDF page geometry, rotation and multi-label output

node scripts/check-affiliates.mjs
  -> totalLinks: 11; websiteListed: false; errors: []
  -> Local content checked; registration and publication remain pending.
```

## Fonts and helper review

`public/css/tokens.css:2`–`:4` declares local `font-display:swap` faces. FontTools opened each actual WOFF2 and inspected the name/cmap/weight tables:

| Font | Bytes | Glyphs / mapped codepoints | Font-table result |
| --- | ---: | ---: | --- |
| Barlow Condensed Bold | 22,444 | 272 / 227 | Static bold; complete printable ASCII, ×, en dash and em dash. |
| IBM Plex Sans | 45,712 | 270 / 232 | Variable `wght` axis 100–700; same required character coverage. |
| JetBrains Mono Regular | 21,168 | 394 / 229 | Static regular; same required character coverage. |

All eleven audited pages load the shared token/app/site system. No audited HTML links to Google Fonts. `_headers` still permits the old Google font hosts; permission alone performs no request, and this unchanged policy is not an external-font load. `privacy.html` correctly says fonts are served by Label Ninja. Browser loaded-font and paint timing evidence belongs to the parent agent's browser/performance receipt.

The new helpers have bounded presentation responsibilities:

- `home-picker.js` changes fixed local sample artwork and stores only a job key (`ln.home.job`). Real links perform navigation. An own-property check rejects unknown keys. No studio draft is loaded/reset.
- `packing-tools.js` stores only a stock key (`ln.editor.stock.v1`). Reuse requires an explicit “Use last stock” click; startup never overwrites draft contents or stock. Its picker/status use native option/text sinks. Keyboard movement calls existing state/render/dirty helpers and the same physical bounds as dragging.
- `printer-picker.js` filters static sourced cards and copies their known facts/verdict/source nodes into a native comparison dialog. It generates no shopping URL. Unknown fanfold support fails the confirmed-support filter; optional Wi-Fi remains explicitly qualified.
- `site-nav.js` builds its search from a fixed internal catalog with textContent/native DOM sinks, saves only light/dark (`ln.theme`), and preserves real navigation without search.

No new helper uses `fetch`, eval, dynamic code, arbitrary HTML rendering, account mutation or external API calls. No label text/file/account data is added to an affiliate URL. These checks cover the new helpers and their wiring; they are not a whole-application security certification. The final header change reserves native disabled Find/Theme controls in static markup, then enables/reuses them in `site-nav.js`; the final shared script and guarded homepage helper were syntax-checked again.

## Final source snapshot

Machine-readable results are saved in `packing-source-final.json`. The final comparison includes all SEO meta fields, including Open Graph/Twitter, while excluding deliberately changed theme-color/viewport presentation metadata. It returns ten passing canonical-page comparisons plus zero missing links/assets/references across all eleven pages. These hashes identify the checked bytes; later edits require another check.

| Source | SHA-256 at final check |
| --- | --- |
| `public/index.html` | `3b869ceae2373aca3769ef523e7ec7ce14022d3ce38cf9a94249fe097a332712` |
| `public/shipping-label-to-4x6.html` | `b060f985d9dbe303acdadd077e6244323ca742ef28356f0a9432c8f2b9e77ac1` |
| `public/whatnot-labels.html` | `ae270d0378bb9432cebb3b730f444e40c18a66c1e38aefeb9bb5e6ffc3e1ed45` |
| `public/guides/index.html` | `ec04b8dd84f693b2c999c9f5f9d118954e79724f5021b5153908a5b89d7d9aad` |
| `public/guides/8-5x11-shipping-label-to-4x6.html` | `a4654e6cf3a46c0648260f8c3b5a8942ed04475018933d29ee270dc4d47f22cb` |
| `public/guides/ebay-shipping-label-not-4x6.html` | `41062e69ecda02754bbc93dbba35c8425de4c789183f8ef72f567931b2c9e6b9` |
| `public/guides/print-amazon-return-label-4x6.html` | `ef6c1660d5d348744f5f9e951ce3374447fb6f78b0a6f6e08de4caa6facabd09` |
| `public/guides/whatnot-labels-printing-too-small.html` | `8ae47e15fe0dd96c7baae85b7455e81a1567a6ae01eba28e6ee593ba04640c21` |
| `public/privacy.html` | `0df2a7ea0704b63a5297d49423e86c6231935490f4a3c0f102996af01c21f223` |
| `public/terms.html` | `9d8474802f2153f49fc3f1118cf94a5dbd5d5a082fdfa0a8f42bee7cc7b7474f` |
| `public/js/site-nav.js` | `cc2d8d5331524df11e5296d373a24bb18713bad9d0ff232ef19e9066f8bdcfbc` |
| `public/js/app/home-picker.js` | `6f8c187409d1bcf358d8afffdff99a3e13f8c57b2cbecc19dae65b3ee3c6b7bd` |
| `public/js/printer-picker.js` | `042e1d4cbd3cc2dc836ceab0e4a83dea8ba4e3cddc66e88c6b1ba2a0bb00ccc7` |
| `public/js/app/packing-tools.js` | `ff40acf65cb96299716b3505eea319b6fe97cd45469b258c721ef2a3c19606de` |
| `public/js/app/app.js` | `5ea09efd01eba8c8b085971739daf67058cd81580bb14b569e3be466b9cf244a` |
| `public/js/app/views/mount.js` | `4a86d11b33d734c47b6ea42947e300539bc28c8f94ddbd82f8574eec6eb4f875` |

The final v2 cache correction adds only presentation query keys: index app entry (1), app guide/mount/enhancement imports (5), and mount view imports (3). Removing `?v=packing-20261005c` from both pre-change backups and current files makes all three complete sources identical. API, auth, editor state, export/spec/PDF and crop dependency imports are unchanged. The final 121-file v2 manifest (98 physical public files) matches every current source and frozen-copy hash. Browser verification of the corrected stock labels/search is recorded by the parent in QA.md.

## Findings and remaining acceptance

Resolved during review by the owning implementation agent:

- **LOW, semantics:** Bin/Whatnot/FNSKU/embedded-guide mode titles were H2 without an H1 in the visible mode. They are now H1s with additive IDs/labelled main landmarks, retaining existing visual classes.
- **LOW, preference robustness:** An unknown stored homepage job could resolve an inherited `JOBS` property. `Object.hasOwn(JOBS, key)` now ignores it, avoiding `/assets/undefined`. No injection path was found.
- **LOW, trust/date:** A visible model-specification check date is now present beside the printer comparison, with an honest search-result qualification.

Remaining **INFO** follow-up: fix the SEO baseline capture to exclude SVG titles on its next run; do not rewrite the preserved historical snapshot. The current report already corrects that measurement issue.

No unresolved release-blocking source finding was identified. The parent agent records completed browser/mobile, Lighthouse, local authenticated PDF and dry-run acceptance separately in `../QA.md`; those were not performed by this source-only reviewer. The frozen 121-file candidate (98 physical public assets) matches both the current source and its `release-candidate-v2-sha256.json` manifest. Owner approval to register/release this exact candidate and physical printer/scanner acceptance remain pending. No production export, Associates website registration, purchase attribution or physical printer result is claimed here. `websiteListed:false` remains an existing release gate; local affiliate validation does not satisfy it.
