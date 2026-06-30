# Vigil — Design Document

**For:** Claude Design (mockups & UI direction)
**Product:** Internal visual & code regression testing tool for Digital Treasury
**Working name:** "Vigil" — placeholder, rename freely
**Audience:** The Digital Treasury team (internal tool, ~5–15 users, desktop-first)
**Status:** Requirements locked. This document drives mockups. A separate Product Scope / Build Guide drives the engineering.

---

## 1. What this product is (one paragraph)

Digital Treasury runs weekly maintenance updates (plugins, themes, core, hosting) across 90+ client sites. Vigil exists so the team **finds breakage before the client does**. For each client, the team marks a handful of "valuable pages." Vigil captures those pages (full-page screenshots, served HTML, rendered DOM, and a Lighthouse score) and stores an accepted-good **Baseline**. On every **Run** — triggered manually, on a per-client schedule, or as a before/after pair around a maintenance window — Vigil recaptures, diffs the new capture against the baseline (and against an optional pre-update checkpoint), highlights visual and code differences, and lets a reviewer either **accept the new state as the baseline** or **keep the old one and flag it for investigation**. When a difference is ambiguous, the reviewer can hand it to Claude for a structured severity assessment and recommendation.

## 2. Design goals (in priority order)

1. **Triage in seconds.** The common case is a reviewer glancing at a run and deciding "fine / fine / fine / wait, look at this." The UI must make "is anything wrong?" answerable at a glance, and "what exactly changed?" answerable in one click.
2. **Calm under noise.** Live client sites change constantly (content, testimonials, feeds). The design must make the *signal* (regressions from our updates) louder than the *noise* (routine content drift). The before/after checkpoint flow and per-page masks are the mechanisms; the UI must surface them clearly.
3. **Low friction to set up.** Adding a client and its pages should take a minute, not a meeting. CSV import for pages is a first-class shortcut.
4. **The diff is the hero.** The single most important screen is the diff review. It deserves the most design attention.
5. **On-brand, premium, minimal.** This is a tool the team lives in daily and a reflection of the agency. Restraint over decoration.

## 3. Brand system

Apply Digital Treasury branding throughout.

**Colour — base (monochrome):**
- Black `#000000`
- White `#FFFFFF`
- Plus a neutral grey scale derived between them for borders, dividers, muted text, surfaces, and disabled states (e.g. `#111`, `#333`, `#666`, `#999`, `#CCC`, `#E5E5E5`, `#F5F5F5`). Claude Design to define the exact ramp.

**Typography:**
- Inter (Google Fonts), used across all weights. Lean on weight and size for hierarchy, not colour.

**Style:**
- Minimal, clean, generous whitespace. Soft rounded corners. Bold, high-contrast. No gradients, no drop-shadow clutter, no decorative illustration. Dense where it earns it (data tables, run lists), airy where it breathes (empty states, detail headers).

**Logo (symbol, black):**
```svg
<svg viewBox="0 0 107.72 53.86" xmlns="http://www.w3.org/2000/svg"><path d="m0,0h26.93C41.79,0,53.86,12.07,53.86,26.93h0c0,14.86-12.07,26.93-26.93,26.93H0V0H0Z"/><rect x="53.86" width="53.86" height="19.84"/></svg>
```
For a white version, add `fill="#fff"` to both elements.

### 3.1 The one deliberate exception: a scoped semantic palette

A regression tool fundamentally cannot work in pure black-and-white — it has to signal pass / warn / fail and highlight changed pixels. So the rule is:

- **Everything is monochrome** — layout, chrome, type, navigation, buttons, tables, cards.
- **Colour appears in exactly two places, and nowhere else:**
  1. **Status indicators** (pills, dots, the diff-percentage figure, severity badges).
  2. **The visual diff highlight overlay** (changed pixels).

Proposed semantic tokens (muted to sit well against monochrome — Claude Design to refine):
- Success / no meaningful change: `#1A8F5F`
- Warning / review needed / minor change: `#B47A12`
- Danger / likely regression / broken: `#C0322B`
- Info / running / processing: `#2F6FB0` (or simply use mid-grey + motion)
- **Diff highlight (changed pixels):** magenta-pink `#FF1F8E` — high-visibility, conventional for pixel diffs, reads instantly over almost any site design.

Use these at low saturation and small surface area: a 8–10px status dot, a thin pill, a single coloured number. The page should still read as a black-and-white product with occasional, meaningful colour. Never use the semantic colours for decoration, links, or emphasis.

## 4. Design principles specific to Vigil

- **Status language is consistent everywhere.** A run, a page within a run, a client's overall health, and an investigation all use the same vocabulary and colour:
  - `Passed` (no change beyond threshold) — success green dot
  - `Changes found` (over threshold, awaiting review) — warning amber dot
  - `Likely regression` / `Broken` (post-assessment, or large diff) — danger red dot
  - `Running` — info / animated
  - `Resolved` / `Accepted` — neutral / muted
- **Two diffs, clearly labelled.** When a checkpoint exists, never make the reviewer guess which comparison they're looking at. Label them explicitly: **"Since you started work"** (Checkpoint → Capture) and **"Since last approved"** (Baseline → Capture).
- **Recommend, don't decide.** Claude's assessment and any system heuristic produce a *recommendation* ("Recommended: accept new baseline") shown as a badge. The human always taps the actual Accept / Keep button.
- **Nothing destructive without a beat.** Accepting a new baseline overwrites the reference. Show the old → new side by side at the moment of the action so it's a deliberate choice.

## 5. Information architecture / sitemap

```
Login (Google SSO gate)
│
├── Dashboard (fleet overview — all clients)
│
├── Client detail
│     ├── Pages (list of valuable pages)
│     │     └── Page detail (baseline, capture history, mask config)
│     ├── Runs (history for this client)
│     │     └── Run report  ──► Diff review (per page)  ← the hero screen
│     ├── Schedule (cron settings)
│     └── Client settings (thresholds override, retention override, notify list)
│
├── Investigations (cross-client queue of flagged items)
│
└── Settings (global)
      ├── Account / team (who can sign in)
      ├── Anthropic API key
      ├── Global diff thresholds
      ├── Global retention cap
      └── Notification defaults
```

Primary navigation (persistent left rail or top bar, monochrome): **Dashboard · Investigations · Settings**. Client detail is reached by drilling in from the dashboard.

## 6. Key user flows (narratives for the mockups)

### 6.1 First-time setup
1. User signs in with Google (must be `@digitaltreasury.com.au`).
2. Empty dashboard → prominent **"Add client"**.
3. Add client form: name, primary URL, (optional) logo, schedule, notify list.
4. On the new client → **"Add pages."** Either add manually (label + URL, pick viewports, optional mask/wait selectors) or **"Import CSV"** (label,url per row).
5. First capture runs → each page's first successful capture becomes its Baseline automatically (with a clear "this is now your baseline" confirmation). User can re-capture/re-bless from page detail.

### 6.2 Routine scheduled run (drift catching)
1. Cron fires for a client (e.g. every Monday 06:00 Australia/Melbourne).
2. Vigil captures all valuable pages, diffs each Capture → Baseline.
3. Email goes to the notify list: *"Vigil — [Client]: 2 of 11 pages have changes"* with a deep link.
4. Reviewer opens the run report, sees 9 `Passed` and 2 `Changes found`, clicks into the two.
5. For each: accept the new baseline, or keep old + flag to Investigations.

### 6.3 Maintenance window (the core flow — before/after)
1. Team is about to run weekly updates on Client X.
2. On Client X (or the run screen): **"Start checkpoint"** → Vigil captures the current state of all valuable pages as the **Checkpoint** ("before"). A banner now shows: *"Maintenance checkpoint active — started 9:14am."*
3. Team does the plugin/theme/core/hosting updates outside Vigil.
4. Team hits **"Run now"** (or the schedule fires) → Vigil captures the **"after."**
5. Run report shows, per page, **two** comparisons:
   - **Since you started work** (Checkpoint → Capture) — *the primary signal; this is what the update changed.*
   - **Since last approved** (Baseline → Capture) — cumulative context.
6. Reviewer triages each flagged page in the 3-up diff view.
7. When done, **"End checkpoint"** clears the maintenance banner.

### 6.4 Requesting a Claude assessment
1. On a flagged page's diff review, reviewer taps **"Ask Claude."** (Manual, because it costs money — never automatic.)
2. Vigil sends Claude the before image, after image, the visual diff overlay, and a summary of the source + DOM diffs.
3. A panel returns a **severity badge** (Intentional change / Minor cosmetic / Likely regression / Broken), a one-line summary, a longer detail, the affected areas, and a **recommendation** (Accept / Investigate) with reasoning.
4. The recommendation surfaces as a badge next to the Accept / Keep buttons. Human still decides.

### 6.5 Working the Investigations queue
1. Items land here when a reviewer chooses "Keep old + flag for investigation."
2. Cross-client list: each row = client, page, viewport, when flagged, thumbnail of the diff, severity (if assessed), who flagged it.
3. Reviewer opens one → same diff review screen, with a notes field.
4. Actions: **Resolve** (tick off, removes from queue), **Accept baseline now** (resolves + promotes), or leave open.
5. Queue supports filtering by client and severity, and a visible count badge in the nav.

## 7. Screen-by-screen specification

For each screen: purpose, key elements, the states to mock (empty / loading / populated / error where relevant), primary actions.

### 7.1 Login
- **Purpose:** SSO gate.
- **Elements:** DT logo, product name, single "Continue with Google" button, fine print that access is restricted to the digitaltreasury.com.au workspace.
- **States:** default; access-denied (wrong domain) message.

### 7.2 Dashboard — fleet overview
- **Purpose:** Answer "is anything wrong across all clients, right now?" instantly.
- **Elements:**
  - Header with global counts: total clients, runs today, **pages awaiting review**, open investigations.
  - A list/table of clients. Each row: client name + logo, overall health dot, last run time + result (e.g. "11 passed" or "2 changes"), next scheduled run, maintenance-checkpoint indicator if active, quick **"Run now"** action.
  - Sort by "needs attention first." Search/filter by client name.
  - A clear, persistent **"Add client"** affordance.
- **States:**
  - *Empty* (no clients yet): welcoming first-run with one CTA.
  - *Populated:* the table. Show a realistic mix — most green, a couple amber, one running.
  - *A client mid-run:* animated/processing state on that row.
- **Primary actions:** Add client; Run now; drill into a client.

### 7.3 Client detail
- **Purpose:** Everything about one client.
- **Elements:**
  - Header: client name, logo, primary URL, overall health, **"Run now"**, **"Start checkpoint" / "End checkpoint"** toggle (with active banner when on).
  - Tabs or sections: **Pages**, **Runs**, **Schedule**, **Settings**.
  - **Pages:** list of valuable pages — label, URL, viewports (desktop/mobile chips), baseline thumbnail, last result. Add page / Import CSV / edit / remove.
  - **Runs:** reverse-chronological run history — date/time, trigger (manual / scheduled / checkpoint pair), result summary, link to report.
  - **Schedule:** cron config (see 7.9 pattern), timezone shown as Australia/Melbourne.
  - **Settings:** per-client threshold override, per-client retention override, notify-list (emails), Lighthouse on/off.
- **States:** empty pages; populated; checkpoint-active banner variant.

### 7.4 Page detail
- **Purpose:** Manage one valuable page's baseline and see its history.
- **Elements:**
  - Current **Baseline** (desktop + mobile thumbnails, when last approved, by whom), with **"Re-capture & set baseline."**
  - **Capture history** timeline (each run's capture, result, diff %).
  - **Mask regions** editor: list of CSS selectors excluded from the visual diff, with add/remove. (Design a clean way to show "these areas are ignored" — e.g. listed selectors, ideally a future visual picker; v1 is a selector list.)
  - **Wait config:** optional "wait for selector" before capture.
  - Viewport toggles.
- **States:** has baseline; no baseline yet (first capture pending); error on last capture (e.g. page returned 500 / timed out).

### 7.5 Add / Edit Client (form + CSV modal)
- **Elements:** name, primary URL, optional logo upload, schedule (can defer), notify emails, Lighthouse default toggle.
- **CSV import modal (for pages, reachable here and from client detail):** drop zone, expected format hint (`label,url,viewports?`), preview table of parsed rows with validation (flag bad URLs), confirm import.
- **States:** create vs edit; CSV preview with some invalid rows highlighted.

### 7.6 Add / Edit Page
- **Elements:** label, URL, viewport checkboxes (desktop / mobile), optional mask selectors, optional wait-for-selector.
- **States:** create vs edit.

### 7.7 Run report — *important*
- **Purpose:** The summary of one run; the launchpad into individual diffs.
- **Elements:**
  - Header: client, run timestamp, trigger type, **comparison context** (e.g. "Compared against baseline" or "Maintenance run — checkpoint started 9:14am"), overall tally (e.g. "9 passed · 2 changes · 0 broken").
  - Per-page rows: page label + viewport, status dot, **diff %** (coloured number), tiny before/after/diff thumbnails, Lighthouse delta (e.g. "Perf 92 → 88 ▼"), and — if a checkpoint exists — the *two* diff figures side by side ("vs start: 0.3% · vs baseline: 4.1%"). Each row → opens diff review.
  - Bulk affordance: "review next" navigation so a reviewer can move page→page without returning to the list.
- **States:** all passed (celebratory-but-restrained empty-of-problems state); changes present; a page errored during the run (couldn't capture); run still in progress (rows filling in).
- **Primary actions:** open a diff; jump to next unreviewed.

### 7.8 Diff review — **the hero screen**
- **Purpose:** Let a reviewer understand exactly what changed and act on it.
- **Layout:** Give this the most space. A focused, near-full-screen review surface.
- **Elements:**
  - **Page context:** client · page label · URL · viewport · run timestamp.
  - **Comparison switcher** (only when a checkpoint exists): toggle between **"Since you started work"** and **"Since last approved."** Default to "Since you started work" during maintenance runs (it's the cleaner signal); otherwise "Since last approved."
  - **Image comparison area** with selectable modes — design at least these three:
    1. **Side by side** (before | after).
    2. **Overlay / onion-skin** with an opacity slider.
    3. **Swipe** (draggable divider).
    Plus a **diff-highlight** toggle that paints changed pixels in the magenta highlight (`#FF1F8E`) over the after image. Show the **diff %** prominently.
    - For a 3-way (Baseline · Checkpoint · Capture all present), provide a **3-up** view as a fourth mode.
  - **Code tabs** beneath or beside the images:
    - **Source HTML diff** (served markup, classic red/green line diff — note: these reds/greens are *code-diff* convention and can be the only place green/red appear as additions/removals; keep them muted and contained to the diff panel).
    - **Rendered DOM diff** (post-JS, normalised — labelled clearly as "normalised" so the reviewer knows volatile attributes were stripped).
  - **Lighthouse panel:** the four category scores baseline vs current with deltas (Performance, Accessibility, Best Practices, SEO). Small, scannable.
  - **Claude assessment panel:** collapsed by default with an **"Ask Claude"** button (and a subtle note that it uses the API). Once run, expands to show severity badge, one-line summary, detail, affected areas, recommendation badge + reasoning. If already assessed, shows the result and a "re-assess" option.
  - **Decision bar (always visible):** **"Accept new as baseline"**, **"Keep old & flag for investigation"**, and **"Add region to ignore mask"** (opens a quick selector add). When a recommendation exists, show it inline next to the buttons ("Recommended: Accept").
- **States:**
  - changes pending review (default);
  - assessment not yet requested vs assessment present;
  - the moment-of-accept confirmation (old → new shown side by side);
  - page errored (capture failed — show the error, offer re-run, no accept possible);
  - no checkpoint (hide the comparison switcher; single comparison).
- **Primary actions:** Accept / Keep+flag / Add mask / Ask Claude / next page.

### 7.9 Schedule (per client)
- **Elements:** enable/disable, frequency picker (e.g. daily / weekly with day + time, or a simple cron-ish builder), timezone fixed-display as Australia/Melbourne, "next run" preview.
- **States:** off (no schedule, manual-only); on.

### 7.10 Investigations queue
- **Purpose:** A working list of unresolved flagged items across all clients.
- **Elements:** count badge in nav; filterable list (by client, by severity, by viewport); each row: client · page · viewport · flagged date · who flagged · diff thumbnail · severity badge (if assessed) · short note preview. Row → diff review with notes. Bulk: resolve, accept.
- **States:** empty (encouraging "nothing to investigate"); populated; filtered.

### 7.11 Settings (global)
- **Elements:**
  - **Team/access:** confirmation that sign-in is restricted to the workspace domain; (optional) list of who has signed in.
  - **Anthropic API key:** masked input, "test connection," note that it powers the Ask-Claude assessments and that assessments are manual.
  - **Global diff thresholds:** the default % threshold (clients can override down/up).
  - **Global retention cap:** maximum history kept (caps any per-client setting).
  - **Notification defaults:** default notify behaviour, from-address.
- **States:** default; API key set vs unset; connection test pass/fail.

### 7.12 Notification email (template)
- **Purpose:** The thing that pulls people back into Vigil.
- **Design:** Match the agency email style — short, simple, thin, monochrome, DT logo. Subject like *"Vigil — [Client]: 2 pages changed."* Body: client, run time, the tally (passed / changes / broken), and a single prominent button **"Review run."** Keep it to one screen, no clutter. Provide both a "changes found" and a "maintenance run complete" variant.

## 8. Component inventory

Design these as a small, reusable kit (monochrome unless noted):
- **Status dot + pill** (Passed / Changes / Likely regression / Broken / Running / Resolved) — the only routine colour carriers.
- **Diff-percentage figure** — large numeral, coloured by band.
- **Severity badge** (the four Claude severities).
- **Recommendation badge** ("Recommended: Accept" / "Recommended: Investigate").
- **Image comparison viewer** — the multi-mode component (side-by-side / overlay+slider / swipe / 3-up), with diff-highlight toggle. This is the centrepiece; design its controls carefully.
- **Lighthouse score chips** — score + delta arrow, four categories.
- **Code diff panel** — line-level add/remove, with a "normalised" label variant for DOM.
- **Client row** (dashboard) and **page row** (client detail) and **run-page row** (report) — three related but distinct list rows.
- **Maintenance-checkpoint banner** — active-state strip with start time + "End checkpoint."
- **CSV import modal** — drop zone + validated preview table.
- **Empty states** — for dashboard, pages, runs, investigations (each warm, minimal, one CTA).
- **Toasts/confirmations** — especially the accept-baseline confirmation.
- **Cron/schedule builder.**
- **Thumbnail trio** — small before/after/diff cluster used in lists.

## 9. States, edge cases & copy to design for

- **All-clear run:** make "nothing wrong" feel good and fast to confirm, not anticlimactic-but-confusing. A clean "11 of 11 passed" with a calm confirmation.
- **Capture failure:** a page might 500, time out, redirect, or hit a login wall (auth pages are out of scope — they'll simply fail; show that honestly). The row/screen must distinguish "captured and differs" from "couldn't capture." No baseline action on a failed capture.
- **First baseline:** the "this capture is now your baseline" moment needs a clear confirmation.
- **Large/obvious break:** when diff % is very high or assessment says "Broken," the screen should escalate visual urgency (more red, surfaced at top of the report).
- **Maintenance active:** the checkpoint banner must be unmissable across the client's screens so people don't forget to end it.
- **Long full-page screenshots:** pages are full-page (can be very tall). The comparison viewer must handle very tall images gracefully (scroll-synced in side-by-side, sensible zoom-to-fit, the ability to focus a region).

## 10. Responsive & platform notes

Desktop-first — this is an internal tool used at a desk, and the diff review genuinely needs screen real estate. Mockups should target a standard desktop width. A tablet-friendly dashboard/report is a nice-to-have for checking runs on the go, but the diff review can be desktop-only for v1. Mobile is not a target (note: "mobile" elsewhere in this doc means the *captured* mobile viewport of client sites, not the device Vigil runs on).

## 11. Accessibility basics

- Never rely on colour alone for status — pair every status colour with text and/or an icon/shape (the colour-blindness case matters given the whole product is about visual judgement).
- Maintain strong contrast (the monochrome base helps).
- Keyboard-navigable review flow (accept / keep / next-page via keys would make triage fast — worth designing shortcuts in).

---

## Appendix — terms used in this doc

- **Baseline** — the accepted-good reference for a page (image set + source HTML + rendered DOM + Lighthouse).
- **Checkpoint** — an optional on-demand "before I start work" snapshot, used for before/after maintenance comparison.
- **Capture** — what a run produces for a page ("current" / "after").
- **Run** — one execution that recaptures all of a client's valuable pages and diffs them.
- **Diff** — the computed difference (visual %, source HTML, normalised rendered DOM).
- **Assessment** — Claude's manual, on-demand severity + recommendation on a flagged diff.
- **Investigation** — a flagged item kept in a cross-client queue until resolved.
