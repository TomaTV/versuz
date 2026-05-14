# CLAUDE.md

Source de vérité produit : [`CONTEXT.md`](./CONTEXT.md) — mission, V0 scope,
stack, schéma, conventions, routes, scripts. Lire en premier.

Roadmap active : [`TODO.md`](./TODO.md). Historique : [`CHANGELOG.md`](./CHANGELOG.md)
(**en anglais — c'est la page publique /changelog**).

Direction visuelle : [`.ui/README.md`](./.ui/README.md). Tokens mappés à
Tailwind v4 dans `src/app/globals.css` via `@theme inline`.

## Strategic posture (mai 2026, V1.5)

Marketplace-first, judging-second. Versuz est une marketplace de SKILL.md et
CLAUDE.md, avec vérification progressive (5 niveaux), modèle commercial
3 tiers (free / premium / featured), et bench engine 3-judge (Haiku 4.5 +
DeepSeek V4 Flash + GPT-5 mini via OpenRouter, `BENCH_MODE=or-v1`,
~2.60 €/jour @ 100 skills).

DB scale : ~100k items au launch (skills + claude_md). Marketplace paginé
server-side via `getPaginatedItems(kind, params)` ([src/lib/queries/rankings.js](./src/lib/queries/rankings.js))
avec count exact + indexes composites (migration 0037). Plus de full-table
load — landing/leaderboard utilisent `getTopRankedItems(kind, category, N)`
ou `getCategoryCounts(kind)`.

**Filters server-side** (migrations 0044+0046+0048) :
- Bundle : `is_bundled` generated col + `repo_skill_count` denormalized col
- Tokens : `byte_count` generated col (extrait de `metadata.byte_count`)
- Source : `normalizeSource()` mappe raw values vers canonical buckets via
  ILIKE patterns (`github-search`, `web-directory`, `mega-github` → `github` etc.)

Storage offload (mig 0042) : `skill_md_content` et `content` body sont sur
Supabase Storage bucket `content/{kind}/{slug}.md` (public). Colonne
`content_path` pointe vers le file. Le code de read a un fallback inline
pour les ~66 rows que Cloudflare WAF refuse (skills security/pentest).

## Heads-up — Next 16

`AGENTS.md` rappelle que Next 16 a des breaking vs training data (`params`
async, `cookies()` async, etc.). Consulter `node_modules/next/dist/docs/01-app/`
avant de toucher aux APIs Next.

## Two ranked entities

1. **Skills** — SKILL.md files. Catégories (27 buckets) :
   - **V0/V1** : document / sql / data / web / shell / code / other
   - **V1.5 agent-spécifiques** : claude-skill / codex / cursor-rule /
     windsurf-rule / antigravity / mcp-server / continue-rule / roo-code / cline
   - **V1.5+ broader** (mig 0045) : writing / design / marketing / automation / research
   - **V1.5++ wrappers** (mig 0047) : api-integration / macos / communication / media / testing / devops
   - Multi-catégorie via colonne `categories jsonb` (mig 0040). Le classifier v4
     retourne `categories[]` (tous les buckets >= 50% du leader score).
2. **CLAUDE.md** — fichiers de contexte projet. Catégories différentes
   (project-type) : nextjs / react / python-data / backend-api / mobile /
   devops / ml-training / generic. Multi-cat aussi via `categories jsonb`.

## Three commercial tiers

- **Free** — scrapé public, verified progressivement (claimed → verified →
  reviewed → featured), $0.
- **Premium** — author-listed, prix fixe, Versuz 30% / author 70%.
- **Featured** — Versuz first-party, 100%.

Premium download via Supabase Storage `premium-content` bucket + signed URL
(TTL 7j). Gating critique dans `MarketplaceCard` + `SkillDetail`.

## Bench modes (mai 2026)

Single source of truth : `src/lib/judges.js`. UI copy lit `JUDGES`/`judgesLabel()`,
jamais hardcode.

- `dev` — 3 Groq Llama free (3000 RPD). Défaut local.
- `or-v1` — Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini via OpenRouter,
  ~$2.85/jour. **Recommandé V1**.
- `v1` — direct keys, mêmes 3 judges, ~$2.72/jour.
- `or-thrift` / `v1-thrift` — single judge ~$0.86/jour.
- `prod` — Opus + Gemini Pro free + Mistral free, ~$3/jour.
- `gold` — Opus + GPT-5 + Gemini Pro, ~$10/jour. Championship cycles.

`BENCH_JUDGE_COUNT=N` slice l'ensemble (free-tier conservation).

## Core directories

- `src/app/` — App Router pages :
  - Public éditoriales : `/`, `/marketplace`, `/leaderboard`, `/methodology`, `/about`, `/feed`
  - Public secondaires : `/pricing`, `/faq`, `/changelog`, `/status`
  - Detail : `/skills/[slug]`, `/claude-md/[category]/[slug]`, `/repo/[owner]/[repo]`, `/u/[login]`, `/standings/[category]`
  - Buyer/seller : `/buy/[kind]/[slug]` (+ /success), `/promote/[kind]/[slug]` (+ /success), `/submit`, `/claim/[kind]/[slug]`, `/profile`, `/profile/settings`, `/profile/earnings`, `/profile/items/[kind]/[slug]`
  - Admin : `/admin/*` (allowlist GitHub via env)
  - Legal : `/legal/terms`, `/legal/privacy`, `/legal/refund`, `/legal/dmca`, `/legal/imprint` (shared `<LegalLayout>` avec sidebar sticky)
  - API : `/api/v1/skills`, `/api/v1/claude-md`, `/api/v1/submit`, `/api/stats`, `/api/subscribe`, `/api/webhooks/stripe`, `/api/cron/*`, `/badge/[kind]/[slug]`
- `src/components/marketplace/` — MarketplaceCard, MarketplaceGrid (client),
  TierBadge, VerificationBadge, OfficialBadge
- `src/components/repo/` — RepoSkillCard (page `/repo/[owner]/[repo]`)
- `src/components/embed-badge-block.jsx` — 3 tabs (markdown/html/url) + 1-click copy. SVG badge `<img src="/badge/{kind}/{slug}">` portable Notion/Linear/Discord.
- `src/components/copy-content-button.jsx` — bouton copy absolu top-right, utilisé inline dans les `CommandBlock` des detail pages.
- `src/components/site/` — VzNav (mark seul 64px), VzFooter (5 colonnes : Project / Open data / Tools / Legal / Subscribe), MobileNavMenu, BackButton, VzTicker, CmdKHint
- `src/components/brand/` — VersuzMark (SVG 2-flammes officiel), VersuzWordmark, Eyebrow, FigureNumber, SkillGlyph, StencilGlyph
- `src/app/legal/_components/legal-page.jsx` — `<LegalPage>` + `<LegalSection>` primitives partagées par les 5 pages légales
- `src/lib/queries/rankings.js` — server-side data access cachées via React.cache().
  Fonctions clés : `getPaginatedItems`, `getTopRankedItems`, `liveSkills` (cap 2000),
  `liveClaudeMds` (cap 2000), `getCategoryCounts`, `getTopTopicsByKind` (RPC SQL),
  `applyRepoSkillCount` (dampening 1/sqrt(N) sur mega-repos).
- `src/lib/content/storage.js` — helpers Supabase Storage bucket `content` (public). Fetch SKILL.md / CLAUDE.md depuis Storage avec fallback inline DB (migration 0042).
- `src/lib/auth/`, `src/lib/profiles/`, `src/lib/purchases/`, `src/lib/stripe/`,
  `src/lib/premium/`, `src/lib/resend.js` (default from `Versuz <contact@flukxstudio.fr>`), `src/lib/submit/`, `src/lib/claim/`,
  `src/lib/admin/`, `src/lib/judges.js`, `src/lib/utils.js`
- `scripts/scrape.mjs` — **unified entry point** (dispatcher) qui orchestre les
  4 sources séquentiellement (github, aggregators, codesearch, sourcegraph).
  `npm run scrape -- --source=X --kind=Y` ou `npm run scrape` pour tout.
  Évite le parallèle qui a saturé Supabase free tier.
- `scripts/scrape/`, `scripts/scrape-claude-md/`, `scripts/scrape-codesearch/`,
  `scripts/scrape-aggregators/` — 4 adapters utilisés par le dispatcher.
  Stamp `license_spdx` + `categories[]` (classifier v4) + `metadata.byte_count`.
  Honore `SCRAPE_MAX_NEW` env var (cap par run, défaut Infinity).
- `scripts/_hash.mjs` — `contentHash` (SHA-256) + `descriptionHash` (normalized)
- `scripts/_dedup.mjs` — `purgeContentDuplicates` (verbatim hash)
- `scripts/dedup-descriptions.mjs` — near-dup via description_hash
- `scripts/reclassify-all.mjs` — backfill `categories` jsonb (25 workers parallel)
- `scripts/backfill-licenses.mjs` — GitHub API → license_spdx (multi-token rotation, 20 workers)
- `scripts/backfill-byte-counts.mjs` — Storage object size → metadata.byte_count
- `scripts/migrate-content-to-storage.mjs` — DB inline → Storage bucket (cursor pagination, 25 workers)
- `scripts/cleanup-orphan-storage.mjs` — remove Storage files non-référencés en DB
- `scripts/backup-incremental.mjs` (REST API par batchs) + `scripts/emergency-dump.mjs` (pg_dump) + `scripts/backup-storage.mjs` (download bucket)
- `scripts/migrate-stragglers.mjs` — UUID-based path retry pour les ~66 skills Cloudflare-blocked
- `scripts/bench/` — orchestrator + agent + judge + runner + enqueue +
  rate-limit + 102 built-in tasks + providers/{anthropic, openai, deepseek,
  google, groq, mistral, openrouter}
- `supabase/migrations/` — **0001 → 0048**. Au launch :
  - 0037 marketplace indexes, 0038 license, 0039 desc_hash, 0040 multi_category,
    0041 archive, 0042 content_storage, 0043 RLS perf wrap (auth.uid()),
    0044 is_bundled gen col, 0045 widen category check (writing/design/etc.),
    0046 repo_skill_count denormalized, 0047 widen v2 (api-integration/macos/...),
    0048 byte_count gen col
  - Toutes appliquées sur la prod via MCP supabase (`mcp__supabase-versuz__apply_migration`).

## Scripts npm

- `npm run dev / build / start / lint / format`
- `npm run scrape` (default: all sources, both kinds, sequential — safe pour Supabase)
- `npm run scrape -- --source=github|aggregators|codesearch --kind=skill|claude_md`
- `npm run scrape:max` — exhaustive mode (40 sub-queries × 2 kinds)
- `npm run pipeline:full` — scrape → quality → bench, batch overnight (~8-12h)
- `npm run pipeline:hot` — wave 5 items, marketplace visible en ~8 min/wave
- `npm run bench:smoke` / `bench:agent-smoke` / `bench:seed-tasks` / `bench:enqueue` / `bench`
- `node scripts/bench/quality-judge.mjs --limit=N` — 5-axis rate
- `node scripts/reclassify-all.mjs` — backfill multi-cat
- `node scripts/dedup-descriptions.mjs --apply` — archive near-dups
- `node scripts/backfill-licenses.mjs --apply` — GitHub API → license_spdx
- `node scripts/backfill-byte-counts.mjs --apply` — Storage size → metadata.byte_count
- `npm run backup` (incremental REST API) / `npm run backup:emergency` (pg_dump) / `npm run backup:storage` (download bucket)
- `npm run seed:premium` / `reset:premium`

## Env vars critiques

- `SCRAPE_MAX_NEW=1000` — cap par run upsert (prod cron daily, voir GH Actions)
- `SCRAPE_USE_STORAGE=1` — scraper écrit content direct dans Storage bucket
- `GITHUB_TOKENS=t1,t2,t3` — multi-token rotation (5000 req/h × N)
- `BENCH_MODE=or-v1` — judges Haiku + DeepSeek + GPT-5 mini via OpenRouter
- `BENCH_BUDGET_USD=3` — cap par run bench

⚠ **PowerShell** : `npm run X -- --flag` est cassé sur Windows. Use `node scripts/...` directement.

## Working agreement

1. Read `CONTEXT.md` first.
2. Visual direction : port from `.ui/`, ne pas réinventer.
3. Server components par défaut. `"use client"` seulement avec interactivity.
   MarketplaceGrid est client (instant filter feedback).
4. New DB changes → nouvelle migration timestampée.
5. Routes qui fetch : `loading.js` + `error.js`.
6. Fixture fallback dans `src/lib/queries/rankings.js` intentionnel — l'app
   doit build sans Supabase configuré.
7. Pas de secret commité — `.env.local` git-ignored.
8. Bench engine optimisations non-négociables : dedup by content hash,
   per-job retry, circuit breaker. Pas de simplification sans flag.
9. Single source pour judges : `src/lib/judges.js`.
10. Animation budget : CSS keyframes pour entrance reveals (visible from
    SSR), framer-motion seulement pour parallax interactive. Jamais
    `whileInView` sur bulk content.
11. Performance budget : landing < 2s en dev. Si une page met > 5s, c'est
    qu'on fait du full-table load → refactor à `getTopX(limit)` ou
    `getPaginatedItems`.
12. License compliance : items `license_spdx` IN GPL-3.0/AGPL-3.0 → badge
    crimson + warning page detail. Pas de filter par défaut, mais user peut
    activer "Permissive only" (V1.5+).
13. Detail pages install pattern : `CommandBlock primary` au top avec
    `npx versuz@latest install {slug}` (PRIMARY ember border + soft bg) AVANT
    les commands manuels (clone/cp/curl). Tous les CommandBlock ont un
    `<CopyContentButton text={command}>` inline top-right. Friction zero entre
    discovery et `pnpm test`.
14. Ads vidéo dans `.ads/` — Stage React component (`animations.jsx`) +
    scènes dans `versuz-ads-scenes*.jsx`. Export via `npm run ads:export`
    (Playwright + ffmpeg). Helpers cinématiques cruciaux : `StableNum` (réserve
    width via ghost element pour pas que les counters décalent les voisins),
    `easeOutSoftBack` (overshoot 7% pour entry), breathe gated par `^6` pour
    pas de jitter pendant l'entry, `Math.round()` sur translateY (subpixel
    rendering blur).
15. **MCP supabase** disponible (`mcp__supabase-versuz__*`) — apply_migration,
    execute_sql, list_migrations, etc. Pour toute opération DB : préférer MCP
    plutôt que de demander un copy-paste dans SQL Editor.
16. **Server-side first** : tous les marketplace filters sont server-side via
    indexed columns (no client-only refinement qui causerait du count drift
    entre header et grid). Migrations 0044/0046/0048 ont promu skill_type,
    repo_skill_count, byte_count à des colonnes indexées exploitables.
17. GitHub Actions (`.github/workflows/`) :
    - `scrape-daily.yml` — daily 02:00 UTC, SCRAPE_MAX_NEW=1000 cap
    - `quality-judge.yml` — every 4h, Groq free, $0 cost
    - `bench-runner.yml` — daily 03:00 UTC, BENCH_BUDGET_USD=1 per-run, monthly cap $25 via `cycles.actual_cost_usd` (mig 0049). Bench engine writes cost à cycle completion.
