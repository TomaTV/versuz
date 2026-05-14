# Versuz · CHANGELOG

Format: date · cluster · what shipped. Newest first.

---

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
