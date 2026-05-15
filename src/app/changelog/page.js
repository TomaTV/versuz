import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";

export const metadata = {
  title: "Changelog — Versuz",
  description: "What we've shipped on Versuz, newest first. Bugs, features, infrastructure, all in public.",
};

// Static changelog. Edit this array when you ship. Each entry can have any
// number of bullets — keep them terse, "what changed + why" not "how".
// Group buckets : feat (new) · fix (bug) · perf (optimisation) · infra (ops) ·
// content (data / scrape) · docs.

const ENTRIES = [
  {
    date: "2026-05-15",
    title: "V1.6.1 — Cloudflare R2 migration, query cache, no-flash auth, manifesto motion ad",
    items: [
      { type: "infra", body: "Content storage migrated from Supabase Storage to Cloudflare R2 — 103,572 .md files (~1.1 GB) served from edge CDN via cdn.versuz.dev. Zero egress fees, 10 GB free, scales to millions of items. DB stays on Supabase Free (metadata only, ~228 MB / 500 MB cap). Steady-state cost back to $0/mois." },
      { type: "infra", body: "Dual-backend dispatch via env (R2_PUBLIC_URL set → R2, else Supabase Storage fallback). Helpers in src/lib/content/storage.js (Next runtime) + scripts/_storage.mjs (Node scripts). Path shape unchanged across both backends — `content_path` column needed zero rewriting." },
      { type: "infra", body: "All write paths refactored to land on R2 : submit web form, submit CLI API, scrape (main + aggregators + codesearch + claude-md). Inline content stays as fallback only if R2 upload errors out — graceful degrade, never lose a submit." },
      { type: "perf", body: "Marketplace cold render dropped from ~14s to ~300ms warm. Wrapped 8 hot queries in Next.js unstable_cache : getPaginatedItems (60s TTL), getCategoryCounts / getAvailableSources / getAllRanksBySlug / liveSkills / liveClaudeMds / getIndexCounts / getTopRankedItems (300s TTL). Each filter combo has its own cache entry." },
      { type: "perf", body: "Skill detail page switched from force-dynamic to ISR 60s. Content body served from R2 CDN edge = fast regardless of DB hit." },
      { type: "perf", body: "Marketplace cards : content-visibility: auto so off-screen cards skip paint + layout. ~5-10 RES point gain on long-list pages." },
      { type: "feat", body: "Manifesto motion ad — 1920×1080 · 42s · 7 acts. Falling files → Versuz reveal → 3 numbered pillars (SUBMIT / JUDGE / RANK) → live bench → climb → 3 tier cards → CTA. Brand shapes only (circle, square, triangle, semi-circle). Export : `node scripts/export-ads.mjs --scene=manifesto`." },
      { type: "feat", body: "Sound design generator (npm run ads:audio) — 109 event-driven SFX synthesized via ffmpeg lavfi (sub-kicks, whooshes, plucks, bells, mechanical tacs for counter/typewriter). No constant music bed. VO recorded separately on ElevenLabs." },
      { type: "fix", body: "Auth slot \"Sign in\" flash killed for real — inline beforeInteractive script reads localStorage['vz-auth-cache'] before body parses, CSS dispatches user/anon via html[data-auth] attribute. Returning users see their pill on the very first paint, no React state-driven swap, no hydration mismatch." },
      { type: "fix", body: "Quality-judge OpenRouter fallback default = none (was : auto-switch to paid OpenRouter on Groq TPD exhaust → surprise costs). Two new opt-in chains : `openrouter-free` (free Gemini Flash / DeepSeek V3 / Llama 3.3 / Qwen) and `openrouter` (paid)." },
      { type: "fix", body: "Bench engine + quality-judge unified storage resolver — both use the shared fetchContentByPath() from _storage.mjs now. Before, quality-judge had a hardcoded Supabase URL → broken post-cleanup. Now transparent against either backend." },
      { type: "fix", body: "Next.js 16 compat — auth bootstrap script migrated from <script dangerouslySetInnerHTML> (forbidden in Server Components on Next 16) to <Script strategy=\"beforeInteractive\"> from next/script." },
      { type: "infra", body: "New ops scripts : migrate-storage-to-r2 (one-shot migration), cleanup-supabase-storage (wipe old bucket, --i-know-what-im-doing flag), backup-r2 (`npm run backup:r2`), archive-historical-data (archive bench_results / rank_history > 30j → R2 jsonl.gz when DB approaches cap)." },
    ],
  },
  {
    date: "2026-05-14",
    title: "V1.6 — landing flip, badge V2, gamification, content drafts",
    items: [
      { type: "feat", body: "Live ranking promoted to §01 — the leaderboard sits right under the hero now, manifesto (What / Why / How / Example) demoted to §02-§05. Headline category picked dynamically from the bench scope (first of sql / web / shell / data with data) instead of hardcoded \"document\"." },
      { type: "feat", body: "Live countdown in the top ticker — replaces the static \"DAILY AT 06:00 UTC\" with a live \"NEXT CYCLE IN 02:47:12 UTC\" computed client-side." },
      { type: "feat", body: "Sticky \"Enter the Arena\" CTA — floating bottom-right after 600px of scroll, hides near the footer, suppressed on /submit / /admin / /buy / /promote / /claim / /profile." },
      { type: "feat", body: "Badge V2 — query params on /badge/[kind]/[slug] : ?show=score|elo|prior|rank + ?style=default|terminal (full dark palette for dark READMEs). Backward-compatible with v1." },
      { type: "feat", body: "Two new badge endpoints — /badge/author/[login] (tier progression : newcomer → veteran) and /badge/category/[cat] (count + bench coverage per category)." },
      { type: "feat", body: "<EmbedBadgeBlock> enriched — Show / Style selectors below the tab strip, live preview updates as the user picks variants." },
      { type: "feat", body: "Gamification — migration 0052 introduces item_achievements (triple_crown / streak_milestone / category_winner / first_blood), author_achievements (newcomer → veteran), rank_history (per-cycle × subject × category snapshot), and streak columns on skills / claude_md_files." },
      { type: "feat", body: "scripts/bench/post-cycle-hooks.mjs — to run after each completed cycle. Snapshots rank_history (top 100/cat), inserts achievements, updates streak counters. Idempotent on rerun." },
      { type: "feat", body: "UI : 🔥 streak chip on <SkillRow> and on the skill detail header. ♛ Triple Crown badge (gradient amber → ember) on skill detail when unlocked. getItemAchievements(kind, subjectId) query helper." },
      { type: "feat", body: "CLI v0.2.0 — `npx versuz battle <a> vs <b>` command (head-to-head terminal viz, ember-gradient verdict box). `npx versuz submit` post-success now prints the README badge markdown + --add-badge flag shows step-by-step PR instructions." },
      { type: "feat", body: "\"Today's Upset\" pipeline — /api/og/upset (1200×630 next/og social card) + getRecentUpsets() query helper diffing rank_history between cycles + admin dashboard /admin/content-drafts with preview cards, Copy URL, Open PNG. Pick 1-3 cards, publish, done." },
      { type: "fix", body: "§01 Live ranking was invisible — skills.category (native taxonomy) ≠ rankings.category (bench cycle scope), e.g. `peekaboo` is native=macos but was benched under sql scope. New helper getBenchedTopByCategory() queries rankings first and joins to skills, then stamps axes + recomputed weighted composite score." },
      { type: "fix", body: "Hydration mismatches — <NextCycleCountdown> infinite loop on useSyncExternalStore (now useState + setInterval), <HeroSearch> placeholder Math.random()-init (now deterministic SSR + useEffect rotation), <NavAuthCluster> \"Sign in\" flash for signed-in users (now opacity 0 until /api/auth/me resolves)." },
      { type: "fix", body: "/badge/category/document returned 404 — only 4 categories benched in prod, strict avg_score check returned no rows. New logic : count registry rows from skills / claude_md_files filtered by category. Label switches from RANKED to INDEXED when benched count is 0." },
      { type: "fix", body: "quality-judge skipped 100% of items as \"content too short\" — post-migration 0042, the bodies live in the public Storage bucket, not the inline column. New resolveItemContent() fetches from Storage as a fallback. The script now actually judges instead of skipping." },
      { type: "fix", body: "Footer \"Boost a skill · $4.99 / 30 days\" link pointed to /marketplace?promote=intro which was never handled. Now anchors to /pricing#boost (id added, scrollMarginTop: 96 so it clears the sticky header)." },
      { type: "content", body: "CLI v0.2.0 published with expanded npm description + keywords (claude-skills, skill-md, registry, benchmark, ranking, elo, anthropic, agent). User-Agent bumped to versuz-cli/0.2.0." },
      { type: "feat", body: "Native promo surfaces — 5 monetisation slots across home / marketplace / leaderboard / skill detail. Home § Featured strip showcases Versuz first-party picks (vz-bench-debug, vz-scrape-runner). Marketplace + leaderboard get \"Boost a skill · $4.99 / 30d\" promo cards. Skill detail gets author-aware promo (Boost CTA for owners, Submit CTA for visitors) + cross-sell strip with other Featured items. Same editorial tone as the rest of the site — no AdSense aesthetic. New helper getFeaturedItems(kind, limit) in rankings.js." },
    ],
  },
  {
    date: "2026-05-13",
    title: "V1.5 — perf overhaul + legal pages",
    items: [
      { type: "perf", body: "Marketplace + landing refactor: full-table loads replaced by range pagination + 14 composite indexes. Landing TTFB drops from 43s to <2s." },
      { type: "perf", body: "ISR caching enabled on landing (60s) and leaderboard (300s). The /stats API stays no-cache for live counts." },
      { type: "feat", body: "Multi-category: a skill can now belong to multiple categories (mcp-server + document, etc.). 9 new agent-specific buckets." },
      { type: "feat", body: "License SPDX captured at scrape + license badge on cards. Copyleft items (GPL/AGPL) flagged crimson." },
      { type: "feat", body: "Near-duplicate detection via normalized description_hash + automated archive script." },
      { type: "feat", body: "Source view: badge on each card to distinguish GitHub / Sourcegraph / awesome-list / CLI submission." },
      { type: "feat", body: "Full legal pages: Terms, Privacy (GDPR), Refund, DMCA, Imprint." },
      { type: "fix", body: "Repo bundle page: crash on skill display (prop name mismatch between RepoSkillCard and its consumer)." },
      { type: "fix", body: "Inconsistent marketplace count when a client-side filter was active (bundle / tokens-skills). Topics filter moved server-side." },
      { type: "infra", body: "CLI + MCP server: default URL switched to https://versuz.dev." },
      { type: "infra", body: "RLS performance fix: `auth.uid()` wrapped in `(select auth.uid())` across 14 policies. Per-query CPU divided by ~N (where N = rows scanned)." },
      { type: "infra", body: "Content offload prep: SKILL.md / CLAUDE.md bodies are migratable to a public Supabase Storage bucket (frees 200-400 MB on the DB)." },
      { type: "content", body: "Classifier v3: extended with 9 new buckets (claude-skill, codex, cursor-rule, windsurf-rule, antigravity, mcp-server, continue-rule, roo-code, cline). Multi-cat output." },
    ],
  },
  {
    date: "2026-05-11",
    title: "Rubric v4 + live pipeline + auto-queue",
    items: [
      { type: "feat", body: "Rubric v4 aligned with FLASK / JudgeBench / HELM. 5 weighted axes (instruction_following 0.35 / correctness 0.30 / completeness 0.20 / usefulness 0.10 / safety 0.05)." },
      { type: "perf", body: "Prompt caching active on the bench (marker END SYSTEM RUBRIC). Hit rate 30-85% depending on the judge." },
      { type: "feat", body: "Live drip pipeline: items show up on /marketplace seconds after the scrape, not after the full batch. Bench refresh every 25 outputs." },
      { type: "feat", body: "Auto-queue submit: new items submitted via web or CLI are judged in the background + prioritized for the next bench cycle." },
      { type: "feat", body: "Admin /admin/cycles dashboard refresh: Raw/Quality/Benched funnel, judge histograms, ETA on agent + judge wall-time." },
      { type: "feat", body: "LMArena-style leaderboard table: Model + 5 axis columns + Score, client-side sort, inline search, stats strip." },
      { type: "content", body: "+5 awesome-lists and +16 GitHub topics scraped (mcp, cursor-rules, windsurf, continue-dev, agentic-coding, etc.)." },
      { type: "fix", body: "Scraper bugs: fetchRaw fallback on the default_branch GitHub API + upsert tolerant onConflict on slug-collision." },
    ],
  },
  {
    date: "2026-05",
    title: "V1 polish — CLI + MCP + Stripe + Premium",
    items: [
      { type: "feat", body: "`npx versuz` CLI v0.1.0: 8 commands (list/search/info/install/login/whoami/logout/submit). Interactive mode, ANSI shadow logo, colored tables." },
      { type: "feat", body: "`@versuz/mcp` MCP server v0.1.0: 5 tools for Claude Code (search, list, get, install, list_skills/list_claude_md)." },
      { type: "feat", body: "Stripe Connect Express + destination charges: automatic 30/70 split, 6 webhook events handled (purchase, refund, dispute, account update)." },
      { type: "feat", body: "Premium content gating: private Supabase Storage bucket + signed URLs (7-day TTL) for premium downloads." },
      { type: "feat", body: "Pay-to-promote (Boost): flat $4.99 / 30 days, stacking up to 365 days max, 6 visible top-of-grid slots." },
      { type: "feat", body: "Real-time landing KPIs: poll /api/stats every 8s, CountUp animation, ember dot pulse on update." },
      { type: "feat", body: "Official badge: whitelist of 30 orgs (anthropics, google, openai, vercel, stripe, supabase…). Auto-flagged at scrape." },
      { type: "feat", body: "Compare picker: checkbox top-left on each MarketplaceCard, floating compare bar, /compare side-by-side." },
      { type: "feat", body: "3-slide onboarding modal (Browse / Earn / Trust) on first /profile visit, persisted in localStorage." },
      { type: "feat", body: "Mobile responsive: Section + PageHero clamp() padding, hamburger drawer, mark logo shrinks below 1024px." },
    ],
  },
  {
    date: "2026-03-04",
    title: "V0 — public benchmark + marketplace",
    items: [
      { type: "feat", body: "First mass scrape: ~93 skills + ~129 CLAUDE.md indexed." },
      { type: "feat", body: "End-to-end bench engine: agent + 3 judges + retry + rotation + circuit breaker + output dedup." },
      { type: "feat", body: "All canonical pages: marketplace, leaderboard, methodology, about, skills/[slug], standings, profile, admin." },
      { type: "feat", body: "Supabase auth + GitHub OAuth, session caching." },
      { type: "feat", body: "Global Cmd+K search modal, dynamic OG images, sitemap, RSS feeds, JSON API v1." },
      { type: "feat", body: "Submit form (URL fetch + content paste), claim flow, SVG embed badge." },
      { type: "feat", body: "5 verification levels + 3 commercial tiers (free / premium / featured)." },
    ],
  },
];

const TYPE_STYLES = {
  feat: { label: "feat", color: "var(--accent)" },
  fix: { label: "fix", color: "var(--crimson)" },
  perf: { label: "perf", color: "var(--azure)" },
  infra: { label: "infra", color: "var(--amber)" },
  content: { label: "content", color: "var(--sage)" },
  docs: { label: "docs", color: "var(--fg-muted)" },
};

export default function ChangelogPage() {
  return (
    <div>
      <PageHero
        eyebrow="Changelog"
        title={
          <>
            What&apos;s <em style={{ color: "var(--accent)" }}>new</em>.
          </>
        }
        subtitle="Ship log of Versuz, newest first. Bugs, features, infrastructure, data — all in public."
      />

      <section
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        <RevealStagger
          stagger={0.08}
          style={{ display: "flex", flexDirection: "column", gap: 64 }}
        >
          {ENTRIES.map((entry) => (
            <RevealItem key={entry.date}>
              <article
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  paddingBottom: 32,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {entry.date}
                  </span>
                  <h2
                    className="vz-changelog-title"
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(20px, 2.6vw, 30px)",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: "var(--fg)",
                    }}
                  >
                    {entry.title}
                  </h2>
                </header>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {entry.items.map((item, idx) => {
                    const style = TYPE_STYLES[item.type] || TYPE_STYLES.feat;
                    return (
                      <li
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gap: 16,
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            color: style.color,
                            border: `1px solid ${style.color}`,
                            background: "color-mix(in oklab, " + style.color + " 5%, transparent)",
                            minWidth: 52,
                            textAlign: "center",
                            display: "inline-block",
                          }}
                        >
                          {style.label}
                        </span>
                        <span
                          className="vz-changelog-body"
                          style={{
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "var(--fg)",
                          }}
                        >
                          {item.body}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <div
            style={{
              marginTop: 48,
              padding: "20px 24px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            Want raw commits? See{" "}
            <a
              href="https://github.com/TomaTV/versuz/commits/main"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
            >
              the GitHub repo ↗
            </a>{" "}
            for the full history. RSS feed available at{" "}
            <a href="/feed" className="vz-link">
              /feed
            </a>
            .
          </div>
        </Reveal>
      </section>
    </div>
  );
}
