# Versuz · CHANGELOG

Format: date · cluster · what shipped. Newest first.

---

## 2026-05-14 (late) — V1.6 — landing flip, badge V2, gamification + content automation

The biggest UX shift since launch: every audit (Perplexity, ChatGPT, Gemini, Claude) said the same thing — the live leaderboard belonged above the fold, not under five sections of editorial copy. So we flipped it.

### Landing — proof-first hero
- **Live ranking promoted to §01** (was §05). Top 10 in document + category pills + cycle context + secondary CTAs (full leaderboard, methodology). Editorial manifesto (What / Why / How / Example) demoted to §02-§05.
- **`<NextCycleCountdown>`** in `<VzTicker>` (top status bar) — replaces the static `NEXT CYCLE · DAILY AT 06:00 UTC` with a live `NEXT CYCLE IN 02:47:12 UTC`. Client-side `useState + useEffect + setInterval`, server snapshot is `—:—:—`.
- **`<ArenaStickyCTA>`** — floating bottom-right "Enter the Arena" CTA. Appears after 600px scroll, hides near the footer (`§08` already has the same CTA), suppressed on `/submit`, `/admin`, `/buy`, `/promote`, `/claim`, `/profile`, `/success`.
- Hero data fetch now includes `getCurrentCycle()` to feed the leaderboard subtitle.

### Badge V2 — variants + new endpoints
- **`/badge/[kind]/[slug]`** — query params : `?show=score|elo|prior|rank` and `?style=default|terminal` (full dark palette for dark READMEs). `?show=rank` resolves the category position via `getTopRankedItems` and renders `#1 / DOCUMENT`. Backward-compatible — empty querystring = v1 behaviour.
- **`/badge/author/[login]`** (new) — tier-based author badge. Newcomer / Challenger / Contender / Champion / Veteran computed from contribution count + benched count. Matches by `github_url ILIKE 'https://github.com/<login>/%'` so it works for any GitHub login, claimed or not.
- **`/badge/category/[cat]`** (new) — leaderboard badge per category. Counts registry size (skills + claude_md filtered by `category`), label dynamic : `RANKED` when ≥1 benched, `INDEXED` otherwise. Color stripe per category family (V0/V1 ember · agent-specific azure · V1.5 broader sage · wrappers amber).
- **`<EmbedBadgeBlock>`** enriched — Show/Style selectors below the tab strip, snippet + preview refresh live as the user picks variants.

### Gamification — migration 0052
- **New columns** on `skills` and `claude_md_files` : `top_rank_streak_days`, `top_rank_streak_category`, `top_rank_streak_started_at`. Indexed on `WHERE top_rank_streak_days > 0`.
- **`item_achievements`** table — unified ledger across skill + claude_md via `subject_kind XOR` constraint. 4 types : `triple_crown`, `streak_milestone`, `category_winner`, `first_blood`. Partial unique indexes for idempotent inserts (rerunnable hooks).
- **`author_achievements`** table — tier progression (newcomer → veteran), one row per (login, tier).
- **`rank_history`** table — per-cycle × subject × category snapshot. Unlocks delta-rank computation between cycles + powers the "Today's Upset" pipeline.
- **`scripts/bench/post-cycle-hooks.mjs`** — hooks runner. After each completed cycle : snapshot rank_history (top 100/category), insert achievements (first_blood / category_winner / triple_crown ≥85), update streak counters. Idempotent on rerun.
- **UI** : 🔥 streak chip (orange ember) on `<SkillRow>` and on the skill detail header. ♛ Triple Crown badge (gradient amber→ember) on skill detail when unlocked. `getItemAchievements(kind, subjectId)` query helper.

### CLI v0.2.0 — `versuz battle` + badge handoff
- **`npx versuz submit`** post-success block — prints the ready-to-paste markdown badge for the README + `--add-badge` flag shows step-by-step PR instructions (URL to `github.com/<repo>/edit/main/README.md` + suggested commit message). Footer with countdown to next cycle.
- **`npx versuz battle <a> vs <b> [--kind=claude-md]`** (new) — head-to-head terminal viz, designed for social videos. Split 2-column render with category/stars/tier/score, ember-gradient verdict box with winner + install command + transparency note (benched vs prior).
- Aliases : `duel`, `vs`.
- Description SEO-rewritten + keywords expanded (claude-skills, skill-md, registry, benchmark, ranking, elo, anthropic, agent, ai-agent). User-Agent bumped to `versuz-cli/0.2.0`.

### Content automation — "Today's Upset" pipeline
- **`/api/og/upset`** (new) — 1200×630 social card with `next/og`. Query params : `kind`, `category`, `challenger`, `delta`. Renders top 5 leaderboard with challenger row highlighted in ember band, headline italic ember, optional delta indicator (sage `↑ +N places` or crimson `↓ -N`), brand stripe + judges footer. Fallback to "Top 5 in {category}" when no challenger data.
- **`getRecentUpsets({ kind, minDelta, limit })`** — query helper that diffs `rank_history` between the current and previous cycle, returns enriched rows (subjectId, slug, name, category, currentRank, prevRank, delta, elo). Returns `[]` when rank_history isn't populated yet.
- **`/admin/content-drafts`** (new) — editorial dashboard. Stats tiles + threshold filter (≥1/3/5/10), upset cards with chip (↑ Upset sage / ↓ Drop crimson), cycle context, rank delta, View item / Open PNG (1200×630) / Copy URL buttons, and a live thumbnail rendered from the OG endpoint. Empty state explains the post-cycle-hooks workflow.

### Bug fixes
- **`<NextCycleCountdown>` hydration loop** — refactored away from `useSyncExternalStore` (was returning a fresh object per `getServerSnapshot()` call, infinite loop). `useState + useEffect + setInterval` instead, `suppressHydrationWarning` on the rendered span.
- **`<HeroSearch>` hydration mismatch** — `useState(() => PLACEHOLDERS[Math.floor(Math.random()...)])` ran on the server and re-randomised on the client. Deterministic initial value (`PLACEHOLDERS[0]`) + `useEffect` rotation after mount.
- **`<NavAuthCluster>` "Sign in" flash** — initial `user: null` made signed-in users see "Sign in" for ~200 ms while `/api/auth/me` resolved. Reserved `min-width: 100px`, `opacity: 0 + pointer-events: none` until the API responds, then fade-in.
- **`/badge/category/document` returned 404** — only 4 categories are benched in prod (data, shell, sql, web). Strict `rankings.avg_score IS NOT NULL` check returned no rows for "document". New logic : count registry rows from `skills` / `claude_md_files` filtered by `category`. Right column label switches from `RANKED` to `INDEXED` when benched count is 0.
- **`quality-judge` skipped 100% of items as "content too short"** — post-migration 0042, `skill_md_content` and `content` columns are NULL because the bodies live in the public Storage bucket `content`. New `resolveItemContent()` helper fetches from `https://<supabase>/storage/v1/object/public/content/<content_path>` when the inline column is empty. Run `node scripts/bench/quality-judge.mjs --limit=50000` now actually judges instead of skipping.
- **§01 Live ranking on the home was invisible** — `skills.category` (native taxonomy) ≠ `rankings.category` (cycle scope), e.g. `peekaboo` has `skill.category='macos'` but was benched under the `sql` cycle scope. Hardcoded category `"document"` + `WHERE skills.category=$cat` returned 0 rows. New helper `getBenchedTopByCategory(kind, category, limit)` in [rankings.js](src/lib/queries/rankings.js) : queries `rankings` first by bench scope, then joins to `skills` / `claude_md_files` for metadata, stamps axes (via `axes_by_subject` RPC) + recomputed weighted composite (instruction 0.35 / correctness 0.30 / completeness 0.20 / usefulness 0.10 / safety 0.05) + `signal: "bench"`. Headline category picked dynamically from a preference list `["sql", "web", "shell", "data"]`. Pill highlight in the leaderboard now follows the active category (was hardcoded `i === 0`).
- **`href="/marketplace?promote=intro"` in §08 Enter pointed to nothing** — the `?promote=intro` querystring was never handled. Replaced with `href="/pricing#boost"` ; added `id="boost"` + `scrollMarginTop: 96` on the Boost section of [pricing/page.js](src/app/pricing/page.js) so the anchor scrolls into view below the sticky header.

### Native promo surfaces — 5 monetisation slots, no AdSense
Editorial inventory across the funnel, all matching the Versuz tone (no banner aesthetic) :
- **Home `§ Featured`** — strip of Versuz first-party picks (currently `vz-bench-debug` $1.99 + `vz-scrape-runner` $0.99). Amber bordered cards, price + category + description. New helper `getFeaturedItems(kind, limit)` queries `tier='featured' AND is_archived=false`.
- **`/marketplace` top** — single-line promo card above the grid : "Got a skill? Surface yours · $4.99 / 30 days" + dual CTA (`/pricing#boost`, `/submit`).
- **`/leaderboard` bottom** — "Want to climb this ranking?" promo block under the judges panel.
- **`/skills/[slug]` author-aware promo** — `<PromoteSkillSlot>` inserted before §05 Challenge. Owners see **Boost this skill →** (links to `/promote/skill/<slug>` for the $4.99/30d flow). Visitors see **Submit yours →** (`/submit`).
- **`/skills/[slug]` cross-sell** — `<FeaturedPicksStrip>` surfaces 3 other Versuz Featured items (excludes the current skill) just above the promo slot. Loops engagement between first-party items.

### Files touched
17 modified, 7 new + 2 new helpers + 5 promo components. **Modified** : `src/app/page.js`, `src/app/layout.js`, `src/app/pricing/page.js`, `src/app/marketplace/page.js`, `src/app/leaderboard/page.js`, `src/components/site/vz-ticker.jsx`, `src/components/site/nav-auth-cluster.jsx`, `src/components/skill-row.jsx`, `src/components/hero-search.jsx`, `src/components/embed-badge-block.jsx`, `src/app/skills/[slug]/page.js`, `src/app/badge/[kind]/[slug]/route.js`, `src/app/badge/category/[cat]/route.js`, `src/lib/queries/rankings.js` (new helpers : `getBenchedTopByCategory`, `getFeaturedItems`), `scripts/bench/quality-judge.mjs`, `cli/src/commands/submit.js`, `cli/src/index.js`, `cli/src/api.js`, `cli/package.json`. **New** : `src/components/next-cycle-countdown.jsx`, `src/components/arena-sticky-cta.jsx`, `src/app/badge/author/[login]/route.js`, `src/app/badge/category/[cat]/route.js`, `src/app/api/og/upset/route.js`, `src/app/admin/content-drafts/page.js` + `copy-url-button.jsx`, `cli/src/commands/battle.js`, `scripts/bench/post-cycle-hooks.mjs`, `supabase/migrations/0052_achievements.sql`. **In-file new components** : `<PromoteSlot>` (marketplace), `<PromoteSkillSlot>` + `<FeaturedPicksStrip>` (skill detail), `§ Featured` strip + leaderboard promo block.

## 2026-05-13 (late) — public pages + legal + nav polish

- **5 legal pages**: Terms of Service, Privacy Policy (GDPR-compliant), Refund Policy, DMCA / Takedown, Imprint (LCEN-compliant). Shared `<LegalLayout>` with sticky navigation sidebar + `<LegalPage>` / `<LegalSection>` primitives.
- **3 public pages**: `/changelog` (dated entries, typed badges feat/fix/perf/infra/content), `/faq` (7 categories × 4-5 questions, `<details>` accordion), `/pricing` (3 tiers Free / Premium / Featured + Boost section + mini-FAQ).
- **Footer**: 4th "Legal" column + Project expanded (Pricing, FAQ, Changelog).
- **Nav refresh**: logo switches to the official `VersuzMark` standalone, 64px. Hover scale 1.06 + rotate -3°. Sign in as ink black button (parallel to Submit ember). Nav links hit area widened (10×14), underline more visible on hover.
- **Imprint** filled in with real Flukx Studio info (SIRET 934 170 093 00017, VAT FR65934170093, etc.).
- **Email**: `hello@versuz.dev` + `support@versuz.dev` → `contact@flukxstudio.fr` everywhere (10 files patched).
- **Resend `from`** default → `Versuz <contact@flukxstudio.fr>`.
- **Marketing briefs**: `docs/marketing-briefs.md` (Veo logo 3 formats, Figma templates 5 formats, copy tweet thread + Show HN + bios) + `docs/claude-design-prompt.md` (full prompt to paste into claude.ai to generate an interactive brand kit artifact).

## 2026-05-13 — V1.5 perf + compliance + multi-cat

- **Landing perf 43s → < 2s**: refactored `liveSkills/liveClaudeMds` (chunked fetch 20k rows → `LIMIT 2000`) + new `getTopRankedItems(kind, category, limit)` for landing top 10 + `getCategoryCounts` reused for cats. Migration `0037_marketplace_indexes.sql`: 14 indexes (composite default sort, stars, quality, tier+verification, source+stars, GIN topics, trigram for ILIKE search) + RPC `top_topics_by_kind` (jsonb aggregation on the DB side) + RPC `top_ranked_skills_by_category`.
- **ISR cache**: landing `revalidate=60` + leaderboard `revalidate=300` (was `force-dynamic + revalidate=0`).
- **Stat row count consistent**: `hasClientSideFilters` narrowed to `bundle` + `tokens-for-skills` (tier/verified/official/source/quality/topics now run server-side). Fixed Math.ceil precedence bug. Topics filter via `metadata->topics @>`.
- **Repo page crash fixed**: `RepoSkillCard` was being passed `skill={s}` instead of `item={s}` line 151 of `src/app/repo/[owner]/[repo]/page.js`.
- **License capture** (migration `0038_license.sql`): `license_spdx` column on skills + claude_md_files, indexed. Backfill from `metadata.license`. All scrapers now stamp `license_spdx` directly. License badge displayed on marketplace-card (crimson border for copyleft GPL/AGPL, gray otherwise).
- **Near-dup detection** (migration `0039_description_hash.sql`): `description_hash` column + SQL function `normalize_description_hash` (lowercase + strip punctuation + collapse whitespace + SHA-256) + BEFORE INSERT/UPDATE trigger auto-compute. Script `scripts/dedup-descriptions.mjs --apply` to archive groups.
- **Source view UI**: azure "GitHub / Sourcegraph / Awesome list / Submitted / CLI" badge shown to the right of the TierBadge. Refine filter expanded (aggregator, submit, cli added).
- **Multi-category** (migration `0040_multi_category.sql`): `categories jsonb` column + 9 new buckets (claude-skill, codex, cursor-rule, windsurf-rule, antigravity, mcp-server, continue-rule, roo-code, cline). Classifier v3 returns a sorted array (every bucket >= 50% of the leader). Script `scripts/reclassify-all.mjs` to backfill. UI cards show up to 3 badges + "+N". Server-side filter by cat uses `categories @>` for multi-match.
- **Archive flag** (migration `0041_archive.sql`): `is_archived boolean` + partial index. Marketplace + sitemap + leaderboard filter `is_archived = false`. Admin override via `?include_archived=1`.
- **CLI/MCP default URL**: `cli/src/api.js` + `mcp-server/src/index.js` switched to `https://versuz.dev` (was `http://localhost:3000`). Dev override via `VERSUZ_API` env.
- **Internal vz-skills**: 3 new skills in `vz-skills/` — vz-launch-check (pre-flight checklist), vz-scrape-runner (smart scraper launcher), vz-bench-debug (stuck-cycle diagnosis).
- **Marketing briefs**: `docs/marketing-briefs.md` — M1 Veo logo (3 formats), M2 Figma templates (Insta carousel + Reels + LinkedIn + Twitter banner), M3 pre-launch copy (tweet thread + bios + Show HN + Insta captions).

## 2026-05-11 — V1.5 rubric + live pipeline + auto-queue

- Rubric v4 aligned with FLASK / JudgeBench / HELM — 5 axes (instruction_following 0.35 / correctness 0.30 / completeness 0.20 / usefulness 0.10 / safety 0.05), 7 hard penalty rules, internal consistency rule, anti-inflation guardrails. Migrations 0027-0030.
- Prompt caching active (marker `===== END SYSTEM RUBRIC =====`). Cache stats logged.
- Live drip scrape (batch=1/5 default) + live refresh bench (refresh_rankings every N=25 outputs).
- Submit auto-queue: `bench_pending=true` flag + judgeQualityInline Groq free in background.
- Admin /admin/cycles dashboard refresh: Raw/Quality/Benched funnel, cycle progress, ETA, judge histograms.
- LMArena-style leaderboard table: Model + 5 axes columns + Score, client-side sort, inline search, stats strip.
- +5 awesome-lists + 16 GitHub topics scraped.

## 2026-05 — V1 polish + CLI + MCP

- Stripe Connect Express + destination charges (test mode validated).
- CLI `npx versuz` v0.1.0 — 8 commands.
- MCP server `@versuz/mcp` v0.1.0 — 5 tools.
- Real-time landing KPI via `<LiveStatsGrid>` polling /api/stats.
- Official badge + whitelist (~30 orgs).
- Resend SMTP — welcome + branded receipts.
- Mobile responsive (clamp padding, hamburger drawer).
- Compare picker + floating bar + auto-detect kind.
- 3-slide onboarding modal.
- Copy-content button.
- Quality score v3 (single-LLM 5-axis rate) + display.
- Premium content gating (paywall fix).
- Marketplace UX overhaul (compact filters, Refine panel, 3 sponsored zones, premium download gating).
- Public profile `/u/[login]`.
- Bulk admin actions.
- Admin subscriber list.
- Drag-drop premium upload.

## 2026-03 → 2026-04 — V0 + V0.5

- Logo + brand identity (mark + wordmark + favicon).
- Landing page + 6 sections + animations.
- All canonical pages: about, methodology, leaderboard, skills/[slug], standings/[category], compare, marketplace, profile, admin, claim, feed.
- Skills scraping (GitHub → SKILL.md → parse → classify → bundle detect + skip-by-SHA + concurrency 6 + repo-meta cache).
- CLAUDE.md as a first-class entity (scraper + DB + pages + classifier).
- End-to-end bench engine (agent + judge + retry + rotation + circuit breaker).
- 11 Supabase migrations + cycle resume bug fixed.
- Stripe Connect Express + earnings dashboard + 6 webhook events.
- Auth (Supabase + GitHub OAuth), session caching.
- /admin/* layout + task-proposals + bulk actions.
- Vercel cron: bench, refresh-rankings, sweep-stuck-jobs, refresh-stripe-accounts, weekly-digest, quality-judge.
- Cmd+K search modal.
- Dynamic OG images.
- Sitemap + robots + RSS + JSON API v1.
- Submit form with real DB writes + claim flow.
- SVG embed badge.
- Cold-start prior (sortable signal pre-bench).
- 102 hand-crafted built-in tasks.
- Cost guardrail + partial cycles + admin/cycles dashboard.
- Pay-to-promote / Boost (flat $4.99 / 30d, stacking, 365d max).
- Sourcegraph adapter (1000 SKILL.md + 1000 CLAUDE.md discovered).
- 14 awesome-list aggregators + 8 GitHub topics scraping.
- Content-hash dedup SHA-256.

---

For the active roadmap, see [TODO.md](./TODO.md).
For product details + schema, see [CONTEXT.md](./CONTEXT.md).
