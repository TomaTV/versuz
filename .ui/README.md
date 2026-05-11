# Handoff: Versuz — open arena for Claude skills

## Overview
Versuz is a public benchmark / leaderboard for Claude skills. Skills are evaluated by
three frontier-model judges (Opus 4.7, GPT-5, Gemini 2.5 Pro) over a held-out task
suite, ranked with a Bayesian Elo, and published every 24 h.

This handoff covers the **public-facing site**:

- **Landing** — hero, today's featured battle, methodology, top-of-bracket preview, submit CTA
- **Standings** (leaderboard) — full table + benchmark matrix + filters
- **Skill detail** — dossier per skill (stats, judge rationales, per-task scores, rivalries, challenge CTA)
- **Brand & design system** — tokens, marks, type, components reference

## About the design files
The files in this bundle are **design references created in HTML**. They are
single-file React-via-Babel prototypes used to present and validate the visual
direction. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment**
(Next.js, Astro, Vue, SwiftUI, etc.) using its established patterns, component
library, and routing. If no environment exists yet, choose the most appropriate
framework for a marketing + benchmark site (Next.js / Astro both work well) and
implement the designs there.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, and interactions are
all locked in. Recreate pixel-perfectly using the codebase's existing libraries
and patterns. The CSS custom properties listed under "Design Tokens" should be
ported as the design system's source of truth.

---

## Pages / screens

### 1. Landing — `Versuz Landing.html`
**Purpose:** marketing entry point; convey what Versuz is, surface today's bout, drive submits.

**Layout:** sticky nav (72 px, blurred bone) → live ticker strip → main content
(max-width 1440 px, 64 px horizontal padding). Sections use a `180 px | 1 fr`
two-column grid: left column holds an editorial figure number (`§ 01 / Today's
Bout`), right column holds the section content.

**Sections, in order:**
1. **Hero** — full viewport. Eyebrow row (top-left) + UTC clock (top-right).
   Massive `clamp(72px, 11vw, 168px)` Instrument Serif headline (configurable —
   3 variants in the prototype). Bottom row: subhead + primary CTA + 3-up stat
   block (skills · tasks · judges) + "Latest" mini-card linking to the most
   recent bout. Decorative shapes scattered absolute-positioned: stacked stripes
   top-right, big ember disc with cut-out mid-right, ink wedge mid-left, dot
   matrix bottom-right. **Do not animate** these shapes.
2. **Featured battle** (`§ 01 — Today's Bout`) — `BattleSpread` component.
   Two-up A vs B with judge breakdown.
3. **Method** (`§ 02`) — 5-row numbered list (Submit → 30 Tasks → 3 Judges → Score → Rank).
4. **Standings preview** (`§ 03`) — `BenchmarkMatrix` (top-5 skills × task suites).
5. **Submit CTA** (`§ 04 — Enter`) — large headline + copy + terminal chip
   `npx versuz submit ./my-skill`.

### 2. Standings — `Versuz Prototype.html` (the Leaderboard screen inside it)
**Purpose:** browse and filter all 247 ranked skills.

**Layout:** filter rail at top (category tabs + search), main table below. The
top row is the leader and gets a sage-tinted background.

### 3. Skill detail — `Versuz Skill.html`
**Purpose:** the full dossier for one skill — install, judge rationales, history.

**Sections:**
1. **Breadcrumb / jump-to row** — sibling skills linked in mono caps.
2. **Hero** — figure number + rank badge + author + huge skill name (italic when rank=1) + description + Install CTA + GitHub link. A faint oversized italic rank number sits in the top-right at 5% opacity (decoration, not content).
3. **Stats strip** — 4-up: Elo · Win rate · Battles · Installs. Numbers in display serif at 56 px tabular nums. 7-day Elo sparkline below.
4. **Three judges** (`§ 01 — Rationale`) — per-judge: weight, name, big italic ember score, italic verdict pull-quote.
5. **History** (`§ 02`) — two columns: Last 5 battles (W/L · vs · score · delta) + Per-task scores (15 rows with hairbar + score).
6. **Rivalries** (`§ 03`) — 2×2 grid of head-to-head cards (record, last delta, share bar, optional editorial note).
7. **Challenge CTA** (`§ 04`) — `npx versuz challenge <slug>` terminal chip with decorative wedge + ember disc.

### 4. Brand reference — `Versuz Brand.html`
A static design-system page documenting marks, color, type, components. Use this
as your visual source of truth.

---

## Design tokens

Ported from the prototype CSS custom properties. Light theme is the default; a
dark theme exists in `Versuz Prototype.html` only.

### Colors
```
--bg              #F2EEE6   /* bone — page background */
--surface         #ECE7DD   /* paper — cards, code chips */
--surface-hover   rgba(20,18,14,0.04)
--fg              #14120E   /* ink — primary text + buttons */
--fg-muted        #6B6557   /* slate — meta, captions */
--rule            rgba(20,18,14,0.12)   /* hairlines */
--rule-strong     rgba(20,18,14,0.24)   /* heavy hairlines, focus */
--accent          #C2410C   /* ember — the one accent */
--accent-soft     rgba(194,65,12,0.12)
--leader-tint     rgba(31,92,61,0.08)   /* sage — leader row only */
--leader-tint-strong rgba(31,92,61,0.14)
--danger          #991B1B
--warning         #92400E
```
Semantic palette (badges, deltas, judge tags) used sparingly:
sage `#3F7D4F`, crimson `#B23A3A`, azure `#2A5FA8`, amber `#D69E2E`.

**Rules:** No gradients. No glow. Ember is the only ambient accent — use it
exclusively on links, primary CTAs (hover swap), italic emphasis in display
copy, and positive deltas. Sage is reserved for the rank-#1 row tint.

### Typography
| Role     | Family                    | Sizes (px)                           |
|----------|---------------------------|--------------------------------------|
| Display  | `Instrument Serif`        | 22 / 32 / 56 / 88 / 120              |
| UI       | `Geist` 300/400/500/600   | 13 / 15 / 18 / 14 (button)           |
| Mono     | `JetBrains Mono` 400/500  | 10 / 11 / 12 / 13 / 14               |

Hero headline uses `clamp(72px, 11vw, 168px)`, line-height 0.92,
letter-spacing −0.045em. Italic display = ember accent (don't pair italic with ink).

### Spacing
Section padding: `120px 64px` outer, `80px 64px` inner. Editorial 2-col
grid: `180px 1fr` with 64 px gap. Card padding: 32 px. Stat strip rows: 32 px vertical.

### Borders / radii
**No border radius anywhere.** All corners are square — including buttons,
inputs, badges, cards. Hairline borders are `1px solid var(--rule)` or
`var(--rule-strong)`.

### Shadows
None.

### Motion
- Hover transitions: `200ms` color/border/background only
- Live pulse: `pulse 1.6s infinite` on the live-cycle dot
- Marquee ticker: 32s linear infinite; horizontally translate −33.333% (3× duplicated content)
- Screen entry: `fadein .5s ease-out both`

---

## Components inventory

Files of interest:

- `brand.jsx` — `VersuzMark` (chevron logo), `VersuzWordmark`, `SkillGlyph`
  (deterministic per-skill 2-tone glyph from id hash), `Bracket` (corner-tick
  frame), `Eyebrow`, `FigureNumber`, plus `BRAND_PALETTE` JS constant.
- `components.jsx` — `RankBadge`, `HairBar` (thin score bar), `SkillRow`
  (leaderboard row), `BattleSpread` (featured battle module), `CategoryTabs`.
- `screen-leaderboard.jsx` — exports `Leaderboard` and `BenchmarkMatrix` (top-5 × task suites table).
- `screen-landing.jsx` — composed landing screen.
- `screen-detail.jsx` — composed skill-detail screen + `Sparkline` helper.
- `vz-chrome.jsx` — `VzNav` (sticky header), `VzTicker` (live marquee strip), `VzFooter`.
- `tweaks-panel.jsx` — design-time controls only; **do not port** to production.

When porting, treat each `<Component>` as a target React/Vue/Svelte component;
the JSX is already idiomatic React 18.

---

## State / data

Mock data lives in `data.jsx`:

- `SKILLS` — array of leaderboard rows (12 entries)
- `CATEGORIES` — filter taxonomy
- `FEATURED_BATTLE` — today's bout fixture (a/b/winner/judges/rationale)
- `SKILL_DETAIL` — full dossier for `pdf-extract`

In production these become API responses:

- `GET /api/cycle/current` → cycle id + ticker (recent results) + next-tick countdown
- `GET /api/skills?category=&sort=elo` → leaderboard table
- `GET /api/skills/:id` → SKILL_DETAIL shape (rank, elo, elo7d[], judges[], taskScores[], etc.)
- `GET /api/battles?skillId=` → recent battles list
- `POST /api/submit` and `POST /api/challenge/:id` → for the CLI handshakes

The Skill page reads `?id=<slug>` from the URL but the demo always renders the
same fixture — wire it to the real fetch.

## Routing

```
/                      → Landing
/standings             → Standings (leaderboard)
/skills/:slug          → Skill detail
/brand                 → Brand reference (optional public page)
/methodology           → Anchor on Landing today; promote to its own page if it grows
```

## Interactions / behavior

- **Sticky nav** — 72 px, `backdrop-filter: blur(12px)` over a translucent bone.
- **Live ticker** — sits directly under the nav. CSS marquee, paused on hover (add `:hover { animation-play-state: paused }`).
- **Latest mini-card** (Landing hero) — hover swaps border to ember (200 ms).
- **Method rows** — non-interactive, just typographic.
- **Leaderboard row** — entire row is clickable → skill detail; leader row gets `--leader-tint` background.
- **Skill detail Install / GitHub** — wire to real registry + repo URLs.
- **Theme toggle** (Prototype only) — `data-theme="dark"` on `<html>` swaps the token block. Both themes are documented; light is the production default.

## Accessibility

- All decorative SVGs are marked `aria-hidden`.
- Skip the visual-only "vs" / wedge / disc shapes from screen readers.
- Color contrast: ink on bone = 14.8:1, ember on bone = 5.4:1 (AA), so ember is
  fine for body text but reserve it for emphasis. Slate on bone = 4.7:1 (AA for
  body 18+).
- All buttons have `cursor: pointer` and a 200 ms hover state. Add visible
  `:focus-visible` rings (the prototypes do not — please add a `2px solid var(--accent)` outline at `outline-offset: 2px`).

## Assets

No raster assets. Everything is SVG (logo + skill glyphs) or pure CSS shapes.
Fonts come from Google Fonts:

```
Instrument Serif (italic 0;1)
Geist (300/400/500/600)
JetBrains Mono (400/500)
```

If self-hosting, grab `.woff2` from Google Fonts CSS or use Fontsource.

## Files in this bundle

| File                         | What it is                                            |
|------------------------------|-------------------------------------------------------|
| `Versuz Landing.html`        | Landing page prototype                                |
| `Versuz Skill.html`          | Skill detail prototype                                |
| `Versuz Prototype.html`      | Original 3-screen toggleable prototype + Tweaks panel |
| `Versuz Brand.html`          | Brand & design system reference                       |
| `brand.jsx`                  | Marks + brand-level helpers                           |
| `components.jsx`             | Shared UI components                                  |
| `data.jsx`                   | Mock data fixtures                                    |
| `screen-landing.jsx`         | Landing composition                                   |
| `screen-leaderboard.jsx`     | Leaderboard + benchmark matrix                        |
| `screen-detail.jsx`          | Skill detail composition                              |
| `vz-chrome.jsx`              | Nav + ticker + footer                                 |
| `tweaks-panel.jsx`           | Design-time only — do not port                        |

## Recommended implementation order

1. Port the design tokens (CSS variables) and font loading.
2. Build `VersuzMark`, `VersuzWordmark`, `SkillGlyph`, `Eyebrow`, `FigureNumber`, `RankBadge`, `HairBar` as primitives.
3. Build `VzNav`, `VzTicker`, `VzFooter`.
4. Implement Landing — leave `BattleSpread` and `BenchmarkMatrix` as placeholders, fill them last.
5. Implement Skill detail.
6. Implement Standings (leaderboard).
7. Wire data.

## Open questions for the engineering team

- Auth model for submitters? GitHub OAuth seems implied by the registry framing.
- Does the CLI talk to the same API or to a separate registry service?
- Where do per-task artifacts live (judge transcripts, raw outputs)? The skill detail page assumes they're linkable.
- Dark theme: ship at launch or hold? Tokens are ready either way.
