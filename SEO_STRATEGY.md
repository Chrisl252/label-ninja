# Label Ninja search plan

## Whatnot brick (2026-09-06, deployed)

Audience: Whatnot sellers preparing numbered item labels and troubleshooting print sizing. Chris confirmed this audience, the Create labels action and practical tone. The feature creates manual number batches; it does not connect to Whatnot or generate postage.

Two crawlable pages, not a collection of near-duplicate keyword pages:

| Intent | Target URL | Purpose |
| --- | --- | --- |
| whatnot number labels, whatnot label generator | /whatnot-labels | Working setup form, three exact stock sizes, transfer to the free studio tool |
| whatnot labels printing too small, whatnot label size | /guides/whatnot-labels-printing-too-small | Diagnose PDF/driver/scale mismatches; link back to the tool |
| whatnot sorting labels, whatnot shipping labels | Sections within the above pages | Explain the distinction and point to the correct official workflow |

Search results show mixed intent: seller-number tools, automatic sale-label tools, shipping help and seller troubleshooting discussions. This is a qualitative SERP observation, not a measured demand estimate. No OpenSEO or Search Console connector is available. Search volume, keyword difficulty, clicks, positions and conversion baseline are UNKNOWN. No rankings or traffic are promised.

## Sources and boundaries

- [Whatnot shipping labels](https://help.whatnot.com/hc/en-us/articles/39141311489421-Generate-and-print-shipping-labels): official shipping workflow and formats; summarized briefly on each page.
- [Whatnot Sorting Labels beta](https://help.whatnot.com/hc/en-us/articles/48316819355021-Use-Sorting-Labels-to-organize-sold-items-Beta): selected-seller automatic workflow; a different product from our manual number batches. Reviewed September 6, 2026.
- [Rollo supported media](https://support.rollo.com/support/solutions/articles/29000050961-which-labels-work-with-rollo-direct-thermal-only-no-ink-or-ribbon-and-recommended-sizes) and [metric sizes](https://support.rollo.com/support/solutions/articles/29000022677-why-are-label-sizes-in-millimeters-): stock compatibility and nominal versus measured sizing. Do not claim every stock works with every printer.
- [Google URL guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure): separate HTML URLs replace reliance on fragments for searchable content.
- [Google crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable): ordinary anchor links connect the studio, feature and guide.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials): meeting technical requirements does not guarantee crawling, indexing or ranking.

All copy is original. No fake testimonials, traffic metrics, Whatnot endorsement, automatic buyer matching or physical printer certification. Public pages disclose independent status and link sources next to the relevant claims. Numeric stock dimensions derive from the actual application presets and PDF tests.

## Delivery and next measurement gate

Self-canonicals, unique titles/descriptions, visible article date, matching WebPage/Article/BreadcrumbList JSON-LD, sitemap entries and internal links are included. Source HTML contains the complete guide without JavaScript. No FAQ rich-result promise; no fabricated review schema. Existing brand image is used as a summary social card, not misrepresented as a 1200x630 campaign image.

Deployed 2026-09-06 (79842db). Search Console access now exists; the baseline below covers these pages. Establish impressions, queries, clicks and average position before deciding the next article. Do not create duplicate pages or automated posting based on assumed search volume.

## Free 4x6 converter cluster (deployed 2026-10-01)

October 1 decision: everything is free; ads were the planned revenue source and remain off. Chris added affiliate monetization to scope on October 5. The search bet is the free in-browser tool plus three problem guides that link to it.

| Intent | Target URL | Purpose |
| --- | --- | --- |
| shipping label to 4x6, convert 8.5x11 label to 4x6, crop shipping label | /shipping-label-to-4x6 | Working converter: PDF or image in, auto-detect and crop, 4x6 or 100x150 mm PDF out; no upload, no account |
| ebay shipping label not 4x6 | /guides/ebay-shipping-label-not-4x6 | Fix the letter-size eBay label; link to the tool |
| print amazon return label 4x6 | /guides/print-amazon-return-label-4x6 | Return labels arrive as full pages; crop to 4x6 |
| 8.5x11 shipping label to 4x6 | /guides/8-5x11-shipping-label-to-4x6 | Generic carrier-label walkthrough |

Rewritten in the same lane: home page, /whatnot-labels, the printing-too-small guide, privacy and terms (all free copy, no pricing). The initial sitemap had 9 URLs; the deployed guides hub brings it to 10. robots.txt disallows /api/. The www/http hosts and /pricing, /billing 301 to the apex so link equity consolidates.

Baseline (Search Console, 90 days before this lane): about 150 impressions and 13 clicks; "shipping label generator" average position 9.7, "whatnot sorting labels" 7.4.

Measurement gate: after deploy, resubmit sitemap.xml and URL-inspect the tool and three new guides. Re-read Search Console at 28 and 56 days. Expand the cluster only if the new URLs are indexed and earn impressions on their target queries; otherwise fix titles/internal links before writing more. No ranking or traffic promise; no near-duplicate keyword pages.

## Affiliate expansion and next pages (2026-10-05)

Chris asked to ensure appropriate affiliate links and think up new pages. The local candidate tags the six existing printer searches and adds five supply links across the home, Whatnot and converter pages. Each shopping section has an Associate disclosure, compatibility checks and ordinary manufacturer sources. All tools remain free. The selected Associates tag was inspected in Chrome; Label Ninja is absent from its website list. Registration and deployment await approval. This supersedes ads-only planning, not the decision to keep ads off.

### Current search evidence

Authenticated Search Console inspection on October 5, September 6 through October 3 (28 days): site total 14 clicks / 221 impressions. `/whatnot-labels` has 7 clicks / 94 impressions, average position 8.03; its printing-too-small guide has 0 clicks / 68 impressions, position 8.0. The query `whatnot sorting labels` has 0 clicks / 11 impressions, position 7.55. These are small observations, not keyword-volume forecasts or purchase evidence. The old 90-day baseline above is historical.

URL Inspection reports the home, Whatnot tool, converter and generic 8.5x11 guide indexed. The guides hub, eBay guide and Amazon return guide are unknown to Google. Fix internal discovery and inspect those existing pages before expanding the generic shipping cluster. The sitemap report's indexed count of zero is not evidence that the whole site is unindexed.

### Proposed pages, in priority order

These URLs are briefs only; they are not published or added to the sitemap. Demand outside the measured Whatnot queries is unverified.

| Priority | Proposed title and URL | Distinct job for the page | Useful affiliate placement |
| --- | --- | --- | --- |
| 1 | Which label stock fits your Whatnot printer? `/guides/whatnot-label-stock` | Stock buying decision, not another tiny-print tutorial. Chart our number-label sizes separately from native Whatnot Sorting Labels sizes; width/height, gaps, minimum feed width and brand-specific rolls. Link both the working number tool and the existing size troubleshooting guide. | Verified 2x1 stock, model-specific rolls and an optional holder beside the compatible option. |
| 2 | Whatnot Sorting Labels not printing: check Tray, show and printer `/guides/whatnot-sorting-labels-not-printing` | Diagnose the native automatic workflow: pilot eligibility, current Tray version, show open on the same computer, connection and sale-type settings. Keep this separate from downloaded manual PDFs. Offer our number tool only as a manual alternative. | Stock only after the official test/calibration steps; replacing a printer is not the first fix. |
| 3 | Rollo skipping labels or feeding blank labels `/guides/rollo-skipping-labels` | A decision tree separating PDF/driver paper size, orientation, media detection and calibration. Provide an existing test PDF, then compare results before suggesting a replacement supply. | Gap-separated direct thermal stock or holder only where the diagnosis calls for it. |
| 4 | Label cost calculator: compare usable labels, not pack prices `/label-cost-calculator` | One bounded free calculator: user-entered delivered cost, pack count, labels per roll and waste percentage. Show cost per usable label and per 1,000. Do not fetch or publish unverified Amazon prices. | Relevant stock searches after the result; explain exact dimensions and printer compatibility. |
| 5 | Fanfold vs roll labels: feed path, space and holders `/guides/fanfold-vs-roll-labels` | Desk setup choice, not a duplicate stock-size guide. Original feed-path diagram, roll/core clearance and a dimensions checklist. Explain that the printer's media requirements decide compatibility. | Fanfold stock, rolls and optional external holders next to the appropriate feed layout. |
| 6 | DYMO 4XL vs 5XL: check label compatibility before ordering `/guides/dymo-4xl-vs-5xl-labels` | Identify exact stock numbers and model requirements from DYMO documentation, including recognition requirements. Avoid a blanket claim that all 4XL and 5XL stock differs; some genuine extra-large stock supports both. | Exact verified compatible stock/model links; keep used-hardware driver support explicit. |
| 7 | Rollo X1038 USB vs X1040 Wireless for a packing table `/guides/rollo-usb-vs-wireless` | Compare exact models, phone/desktop print paths, desk layout and stock changes. Spec-based until Chris supplies measured prints and setup observations; no fabricated hands-on verdict. | The two specific model searches after the use-case comparison, with a supplies checklist. |

Build the stock guide first, then the native Sorting Labels troubleshooting page. Both extend the audience already reaching us. Keep broad printer comparisons behind them until we have exact-model evidence and useful original measurements. Each new article needs a unique title/canonical, original content, a source/date, a working tool link, links from the hub and the relevant tool/guide, and a sitemap entry only when real. Keep source content in static HTML; do not add article paths to the SPA allowlist.

### Primary sources reviewed October 5

- [Whatnot Sorting Labels](https://help.whatnot.com/hc/en-us/articles/48316819355021-Use-Sorting-Labels-to-organize-sold-items-Beta): native workflow, selected-pilot availability, stock sizes and troubleshooting. Current source was updated October 2. Recheck availability/version when writing.
- [Rollo stock requirements](https://support.rollo.com/support/solutions/articles/29000050961-which-labels-work-with-rollo-direct-thermal-only-no-ink-or-ribbon-and-recommended-sizes) and [skipping labels](https://support.rollo.com/support/solutions/articles/29000000887-rollo-is-skipping-labels-or-continuamente-feeding): media and PDF/driver calibration diagnosis.
- [Zebra ZD421 SmartCal](https://docs.zebra.com/us/en/printers/desktop/zd421-and-zd621-desktop-printers-user-guide/setup/running-a-smartcal-media-calibration.html): model-specific calibration; do not apply its button sequence to other printers.
- [DYMO 5XL](https://www.dymo.com/label-makers-printers/labelwriter-label-printers/dymo-labelwriter-5xl-label-printer/SAP_2112554.html) and [genuine extra-large labels](https://www.dymo.com/labels-tapes/labelwriter-labels/dymo-labelwriter-extra-large-shipping-labels/SP_95629.html): branded stock requirements and a genuine stock family listed for both 4XL and 5XL.
- [Brother QL range](https://www.brother-usa.com/label-makers-printers/learn-more/brother-ql) and [DK1241 stock](https://www.brother-usa.com/p/label-printer-rolls/DK1241): different widths and exact stock/model compatibility.
- [Rollo USB X1038](https://www.rollo.com/product/rollo-printer/) and [Wireless X1040](https://www.rollo.com/product/rollo-wireless-printer/): exact comparison candidates.
- [Amazon disclosure guidance](https://affiliate-program.amazon.com/help/node/topic/GPXFHVYZMTGPUMPE), [site list guidance](https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM) and [Special Link policies](https://affiliate-program.amazon.com/help/operating/policies): disclosure beside links, current site list and assigned tag. Search links need relevant original content; no guaranteed commissions or account-approval claim.

### Measurement after an approved release

Record the release date, verify public tags/disclosures and watch GSC clicks/impressions at 28 and 56 days. Record actual affiliate orders/commission from Associates separately. The shared tag currently cannot isolate Label Ninja's sales; a dedicated tracking ID is a later owner-approved account change. Do not treat traffic, an outbound click, or a correctly tagged URL as purchase evidence. No analytics, extra tracking cookies, automated publishing or dedicated tracking ID was added in this brick.
