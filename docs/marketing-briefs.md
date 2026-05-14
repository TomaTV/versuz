# Versuz — briefs marketing pré-launch

Briefs textuels à transmettre à Figma / After Effects / Veo / Midjourney /
ChatGPT pour produire les livrables visuels et copy avant le launch.

Conventions :
- **Palette** : bone-cream `#FAF8F3` (background), ember `#C2410C` (accent),
  azure `#1E40AF`, sage `#84A98C`, ink `#0A0908` (text). Pas d'autre couleur.
- **Typo** : Instrument Serif (display, italic sur le `s` du wordmark),
  IBM Plex Mono (mono small caps).
- **Style** : flat 2026, square corners, no shadows. Pas de gradient, pas
  de 3D, pas d'emoji.

---

## M1. Animation logo (Veo)

### Concept

Le mark "double-flame ember" se construit en 2 secondes, le wordmark "verSuz"
apparaît letter-by-letter, le `s` est italique avec un dot ember en suffixe
qui pulse 1× puis se stabilise.

### Brief Veo 3 (FR + EN)

```
Two ember-colored flat flame shapes (color #C2410C) emerge from the center
of a bone-cream background (color #FAF8F3) — first one flame appears with a
gentle scale-in (0.3s), then a second flame slots beside it (0.2s offset),
forming a tight pair. The two flames are stylized: simple, flat,
square-cornered, no shadows, no 3D, no gradient.

Then the wordmark "verSuz" appears letter-by-letter to the right of the
flames, in Instrument Serif italic, color ink (#0A0908). The letter "s" is
italic, with a small ember-colored dot (#C2410C) immediately after the
final "z". The dot pulses once (scale 1 → 1.3 → 1, opacity 1 → 0.7 → 1)
over 0.4s, then holds.

The full sequence is 3.5–4 seconds. Hold the final composition for an
extra 0.5s before fade-out.

Constraints:
- Flat 2026 design language, no skeuomorphism, no shadows, no 3D
- Letter-spacing tight (-0.02em)
- Background completely flat bone-cream — no texture, no grain
- No music in the export, just visual

Variants needed:
1. 1080×1080 (Instagram feed) — 4s
2. 1080×1920 (TikTok / Reels / IG Stories) — 4s, mark center-vertical
3. 1920×1080 (LinkedIn / Twitter video, banner usage) — 4s, mark+wordmark
   horizontal, leave 30% black-bone area on the right for caption overlay
4. 800×800 (favicon-source still) — frame at t=3.0s, just the flames + wordmark
```

### À vérifier en sortie

- Couleurs exactes (Hex match ember `#C2410C`, bone `#FAF8F3`)
- Pas de motion-blur résiduel sur les flames (Veo a tendance à en mettre)
- Le dot après le `z` reste un carré net 18×18px, pas un cercle

---

## M2. Templates Figma

### M2.a — Instagram carousel (10 slides, 1080×1350 portrait)

**Objectif** : conversion `/marketplace`, comprend une mini démo CLI.

```
Slide 1 — Hook
  Background : bone-cream solide
  Title : "5,000+ AI coding skills" (Instrument Serif 96px, ink)
  Subtitle (mono 14px, fg-muted) : "Stars don't prove quality."
  Footer (mono 10px, ember) : "@versuz · open public benchmark"

Slide 2 — Problem
  Title : "Which skill is actually good ?" (italique sur "actually")
  Body 3 bullets (mono 14px) :
    — anthropics/skills · 244k★ but no benchmark
    — random author · 2★ but tests well
    — same name 12× across repos
  Visual : capture floutée de GitHub avec 5 dépôts "claude-code-skill"

Slide 3 — Solution
  Title : "Versuz judges them all."
  Subtitle : "3 LLM judges. 5 tasks each. 100k items ranked."
  Visual : screenshot leaderboard top 5 (skills + claude-md)

Slide 4 — How
  Sketch 5-step flow (icons square 24px, ember+azure+amber+crimson+sage) :
  Submit → 30 Tasks → 3 Judges → Score → Rank
  Mono labels under each icon

Slide 5 — Show, don't tell
  Side-by-side leaderboard screenshot
  Caption : "Real bench scores, not stars. Updated daily."

Slide 6 — CLI
  Terminal mockup (ink background, bone-cream code, ember prompts) :
    $ npx versuz search pdf
    > 47 results
    $ npx versuz install pdf-generator
    ✓ Wrote .claude/skills/pdf-generator/SKILL.md

Slide 7 — MCP
  Code block (mono) :
    claude mcp add versuz npx -y @versuz/mcp
  Caption : "Now Claude Code can search and install Versuz skills inline."

Slide 8 — Stats
  Big number panel :
    100,000+ items indexed
    410 LLM-judged
    3 frontier judges (Haiku, DeepSeek, GPT-5 mini)
  Mono labels

Slide 9 — Quote / Trust
  Quote from your tagline OR a real early-user reaction :
    "First public benchmark for AI agent skills."
  Attribution (mono 12px) : "— launched May 2026"

Slide 10 — CTA
  Background : ember solid (#C2410C)
  Text : "versuz.dev" (Instrument Serif 128px, bone-cream)
  Subtitle (mono 14px, bone-cream 70%) : "$ npx versuz"
  Footer : Instagram / Twitter / Bluesky / GitHub icons
```

### M2.b — TikTok / Reels (1080×1920, 15s + 30s)

```
15s version — "Stars don't prove quality"
  0.0-1.5s : Logo animation (M1 vertical variant)
  1.5-3.0s : Static title "Stars don't prove quality" (zoom-in)
  3.0-6.0s : Scroll through 8 GitHub repos with stars highlighted
             ("244k★", "180k★", "12k★", …) — fast cuts
  6.0-9.0s : Cut to /leaderboard screenshot, highlight top item
             — caption : "But which actually works?"
  9.0-12.5s : Terminal CLI demo (typed in real-time effect)
             $ npx versuz install <top-skill>
             ✓ Done
  12.5-15.0s : "versuz.dev" + ember CTA, hold

30s version — same intro, add :
  9.0-15.0s : Side-by-side : "popularity rank vs bench rank" for 3 skills,
              highlight 1 item that jumps from rank 47 (stars) to rank 3 (bench)
  15.0-22.0s : Show CLI install + Claude Code MCP integration
  22.0-27.0s : Stats panel (animated counter)
  27.0-30.0s : CTA

Music : licensed lofi-tech track, ~90bpm, no vocals.
Caption font : Inter Tight 24pt mono (TikTok-native).
Captions burnt-in for accessibility.
```

### M2.c — LinkedIn post (1200×627)

```
Layout : horizontal, ink background.
Left third (400px) : Versuz mark (ember) + wordmark stacked, bone-cream.
Right two-thirds : screenshot of /leaderboard top 5, slightly cropped to
keep ink margin.
Bottom strip (60px tall) : ember bar with bone-cream text :
"Public benchmark for AI agent skills · versuz.dev"
```

### M2.d — Twitter banner (1500×500)

```
Background : bone-cream solid.
Left 60% : Wordmark "verSuz" centered horizontal, Instrument Serif 200px,
ink. Ember dot after `z` (18px square).
Right 40% : pattern of small ember/azure/sage squares arranged in a
diagonal mosaic — light, abstract, 30% opacity.
No tagline — Twitter bio handles that.
```

---

## M3. Copy pré-launch

### M3.a — Tweet thread (10 tweets)

```
1/  Stars don't prove quality.

    I just launched Versuz — a public benchmark for AI agent skills.

    100,000+ SKILL.md and CLAUDE.md, 3 LLM judges, ranked daily.

    versuz.dev

2/  The problem : you find "claude-code-pdf-extractor" with 12k stars
    AND "pdf-skill-by-randomdev" with 8 stars. Same task. Which one
    actually works ?

    Today : you guess based on stars. Stars rank popularity, not quality.

3/  Versuz runs every public AI agent skill through the same task suite,
    judges the outputs with 3 frontier LLMs (Claude Haiku 4.5, DeepSeek
    V4 Flash, GPT-5 mini), and publishes the ranking.

    Open. Free. No signup.

4/  The catalog is already big :
    — 5,000+ skills indexed
    — 5,200+ CLAUDE.md files
    — 14 awesome-list sources + 26 GitHub topics scraped daily
    — content-hash dedup, near-dup detection
    — license SPDX capture (no ToS violations)

5/  How to use it (3 ways) :

    Browse → versuz.dev/marketplace
    CLI → npx versuz search pdf && npx versuz install <slug>
    MCP → claude mcp add versuz npx -y @versuz/mcp

    Claude Code itself can now search + install Versuz skills inline.

6/  The bench engine isn't toy :
    — 5-axis rubric aligned to FLASK / JudgeBench / HELM
    — N=5 tasks/item × 3 judges = 15 evals/item, CI95 ±6-7 pts
    — Anthropic prompt cache, ~30% input cost savings
    — ~$2.60/day for 100 skills

7/  Why a marketplace ?

    Authors of the best skills should get paid. Versuz takes 30%, author
    keeps 70%, automatic Stripe Connect split. No invoicing, no payouts to
    manage.

    Default is free. Premium is opt-in.

8/  Trust ladder is progressive :
    1. claimed (auth proves ownership of the GitHub account)
    2. verified (one-time check of the SKILL.md content)
    3. reviewed (manual review by Versuz)
    4. featured (editorial pick)

    Plus an "Official" badge for major orgs (Anthropic, Vercel, Stripe, …).

9/  What I'm shipping next :
    — Pairwise Bradley-Terry on top 5%
    — Human gold-set calibration (200 items)
    — Smithery / mcp.so / mcp-get registries integration
    — multi-format (AGENTS.md, .cursorrules, .windsurfrules)

10/ If you have a skill in any of those formats, submit it :

    npx versuz submit https://github.com/your/repo

    Open-source rank wars start NOW. versuz.dev
```

### M3.b — Bluesky bio + Twitter bio (identique, 160 chars)

```
Public benchmark for AI agent skills — 100k+ ranked, 3 LLM judges, free.
$ npx versuz install <slug>     versuz.dev
```

### M3.c — Show HN draft

```
Title : Versuz — Public benchmark for AI agent skills (100k+ SKILL.md ranked)

Body :
Hi HN — I built Versuz because every time I look for a Claude Code skill or
a CLAUDE.md, I'm picking between "highly-starred but never tested" and
"tiny repo I've never heard of".

So I scraped them all — 5,000+ SKILL.md + 5,200+ CLAUDE.md + 14 awesome-list
aggregators — and ran each one through a held-out task suite judged by 3
frontier LLMs (Anthropic Haiku 4.5, DeepSeek V4 Flash, OpenAI GPT-5 mini).

The catalog and rankings are at versuz.dev. There's a CLI (npx versuz)
and an MCP server (claude mcp add versuz npx -y @versuz/mcp) so Claude
Code itself can search and install skills inline.

Methodology lives at /methodology — 5-axis rubric aligned to FLASK /
JudgeBench / HELM, N=5 tasks × 3 judges, ~$2.60/day operational cost.
Content-hash dedup + license SPDX capture. Items < 30 chars in description
get a near-duplicate hash so copies of a popular skill collapse.

Marketplace is free by default. Authors can opt in to charge — Stripe
Connect splits 70/30 automatically. Featured items are first-party
editorial.

Open to feedback on the bench methodology, the scoring weights (currently
0.35 / 0.30 / 0.20 / 0.10 / 0.05 for instruction_following / correctness /
completeness / usefulness / safety), and what registries I should add next
(Smithery, mcp.so, mcp-get are on the roadmap).

Source : github.com/TomaTV/versuz
```

### M3.d — Instagram caption (3 variants A/B/C)

```
A — Direct
  Stars don't prove quality.

  Versuz benchmarks every public Claude skill against a held-out task suite,
  judged by 3 frontier LLMs. Free, open, updated daily.

  versuz.dev · $ npx versuz

  #ai #claudecode #benchmark #opensource

B — Curious
  How do you know which AI coding skill actually works ?

  Until last week : guess by stars.
  Since today : versuz.dev — public benchmark, 100k+ items, 3 LLM judges.

  Link in bio.

  #ai #devtools #claudecode

C — Founder note
  Six months building this in public. Today it's live.

  Versuz : a public benchmark for AI agent skills. 100,000+ SKILL.md and
  CLAUDE.md indexed, judged by 3 frontier LLMs, ranked daily.

  Free. Open. No signup.

  versuz.dev

  #buildinpublic #ai #benchmark
```

---

## Production order

1. **Day -3** : Veo logo animation (M1), 4 variants → if Veo first pass is
   bad, redo with different seed before doing anything else.
2. **Day -2** : Figma templates (M2.a + M2.b + M2.c + M2.d) reusing the
   logo animation as a static frame for the Insta carousel slide 1.
3. **Day -1** : Copy refinement (M3.a-d) — paste into Notion, get a friend
   to read for naturalness, adjust.
4. **Day 0 (launch)** : Wave 1 — tweet thread, Show HN, LinkedIn post.
5. **Day +1 to +3** : Wave 2 — Insta carousel + Reels + TikTok.

Total exec time : ~6h Figma + ~2h Veo iteration + ~3h copy = 11h spread
over 3 days. Doable solo.

## Asset checklist before launch

- [ ] logo-anim-square.mp4 (1080×1080)
- [ ] logo-anim-vertical.mp4 (1080×1920)
- [ ] logo-anim-landscape.mp4 (1920×1080)
- [ ] insta-carousel-1-10.png (10 files)
- [ ] reels-15s.mp4
- [ ] reels-30s.mp4
- [ ] linkedin-post.png
- [ ] twitter-banner.png
- [ ] og-image.png (already auto-generated, just verify via opengraph.xyz)
- [ ] press-kit.zip (all SVG logos + 4 screenshots above)

Press kit goes to `/press-kit/` route (static file in `public/press-kit/`).
