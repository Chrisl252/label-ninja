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

## Free 4x6 converter cluster (2026-10-01, not yet deployed)

Owner decision: everything is free; revenue is ads only (ads currently off). The search bet is the free in-browser tool plus three problem guides that link to it.

| Intent | Target URL | Purpose |
| --- | --- | --- |
| shipping label to 4x6, convert 8.5x11 label to 4x6, crop shipping label | /shipping-label-to-4x6 | Working converter: PDF or image in, auto-detect and crop, 4x6 or 100x150 mm PDF out; no upload, no account |
| ebay shipping label not 4x6 | /guides/ebay-shipping-label-not-4x6 | Fix the letter-size eBay label; link to the tool |
| print amazon return label 4x6 | /guides/print-amazon-return-label-4x6 | Return labels arrive as full pages; crop to 4x6 |
| 8.5x11 shipping label to 4x6 | /guides/8-5x11-shipping-label-to-4x6 | Generic carrier-label walkthrough |

Rewritten in the same lane: home page, /whatnot-labels, the printing-too-small guide, privacy and terms (all free copy, no pricing). Sitemap has 9 URLs; robots.txt disallows /api/. The www/http hosts and /pricing, /billing 301 to the apex so link equity consolidates.

Baseline (Search Console, 90 days before this lane): about 150 impressions and 13 clicks; "shipping label generator" average position 9.7, "whatnot sorting labels" 7.4.

Measurement gate: after deploy, resubmit sitemap.xml and URL-inspect the tool and three new guides. Re-read Search Console at 28 and 56 days. Expand the cluster only if the new URLs are indexed and earn impressions on their target queries; otherwise fix titles/internal links before writing more. No ranking or traffic promise; no near-duplicate keyword pages.
