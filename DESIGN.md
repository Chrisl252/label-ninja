# Label Ninja — Packing Bench

Approved by Chris on 2026-10-05 after three-direction review. Replaces the dark Print Bench.
The reference is design/redesign-20261005/packing.html and its reviewed screenshots.
Every page, tool, account view and dialog uses this same system.

## Identity and locked tokens

Warm packing paper, thermal print, cut label corners, perforations and measuring ticks.
Light is the default. Dark is a complete alternate. Label previews stay white with black print.
No gradients, glass, emoji navigation, invented metrics, fake prices or ratings.

| Role / existing token | Light | Dark |
|---|---|---|
| color-chassis (ground) | #F5F1E8 | #21231E |
| color-chassis-2 (surface) | #FCFAF4 | #2C2F27 |
| color-chassis-3 (liner) | #E8E0D2 | #363A30 |
| color-ink | #20221D | #F5F1E8 |
| color-ink-2 / color-ink-3 | #5F6057 | #CCC6B8 |
| color-rule / color-rule-2 | #A39C8D | #818474 |
| color-accent / color-focus | #BB4114 | #F58C58 |
| color-accent-ink | #FCFAF4 | #21231E |
| color-stock (both themes) | #FCFCF7 | #FCFCF7 |
| color-stock-ink (both themes) | #20221D | #20221D |

Legacy semantic token names remain supported. Colors only in public/css/tokens.css.
Barlow Condensed 700 display, sentence case headlines; IBM Plex Sans body; self-hosted mono
for dimensions/SKUs. All self-hosted with font-display:swap, no Google Fonts requests.
Existing 4-point spacing, 4px label / 8px panel radii. Body and phone inputs >=16px;
primary touch controls >=44px. Instant visible focus, reduced motion, no animation dependency.
Paper texture must not interfere with text. Errors always use words as well as color.

## Shared header contract

Logo links to /. Retain ordinary crawlable links and existing account control IDs.
.site-nav contains native details.nav-group with summary Tools and .nav-group__menu links:
/shipping-label-to-4x6, /#tools/warehouse-rack-bin-label-generator,
/#tools/whatnot-live-show-number-generator, /#tools/amazon-fba-fnsku-generator, /#editor.
Remaining links: Labels & sizes -> /#label-sizes; Printers -> /#best-label-printers;
Guides -> /guides/. A span.brand__mark is the cut-label mark rendered by root shared CSS.
Root site-nav.js adds theme toggle and keyboard search to .site-header on every page.
On phones groups wrap into one compact second row; menus overlay within viewport.
One sticky header. Hide obsolete duplicate roll visually while keeping IDs for legacy handlers.
Keep existing main IDs and correct skip links. Footer has owner, privacy and terms links.

## Page patterns

Home: immediate What are you printing? task picker and physical label sample; real working
links above the fold; #label-sizes states actual supported stock. Tools: useful physical
preview and dimensions, clear control groups, visible errors/export states, preview before
optional controls on phones. Printers: sourced exact-model facts, use-case/connection filters,
verdicts/skip-if and mobile comparison; broad retailer links remain identified as searches.
Guides: symptom -> quick fix -> practical diagram -> working tool. Legal/account: readable
single column and clear forms in the same system.

## Preserved behavior and release boundary

Preserve URLs, anchors, control IDs, metadata, structured-data truth and label/PDF output.
No invented ZPL, DPI selector, unsupported presets, PNG export or paid feature claims.
Cropper files stay in-browser; studio exports send content to the server. State this honestly.
Preference storage must never store content/files or override an active draft.
Do not change config/affiliates.json, affiliate destinations/attributes or disclosures.
Design approval does not authorize production deployment or Amazon account changes.
Validate tools, keyboard/mobile states, SEO and source/output preservation. Collect actual
Lighthouse evidence where available. Show the completed site in Chrome for release approval.

## Ownership

Christopher Lucas, sole proprietor. Contact chris@bisket.com.
