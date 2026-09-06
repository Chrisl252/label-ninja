# Design — Label Ninja ("The Print Bench")

Locked design system for label-ninja.com. Every page, mode, JS-rendered template and modal reads
this file before emitting markup. Extend this file when the system needs to grow; never fork it
per page. Tokens live in `public/css/tokens.css`; primitives in `public/css/app.css`.

## Identity — derived from the subject, not a template

Label Ninja prints direct-thermal labels. The whole UI is built from that one world:

| Real thing | UI element |
|---|---|
| The printer body (Rollo / Zebra / Dymo chassis) | Dark graphite surfaces: `--color-chassis*`. The app stays DARK. |
| The label stock coming off the roll | Pure white `.stock` surfaces with black print. White is the *color* of this site; the chrome is neutral. |
| The liner / die-cut edge | `.liner` dashed backing behind any label preview |
| The status LEDs on the printer | `.led` dots: **ready** green · **attention** amber · **danger** red · off gray |
| The one button you press | The single action accent: electric blue `--color-accent` (kept from the existing site). ≤ 5 % of any viewport: primary CTA, active states, focus. |
| The barcode (it is the logo) | `.bars` — a Code128-style stripe used as the wordmark mark, section rule and footer edge. Never a decorative gradient. |
| The ruler you calibrate against | `.ruler` inch ticks framing the editor canvas |
| The label on the roll you tear off | The nav: a strip of label tabs (`.roll`). The active tool is a **white printed label**; the others are blank stock outlines. |

Anti-goals (these are the AI tells this design refuses): blue→purple gradients, glassy cards,
emoji icons, gradient headline text, italic headings, invented metrics/testimonials, generic
compass/sparkle glyphs, 4-column link footers, eyebrow "01 · SECTION" kickers.

## Genre · macrostructure
- Genre: utilitarian / technical tool.
- App modes (editor, bin, whatnot, fnsku): **Workbench** — controls rail + stage. The stage is
  always a white label on a dark liner. The primary CTA sits directly under the stage.
- Account modes (dashboard, pricing, account): **Panel list** — `.panel` blocks in a single
  column with `.grid` sub-layouts. No hero.
- Guides: **Long Document** — one column, display headings, real copy, section ids preserved
  for SEO anchors.

## Theme (OKLCH tokens — reference by name, never inline a colour)
```
--color-chassis     oklch(14% 0.006 250)   page ground
--color-chassis-2   oklch(18.5% 0.008 250) panels / masthead
--color-chassis-3   oklch(23% 0.010 250)   raised / hover
--color-chassis-4   oklch(28% 0.012 250)   pressed / input hover
--color-rule        oklch(30% 0.010 250)   hairlines
--color-rule-2      oklch(38% 0.012 250)   control borders
--color-ink         oklch(96% 0.004 250)   primary text on chassis
--color-ink-2       oklch(76% 0.008 250)   secondary
--color-ink-3       oklch(58% 0.010 250)   muted / placeholder
--color-stock       oklch(99.2% 0 0)       label paper
--color-stock-2     oklch(94% 0 0)         paper edge / row stripe
--color-stock-ink   oklch(13% 0 0)         thermal print black
--color-stock-ink-2 oklch(45% 0 0)         grey print
--color-accent      oklch(60% 0.19 258)    action blue (kept)
--color-accent-2    oklch(67% 0.17 258)    hover
--color-accent-dim  oklch(60% 0.19 258 / .14)
--color-ready       oklch(75% 0.17 155)    green LED
--color-attn        oklch(80% 0.15 80)     amber LED (also the focus ring)
--color-danger      oklch(64% 0.20 25)     red LED
--color-focus       = --color-attn
```

## Typography (2 + 1)
- Display: **Barlow Condensed** 600/700, uppercase, tracking 0.04–0.08em. Headings, tab strip,
  panel titles, big numbers. Always roman.
- Body: **Barlow** 400/500/600. Copy, buttons, form labels.
- Mono: **IBM Plex Mono** 400/500. Sizes (`4 × 6 in`), presets, SKUs, barcode values, usage
  counters, timestamps. Anything a printer would print in OCR.
- Scale: `--text-xs .75rem · sm .8125rem · base .9375rem · md 1.0625rem · lg 1.25rem ·
  xl 1.5rem · 2xl 1.875rem · display clamp(2rem, 4vw, 2.75rem)`.
- Form labels: Barlow 600, `--text-xs`, uppercase, tracking .06em, `--color-ink-2`.

## Spacing · radius · motion
- 4-pt scale `--space-3xs … --space-3xl` (0.25rem → 6rem). Use the names.
- Radii: `--radius-label 4px` (labels, buttons, inputs) · `--radius-card 8px` (panels, modals) ·
  `--radius-pill 999px` (chips only).
- Motion: `--ease-out cubic-bezier(.16,1,.3,1)`, `--dur-short 160ms`, `--dur-med 220ms`.
  Animate transform + opacity only. Tab switches do not animate. Modals fade+lift; toasts slide
  up. `prefers-reduced-motion` collapses everything to ≤150 ms opacity.
- Focus: instant 2 px amber ring, offset 2 px, never animated.

## Component voice (classes in app.css)
- Buttons: `.btn` + `--primary` (blue, THE action) · `--stock` (white label button, secondary
  action like "Open PDF") · `--ghost` (outline) · `--danger` · sizes `--sm --lg --block`.
  States: hover, `:focus-visible`, `:active` (1 px press), `[disabled]`, `.is-busy`.
  Copy is verb-first: "Download PDF", "Save project", "Sign in". Never "Submit" / "Click here".
- Inputs: `.input` `.select` `.textarea` (+ `.input--mono` for values); wrap in `.field` with a
  `.field__label` and optional `.field__hint`. Invalid state: `[aria-invalid="true"]`.
- Status: `.led .led--ready|attn|danger|off` (dot + text) · `.chip` pills · `.note` boxes with
  an LED bar (`--attn` print hints, `--ready` success, `--danger` errors, default info).
- Surfaces: `.panel` (+ `.panel__head`, `.panel__title`, `.panel__lede`) · `.stock` white
  label · `.liner` dashed backing · `.bars` barcode stripe · `.ruler-x/.ruler-y`.
- Layout: `.mode` main container (+ `--wide`, `--full`) · `.stack` (+ `--sm --lg`) · `.grid`
  (+ `--2 --3 --4 --6`, all `minmax(0,1fr)`) · `.row` · `.spread`.
- Overlays: `.scrim` > `.modal` · `.scrim` > `.drawer` · `.toast`.
- Utilities kept for JS: `.hidden` `.flex` `.sr-only` `.truncate` `.no-print`.
  JS state toggles use semantic classes (`.is-active`, `.is-busy`, `.is-dragover`, `.is-selected`),
  never Tailwind utility names.

## What every mode MUST share
- The masthead + roll nav + footer (owned by index.html shell).
- Tokens, fonts, button voice, field voice, LED vocabulary.
- One accent. If two things are blue on one screen, one of them is wrong.

## What modes MAY differ on
- Rail width and stage composition (editor has a controls rail; batch tools have a form grid).
- Section-specific rules live in `public/css/<mode>.css`, loaded from index.html.

## Ownership / legal copy
Site owner is **Christopher Lucas** (sole proprietor). Never "Bisket LLC" in footers or legal
text. Contact mailbox may stay `bisketllc@gmail.com`.
