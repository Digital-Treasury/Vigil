# Digital Treasury Design System

A monochrome, editorial brand system for **Digital Treasury** — a professional digital agency that builds websites, SEO programs and hosted dashboards for businesses. Source references were two marketing-site screenshots (homepage hero + services section) provided by the team.

> Digital Treasury positions itself as a **partner in development** — a technical extension of their clients' team. The brand is confident, understated, and typographically-led, with a strict black/white palette and a single signature aqua highlight used sparingly for emphasis.

---

## Sources

This system was derived from the following materials:

- `assets/source/hero-reference.jpg` — homepage hero (black section) with wordmark, nav, pill buttons, aqua-highlighted headline, and a "Trusted by leading Australian businesses" logos row.
- `assets/source/services-reference.jpg` — "Our Services" section (Web, SEO, Hosting) showing card style, iconography, checkmark bullet lists and "View Service ↗" link treatment.

No codebase or Figma file was provided. The user later supplied the official raster wordmark (`assets/logo.avif`, also saved as `assets/logo.png` and inverted white `assets/logo-white.png`). A lightweight SVG approximation remains in `assets/logo.svg` for cases where you need `currentColor` (e.g. favicon / single-color usage) — **if you have the original vector SVG, drop it in to replace it.**

---

## Products represented

A single product surface is visible in the sources:

1. **Agency marketing website** — `digitaltreasury.com.au`
   Sections observed: top nav, hero with CTA pair, trusted-by logos row, Our Services (3-up cards), "What our clients say" testimonials.

Because Digital Treasury builds web & dashboards for clients, this system also ships a **second UI kit** — a generic **Client Dashboard** kit — so designers can quickly mock the *output* of a typical engagement in-brand.

---

## Content fundamentals

**Voice: direct, confident, partner-like.** Copy talks *to* the reader ("your", "you need") and speaks *with* them, not at them. It is never salesy; it is never casual-to-the-point-of-cute. Think "senior consultant who actually writes the code."

**Specific rules observed in the source:**

- **Sentence case everywhere** except nav items and CTAs, which are Title Case (`Book a Meeting`, `Contact Us`, `See Our Work`). Section headers are sentence case with an aqua-highlighted accent word: `Our Services`, `What our clients say`.
- **Headlines are two-sentence couplets** that end in a full stop. The *second* sentence carries the aqua highlight on the key noun. Example from source:
  > "Maximise your web potential. Your partners in **development.**"
- **Body copy is short and operational** — what the service does, who it's for, and a benefit. No adjective-stacking.
  > "Get a new website that not only looks good but can convert traffic into new customers for your business."
- **Feature bullets use a verbless noun-phrase pattern** introduced by a checkmark:
  > `⊙ Conversion & SEO optimised`
  > `⊙ Responsive designs for all devices`
  > `⊙ Custom designs by local designers`
- **"I" vs "you":** strictly "you" / "your". The company refers to itself as "we" / "our" or "your partners". Avoid first-person singular.
- **No emoji.** The brand is professional-services; emoji would undercut it. Unicode check/arrow glyphs are used in code, but icons are always SVG on the page.
- **CTAs are verb-first and short** — two or three words: `Contact Us`, `Book a Meeting`, `See Our Work`, `View Service ↗`. Links to detail pages get a trailing `↗` arrow.
- **Numbers and acronyms are uppercased** (SEO, FAQ) — never softened.
- **Australian English.** "Optimised" not "optimized"; "local designers" over "onshore".

**Vibe:** competent, local, transparent. Less "tech disruptor", more "trusted operator."

---

## Visual foundations

### Palette

Monochrome by design. The brand is a **strict ink scale** (`--ink-0` pure black → `--ink-10` pure white) with a **single accent** — **aqua `#9BF4E8`** — used *only* as a text highlight behind a key word, never as a button, surface, or large colored area. This is the one rule that carries the most brand equity: the aqua must feel rare.

- Hero / major section breaks: **pure black** background, white type.
- Default page: **pure white** background, near-black type.
- Cards: white on white, separated by a **1px hairline** (`--ink-7`) — shadows are barely-there.
- Status colors (success / warning / danger) are defined for UI-kit use but should be kept out of marketing surfaces.

### Typography

- **Inter** is the system face — Regular (400), Medium (500), Semibold (600), Bold (700), Extrabold (800). All UI, body, and headlines.
- **Instrument Serif, italic**, used *once*, for the stylised client names on the trusted-by row ("kinetic IT" in the source). Do not otherwise introduce a serif.
- Tracking is **tight** on display / H1 / H2 (`-0.02em`); neutral everywhere else.
- Eyebrow labels: 12px, UPPERCASE, `+0.14em` tracking, weight 600, muted ink.
- Headlines are **generous** (display 72, H1 52, H2 40) with `line-height: 1.05–1.12` so couplets stack tightly.

### Spacing & layout

- **4px base unit**, scale `--s-1` (4) through `--s-12` (128).
- Max container width **1200px**, gutter **24px**.
- Sections are tall and airy — typical vertical rhythm is `--s-11` (96px) top + bottom.
- Cards internal padding is **32px**.
- Buttons are **pill-shaped** (`border-radius: 999px`), height 44, horizontal padding 24.

### Corners, borders, shadows

- Corner radii: buttons = pill; cards = **14px**; inputs = **10px**; badges = pill.
- Borders carry the brand more than shadows do. Cards use a **1px `--ink-7`** border with a barely-visible `shadow-1`; elevated menus get `shadow-3`.
- No inner shadows; no glow; no coloured borders.

### Background & imagery

- Two and only two section backgrounds: **pure white** or **pure black**. No gradients (hero is flat #000). No textures. No illustrations or hand-drawn SVGs.
- Client-work imagery (not present in the reference, but expected): full-bleed photography, cool/neutral color grading, slight grain acceptable. Avoid warm filters and stylized treatments.
- Logos on the "trusted by" row sit at consistent optical weight — small logo-marks are **inverted into black rounded chips** (`--r-md`) so they align visually regardless of their native color.

### Motion

- Animations are **short and utilitarian**: 120–360ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out).
- Primary transitions: **opacity fades** and subtle **y-translate** on card/button hover (1–2px).
- No bounces, no springs, no parallax. Aqua highlights never animate in.

### Hover / press states

- **Black buttons**: hover → lighten to `#1F1F1F`; press → scale 0.98 + darken.
- **White-outline buttons**: hover → fill white with black text; press → 0.98 scale.
- **Cards / service tiles**: hover → border darkens from `--ink-7` to `--ink-6`, y-translate -2px, shadow-2.
- **Text links**: hover → underline + arrow nudges +2px.
- No opacity-on-hover unless icon-only.

### Transparency & blur

- **Sticky nav** uses `rgba(255,255,255,0.82)` + `backdrop-filter: blur(12px)` when the page has scrolled; otherwise fully opaque.
- Modals: `rgba(10,10,10,0.58)` scrim, no blur.
- Otherwise, solid fills only.

### Layout rules / fixed elements

- Nav is **top-fixed**, centered logo + nav group + right-aligned CTA pair.
- Footer is **dark** (near-black), mirroring the hero.
- Section headings sit left-aligned inside the container; body content follows in a grid beneath.
- Everything is on an 8-col (mobile) / 12-col (desktop) grid with 24px gutters.

---

## Iconography

The source shows **line icons** rendered at a single weight with generous padding above a card title — `monitor` for Web, `bar-chart` for SEO, `cloud` for Hosting. Checkmark bullets in the services list are **outlined circles with an inner check**, `currentColor` stroke.

**Approach chosen for this system:**

- **Primary icon set: [Lucide](https://lucide.dev/)** (MIT) — loaded via CDN. Stroke-based, consistent 1.75–2px weight, rounded caps. This matches the reference exactly and covers all UI needs.
- Icons render at 20px inline, 24px on cards, 28px in hero/feature blocks, stroke color = `currentColor` (so they invert cleanly on dark sections).
- **No emoji. No unicode glyphs** as icons. Unicode arrows (`↗`) are acceptable in inline link CTAs, since they're typographic, not iconographic.
- Brand assets live in `assets/`:
  - `logo.svg` — full wordmark, black
  - `logo-white.svg` — full wordmark, white (for dark surfaces)
  - `logo-mark.svg` — D-bar mark only (uses `currentColor`)

**Substitution flagged:** Lucide is a substitute for whatever line-icon family the live site uses. Swap in the original SVGs if available.

---

## File index

```
Design System/
├─ README.md                       ← you are here
├─ SKILL.md                        ← makes this folder a portable Claude skill
├─ colors_and_type.css             ← CSS variables + base type classes
├─ assets/
│  ├─ logo.svg                     ← wordmark (reconstructed)
│  ├─ logo-white.svg
│  ├─ logo-mark.svg
│  └─ source/                      ← original screenshots used as reference
├─ preview/                        ← Design System tab cards (swatches, type, components)
├─ ui_kits/
│  ├─ marketing_site/              ← digitaltreasury.com.au recreation
│  │  ├─ README.md
│  │  ├─ index.html
│  │  ├─ Nav.jsx
│  │  ├─ Hero.jsx
│  │  ├─ TrustedBy.jsx
│  │  ├─ Services.jsx
│  │  ├─ Testimonials.jsx
│  │  ├─ CTA.jsx
│  │  └─ Footer.jsx
│  └─ client_dashboard/            ← generic in-brand client dashboard kit
│     ├─ README.md
│     ├─ index.html
│     └─ [components]
└─ [no slides/ — no deck template was provided]
```

## Caveats

- **Logo is reconstructed** from screenshots. Please drop in the original SVG if available.
- **Fonts** are Google Fonts substitutions (Inter, Instrument Serif). If Digital Treasury licenses a specific display face, provide the TTFs and we'll wire them in.
- **Icons** are Lucide via CDN — substitute if the live site uses a different family.
- **Status colors** (success/warning/danger) are defined for dashboards but not observed in source material; treat them as proposals.
