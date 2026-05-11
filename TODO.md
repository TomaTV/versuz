# Versuz · TODO

> **Pivot mai 2026** : marketplace-first, judging-second.
> Marketplace = directory complet avec filtres instant côté client.
> Leaderboard = vue ranked (active une fois le judging branché).

## V0 — done

- [x] Logo + brand identity (mark + wordmark + favicon)
- [x] Landing page (hero + 6 sections + animations CSS)
- [x] Pages : about, methodology, leaderboard, skills/[slug], standings/[category]
- [x] Scraping skills (GitHub → SKILL.md → parse → classify → bundle detect → upsert + skip-by-SHA + concurrency 6 + repo-meta cache)
- [x] CLAUDE.md as first-class entity (scraper + DB + pages + classifier)
- [x] Bench engine end-to-end (agent + judge + retry + rotation + circuit breaker)
- [x] Marketplace tier model + 5 verification levels
- [x] **Marketplace** `/marketplace` — filtres + URL sync + topics + search + pagination
- [x] **Compare** `/compare?a=...&b=...` side-by-side + **picker UI** : checkbox sage en haut-gauche de chaque MarketplaceCard, floating bar dark en bas avec liste des slugs sélectionnés (FIFO replace si > 2), bouton "Compare →" actif quand 2 picked, auto-clear quand on toggle skills/claude-md. Auto-detect kind côté `/compare` page (try skill puis fallback claude_md), erreur claire si kind mismatch.
- [x] **Detail pages** — install commands, embed badge, audit trail `/skills/[slug]/runs`
- [x] **Cmd+K search** modal global
- [x] **OG images** dynamiques par skill / claude-md
- [x] **Sitemap + robots.txt + RSS feeds + JSON API v1**
- [x] **Submit form** real DB writes (URL fetch + content paste)
- [x] **/claim flow** standalone + auto-claim au submit
- [x] **/profile dashboard** avec stats + bar chart + sparkline
- [x] **/admin** layout + task-proposals + skills + claude-md (GitHub OAuth allowlist)
- [x] **Auth** : VzNav user dropdown, sign-in/out, session caching
- [x] **`/feed` index page** (human-readable RSS landing)

## V0.5 — done

- [x] 11 migrations Supabase (init + bench + marketplace + RLS + tasks + subscribers)
- [x] First massive scrape (~93 skills + ~129 CLAUDE.md)
- [x] Cost guardrail in bench (refuse paid mode without `BENCH_BUDGET_USD`)
- [x] **Bench cycle 1 framework** :
  - 102 built-in tasks hand-craftées (`scripts/bench/built-in-tasks.json`)
  - `bench:seed-tasks` → upsert into `tasks`
  - `bench:enqueue` → cycle + cartesian product
  - `bench:agent-smoke` → end-to-end agent test
  - `bench` → claim + run + judge + refresh_rankings
- [x] **Vercel cron** : `/api/cron/bench` + `/api/cron/refresh-rankings`
- [x] **Embed badge SVG** + UI block on detail pages
- [x] **Cold-start `prior`** (sortable signal pre-bench from stars/forks/license/freshness)

## Bench engine status (11 mai 2026)

Reality check after first cycle: free-tier rate limits make 30-task suites
unsustainable. Strategy adjusted.

**Active dev mode** — 3 Groq models (Llama 3.3 70B + Llama 4 Scout + Llama 4
Maverick). Per-model quota = 3 × 1000 RPD = 3000 free RPD with genuine
ensemble diversity. Sub-second inference, no daily-quota Roulette.

**or-v1 paid path active** — DeepSeek V4 Flash migrated from V3 in or-v1
(`scripts/bench/providers/openrouter.mjs`). DeepSeek-direct routing confirmed
working : `[deepseek-usage-debug] provider used : DeepSeek`. Prompt cache kicks
in from call 2 (cache_read $0.0028/M vs $0.14/M input). ~$2.60/jour @ 100 skills.

**Tunings shipped**:
- `BENCH_JUDGE_COUNT=1` env to cut judges 3× (use just primary)
- Provider rotation in agent path (Gemini → Groq → Mistral)
- Circuit breaker on judge: depleted models skipped for the rest of the run
- Robust judge JSON parser (fences, preambles, truncation, fallback to bare int)
- Default cycle size: 3 subjects × 5 tasks (was 3×3, then 5×5)
- Default concurrency: 6 (was 2, was 4)
- maxTokens for judges: 600 (was 300, was getting truncated)
- **Cycle resume bug fixed** (`scripts/bench/index.mjs`) — now detects pending
  judge calls on `running` cycles correctly (was checking `status='queued'` only,
  causing orphan cycles). DeepSeek V4 Flash added to `expectedJudgeModels` in
  `/admin/cycles/page.js`.

## Marketplace V1

- [x] **Stripe Connect Express + destination charges** : onboarding sellers via `/profile/settings`, checkout sessions, webhook `/api/webhooks/stripe` insère dans `purchases`, split 70/30 automatique (pas de payouts manuels — Stripe le fait)
- [x] `/buy/[kind]/[slug]` page — preview + Stripe checkout (test mode), `/buy/.../success` page
- [x] **My earnings** dashboard `/profile/earnings` (gross, fees, net 30d / lifetime, table sales)
- [x] **Profiles table** (migration 0013) — bootstrap trigger + backfill, source de vérité pour `stripe_account_id` et display fields stables
- [x] **Tier picker** au submit (Free / Premium $X) — RLS bypass via service-role pour self-listing premium
- [x] **Buy CTA** sur `MarketplaceCard` quand `tier !== 'free'`
- [x] **seed-premium script** — `npm run seed:premium` (5 skills + 1 claude_md, $1.99, verified)
- [x] **Topics filter on marketplace** — multi-select pill chips wired via `toggleTopic` + `?topics=` URL sync. Active topics styled, "clear topics" button when N≥1.
- [x] **Download/access gating** sur premium (V1.5) — Supabase Storage `premium-content` bucket + signed URLs (7d TTL). Migration 0015 (`private_storage_path` sur skills/claude_md_files + `download_url` sur purchases). Submit: file input optionnel quand tier=premium → upload via service-role. Webhook `checkout.session.completed` : mint URL et stamp sur purchase row. SkillDetail : nouvelle section "Premium download" qui sign une URL fraîche par render pour owned/authored. Helper : [src/lib/premium/storage.js](./src/lib/premium/storage.js).
- [x] **Cron `/api/cron/refresh-stripe-accounts`** — toutes les 6h, fetch Stripe accounts.retrieve pour chaque profile.stripe_account_id, drift detection + DB update si charges_enabled / payouts_enabled / onboarding_complete diffèrent. Backup en cas où le webhook `account.updated` rate.
- [x] **Seller dispute UI** : `/profile/earnings` § 00 Disputes alert crimson + bouton "Submit evidence on Stripe ↗" via `openStripeDisputes()` (accountsLoginLink avec redirect_url=/express/disputes)
- [x] **Cron `/api/cron/sweep-stuck-jobs`** — Vercel cron toutes les 6h. Sweep run_jobs queued > 24h → status='error', auto-mark cycles completed.
- [x] **Compare picker UI** — checkbox corner-stamp hover-only + floating bar via portal + auto-detect kind sur compare page
- [x] **Resend SMTP** — `src/lib/resend.js` minimal client (no SDK), wired sur /api/subscribe (welcome) + webhook checkout.session.completed (branded receipt avec download link signed URL)

## Pay-to-promote (V1.5)

- [x] **Boost feature** : `/promote/[kind]/[slug]` page + Stripe checkout flat $4.99 / 30j (overridable via env). Migration `0016_promotions.sql` (table `promotions` + colonnes `promoted_until`). Webhook gère `versuz_action=promote`, calcule `promoted_until = max(now, current) + N days` (stacking).
- [x] **Boost caps** : 365j max actif (clamp côté webhook + côté checkout-action), rate limit 1 achat/24h par item, top 6 boosted slots pinnés en haut du marketplace (au-delà, pill amber gardé mais sort normal).
- [x] **BOOSTED pill** amber dans MarketplaceCard + skill detail.
- [x] **CTA "Boost this skill"** sur skill detail page quand `isAuthored` (label adapt si déjà boosted → "Extend boost").

## Judging V1 (le moat)

- [x] **Inter-judge disagreement view** sur skill detail — `getJudgeDisagreement()` + `<DisagreementSection>` § 02c. Stdev across judge avgs, label high/mid/low, per-judge delta vs avg coloré (sage/crimson).
- [x] **Top-N badge** dans MarketplaceCard — pill sage (top 3) / azure (top 4-5) / outline (top 6-10), basé sur rankings table jointe via `getAllRanksBySlug()`.

## Polish

- [x] **Responsive mobile** — Section + PageHero passent à `clamp()` (16px → 64px horizontal, scale vertical aussi). Nav 88px → 64px height + nav links cachés < 768px + Submit button label caché (icône ↗ seul). MarketplaceCard min-height 220px sur mobile. Admin layout + marketplace + leaderboard wrappers en clamp(). `vz-stack-mobile` + `vz-hide-mobile` helpers ajoutés. Reste : compare/feed/submit/profile pages (low-traffic — peuvent être adressés au coup-par-coup quand un user remonte le feedback).
- [x] **Cost guardrail mid-run** — `runJudgesForOutput()` retourne `costUsd` cumulé (real cost via OpenRouter response, sinon estimate $2/M in + $5/M out). Main loop accumule entre outputs, halt si `>= BENCH_BUDGET_USD`. Cycle marqué `'partial'` (migration 0017) pour `/admin/cycles` afin de re-run avec budget supérieur.
- [x] **`/admin/cycles`** page — top 20 cycles avec compteurs jobs (queued/completed/cached/error), retry errored jobs button, mark completed button (safety check : refusé si jobs encore queued), **continue partial cycle button** (re-flip `partial → queued` après bump du budget), refresh rankings RPC button, sweep stuck jobs (configurable hours threshold), judge stats lifetime (count + avg per model)
- [x] **Cron `/api/cron/weekly-digest`** — Vercel cron vendredi 9h UTC, query top 5 ranked skills + top 5 ranked CLAUDE.md + count new items week, render branded HTML email Versuz, envoie via Resend à tous les `subscribers` non-désinscrits (sequential 120ms throttle pour rester sous 10 req/s Resend free). Dry-run via `?dry-run=1`.

## CLI + MCP (mai 2026, beta)

- [x] **`npx versuz` CLI** — [cli/](./cli) (v0.1.0). 8 commands :
  list/search/info/install/login/whoami/logout/submit. Interactive mode
  prompt-driven, figlet ANSI Shadow logo en gradient ember, cli-table3
  colorisé, ora spinners, boxen pour les details. Free items install
  directement dans `.claude/skills/<slug>/SKILL.md` ou `./CLAUDE.md`.
- [x] **`@versuz/mcp` MCP server** — [mcp-server/](./mcp-server) (v0.1.0).
  5 tools pour Claude Code : versuz_search / versuz_list_skills /
  versuz_list_claude_md / versuz_get / versuz_install. Stdio transport.
- [x] **API endpoints CLI/MCP** :
  - `GET /api/v1/skills/<slug>/content` (free open, premium → 402 + buy_url)
  - `GET /api/v1/claude-md/<slug>/content` (pareil)
  - `POST /api/v1/auth/whoami` (vérifie PAT via GitHub /user)
  - `POST /api/v1/submit` (8 couches anti-spam)
- [x] **Submit auth + anti-spam** — GitHub PAT obligatoire (login via
  `versuz login`, stocké `~/.versuz/auth.json` chmod 600). Rate limit
  5/h/github_user_id (migration 0022, table `cli_submissions`). Dedup URL 24h.
  Owner-or-org-member only (vérifié via `/orgs/X/members/Y`). URL strict
  github.com regex. Size cap 200 KB. Free tier hardcoded. Full audit trail.
- [x] **Landing + about sections** — `§ Install` sur landing (2 cards CLI/MCP),
  `§ 02 — Tools` sur about (remplaçant "Founder"), footer "Tools" column
  avec badge BETA.
- [x] **Multi-token GitHub rotation** — [scripts/_github-tokens.mjs](./scripts/_github-tokens.mjs)
  via N instances + Proxy (l'ancien hook `before-request` était shadowé).
  Config `GITHUB_TOKENS=t1,t2,t3`. BATCH_SIZE défaut 20 → **5** pour visibilité.
- [x] **Real-time KPI landing** — `/api/stats` endpoint + `<LiveStatsGrid>`
  client component (8s poll, CountUp anime, dot pulse sur update).
- [x] **Topics split** — 2 sections séparées sur landing (skills / claude_md)
  avec counts exacts par kind + `getTopTopicsByKind()`.
- [x] **Filter Topic dans Refine** — `<TopicAdder>` (input + datalist
  autocomplete top topics) + active-filter chips row au-dessus du grid.
- [x] **Official badge** — migration 0021 + whitelist
  `src/lib/official-orgs.js` (~30 orgs : anthropics/google/openai/vercel/
  stripe/supabase/microsoft/aws…). Auto-flag au scrape. Filter "Official only"
  dans Refine. Pill ✓ azure carré 18×18 à droite du TierBadge.
- [x] **Prior v2** — quality_score (±200) + is_official (+120) intégrés.
  Trust ladder progressive. Range 900-2100, médiane ~1280.
- [x] **`docs/cli-mcp-go-live.md`** — checklist publish jour J (5 lignes à
  bumper + 2 `npm publish`).

### CLI/MCP next (v0.2, post-launch)

- [ ] `versuz` published sur npm (bloqué par domaine `versuz.dev` live).
  Checklist : [docs/cli-mcp-go-live.md](./docs/cli-mcp-go-live.md).
- [ ] `GET /api/v1/skills/<slug>/bundle.zip` endpoint pour télécharger les
  bundle files des skills bundled (scripts/refs/sibling .md).
- [ ] **GitHub Device Flow** dans CLI (au lieu de PAT manuel) — register
  Versuz OAuth App, `versuz login` → user voit un code, visite
  github.com/login/device, CLI poll, swap pour un Versuz token longer TTL.
- [ ] **Premium auth pour CLI/MCP install** — vérifier l'achat Stripe via
  `purchases` table + sign URL fraîche. Aujourd'hui premium = 402 hard refuse.
- [ ] **MCP tool `versuz_submit`** — exposer le submit endpoint au MCP server
  (Claude pourra publier un skill au nom de l'user après confirmation).

## Shipped 11 mai 2026 (rubric v4 + live pipeline + auto-queue)

- [x] **Rubric v4 aligned FLASK / JudgeBench / HELM** — 5 axes (instruction_following 0.35 / correctness 0.30 / completeness 0.20 / usefulness 0.10 / safety 0.05), 7 hard penalty rules, internal consistency rule (weakness listée → axe ≤ 80), anti-inflation guardrails, length-bias neutrality block, score cap retiré. [scripts/bench/judge.mjs](./scripts/bench/judge.mjs).
- [x] **Migrations 0027-0030** : axes RPCs (SECURITY DEFINER), rankings rounded 2 décimales, rubric v4 axes JSONB keys, bench_pending flag + partial indexes.
- [x] **Prompt caching actif** — prompt restructuré avec marker `===== END SYSTEM RUBRIC =====`. Cache Anthropic via `cache_control: ephemeral` + auto DeepSeek/OpenAI. Cache stats loggées (`prompt cache : X read · hit rate Y%`).
- [x] **Live drip scrape** — batch=1 default sur scrape-aggregators, batch=5 sur les 3 autres scrapers (SCRAPE_BATCH / SCRAPE_CS_BATCH / SCRAPE_BATCH_SIZE). Items apparaissent sur /marketplace dès l'upsert (vs ancien big upsert à la fin).
- [x] **Live refresh bench** — `refresh_rankings` toutes les N outputs jugés (env BENCH_REFRESH_EVERY default 25). Items apparaissent sur /leaderboard pendant le run.
- [x] **Auto-queue submit** (web + CLI) — `bench_pending=true` au submit, `after()` background → `judgeQualityInline` Groq free, `loadSubjects` priority ORDER BY bench_pending DESC dans `full.mjs`, sweep `UPDATE bench_pending=false` à la fin du cycle.
- [x] **Admin /admin/cycles dashboard** — funnel Raw/Quality/Benched/Pending avec barre horizontale 56px colorée, cycle progress segmentée (completed/cached/errors), ETA agent + judge wall-time (queued × medianAgent + pendingOutputs × 6s parallel), phase label avec SVG icon (agenting/judging/finalizing), judge histograms SVG inline (10 buckets par judge). Auto-refresh 15s pendant running. Pas d'emoji (tout SVG).
- [x] **Leaderboard table refresh** — LMArena-style : Model + 5 axes columns + Score, sort par colonne client-side, search bar inline, stats strip (Ranked/Mean/Median/Stdev/Top + histogramme distribution), composite score = weighted axes (décimales fines anti-tie), mobile overflow-x scroll.
- [x] **+5 awesome-lists + 16 GitHub topics** — continuedev/awesome-rules, PatrickJS/awesome-cursorrules, SchneiderSam/awesome-windsurfrules, obviousworks/vibe-coding-ai-rules, raoufchebri/awesome-mcp, tairov/awesome-agents.md · topics model-context-protocol, mcp, cursor-rules, windsurf, continue-dev, coding-agent, ai-agents, agentic-coding, vibe-coding, prompt-engineering, prompt-library, system-prompt, llm-tools, roo-code, cline, codex.
- [x] **Scraper bugs fixés** — fetchRaw fallback sur `default_branch` GitHub API (fini les 404 monorepos type openclaw/skills) + upsert tolérant onConflict github_url si slug-conflict 23505.

## Next steps (post smoke test, avant launch)

- [ ] **Full bench du catalog** : `node scripts/bench/full.mjs --all --tasks=4` → ~$50-60 pour 5117 items avec cache actif (~10h en background). Daily incremental via GH Actions cron à 6am UTC après ça.
- [ ] **GH Actions bench cron** : activer `.github/workflows/bench-runner.yml` (existe déjà). Pas de Hetzner VPS avant V1 — Vercel + GH Actions suffit pour V0 (cron daily + bench_pending priority).
- [ ] **Validate anti-inflation rubric** : après prochain bench, check si GPT-5 mini descend bien à ~3-5% de scores ≥85 (était à 12% avant le tighten). Sinon → ajuster encore.
- [ ] **Human gold set calibration** (V1 post-launch) : 200 items annotés à la main, learn affine transform `score_cal = a_j × score + b_j` par judge + axe. Spearman judge-vs-human > 0.7 cible. Krippendorff alpha > 0.4.
- [ ] **Multi-format scrape V1** (post-launch) : étendre scrape-codesearch pour AGENTS.md (Codex), `.cursorrules`, `.windsurfrules`, `.continue/rules/*.md`. Décision schéma : folder dans claude_md_files via nouvelle project_category, ou nouveau subject_kind.
- [ ] **Smithery / Glama / mcp.so / mcp-get** : API clients custom pour MCP server catalogs. 5k-15k MCP servers potentiels via Smithery seul. Plus gros gain volume post-launch.
- [ ] **Hetzner VPS V1** (seulement si > 500 submits/jour ou besoin de sub-5min latency submit→bench) : PM2 + `worker-loop.mjs` qui poll `bench_pending=true` toutes les 60s. Pas avant.
- [ ] **Pairwise Bradley-Terry** sur top 5% + middle band disputé (scores proches) : améliore la discrimination relative sans exploser le coût. V1 après calibration humaine.

## Pre-launch checklist (mardi → lundi prochain)

Suivre [docs/launch-marketing.md](./docs/launch-marketing.md) pour le détail
de la phase publique. Ci-dessous = ordre d'exécution technique.

### Mardi-mercredi (avant domain)

- [ ] **Quality-judge run massif** : `node scripts/bench/quality-judge.mjs --limit=4000`
  pour combler les 3,884 unjudged. Lancer le soir, finit en ~6h sur Groq free.
- [ ] **First bench cycle** : `node scripts/bench/enqueue-cycle.mjs --scope=skills.document --subjects=10 --tasks=5` puis `npm run bench`. Coût ~$1.30 mode or-v1.
- [ ] Smoke tests end-to-end localhost (submit / buy / install / CLI / MCP)
- [ ] Vidéo logo Veo générée

### Mercredi soir — domain day

- [ ] Cloudflare : achat `versuz.dev` (~$10/an)
- [ ] DNS : Cloudflare → Vercel (CNAME `cname.vercel-dns.com`)
- [ ] Vercel : Add Domain `versuz.dev` + `www`
- [ ] SSL auto via Vercel

### Jeudi — services prod

- [ ] Supabase Auth Site URL = `https://versuz.dev`
- [ ] GitHub OAuth Homepage URL = `https://versuz.dev`
- [ ] Stripe live mode : `sk_live_` + webhook persistant
- [ ] Resend domain verify (DNS SPF/DKIM/DMARC chez Cloudflare)
- [ ] Bump `cli/src/api.js` + `mcp-server/src/index.js` defaults → `https://versuz.dev`
- [ ] `npm publish` × 2 (cli + mcp-server)
- [ ] Test `npx versuz@latest search pdf` depuis un poste neuf

### Vendredi — content

- [ ] Tweet thread numbers updated dans `launch-marketing.md`
- [ ] OG images vérifiées via [opengraph.xyz](https://opengraph.xyz)
- [ ] Press kit dans `/press-kit/` (logos SVG + 4 screenshots)
- [ ] Twitter banner uploadé + bio
- [ ] Bluesky bio
- [ ] Show HN draft dans un Gist privé

### Lundi prochain — LAUNCH 🚀

Linéaire [docs/launch-marketing.md](./docs/launch-marketing.md) Wave 1+2.

## Bloqué par "pas de domaine"

Tout ce qui suit nécessite versuz.dev acheté + DNS + Vercel deploy avant
de pouvoir avancer. Voir [docs/domain-go-live.md](./docs/domain-go-live.md).

- [ ] **Stripe live activation** : sk_live_, webhook persistant prod, branding live
- [ ] **Stripe Tax** activation (Settings → Tax) avant volume EU sérieux
- [ ] **Customer email receipts** Stripe (Settings → Customer emails)
- [ ] **Webhook persistant prod** Dashboard → Webhooks → Add endpoint
- [ ] **Resend domain DNS** (3 records SPF/DKIM/DMARC chez registrar)
- [ ] **Vercel custom domain** + SSL + cron activation
- [ ] **Supabase Auth Site URL** = https://versuz.dev (au lieu de localhost)
- [ ] **GitHub OAuth Homepage URL** = versuz.dev

## Polish codable maintenant (low priority)

- [x] **Profile public page** `/u/[login]` — stat grid (contributions/verified/stars/premium/boosted), bio, link GitHub, listings skills + claude_md. Linkable depuis `/buy/[kind]/[slug]` via "seller: @login".
- [x] **Bulk admin actions** sur `/admin/skills` + `/admin/claude-md` — checkbox per row + select-all + dropdown 6 actions (verify lvl 2/3/4, unverify, tier-free, delete avec confirm). `bulkSubjectAction(kind, action, slugs[])`.
- [x] **Subscriber list admin** `/admin/subscribers` — list + counts (total/active/unsub) + Unsub (RGPD audit-trail) + Erase (right-to-be-forgotten) + CSV export inline. `unsubscribeUser` + `deleteSubscriber` actions.
- [x] **Drag-drop upload** premium file input — `<PremiumDropZone>` client component avec hover state + filename preview + click-to-pick fallback + max 10 MB hint.
- [x] **Better empty state** `/leaderboard` — au lieu d'une box muette, hero copy "Bench is warming up" + 3 CTAs (browse marketplace / methodology / submit yours).
- [x] **Onboarding tutorial** (mai 2026) — `<OnboardingModal>` 3-slide sur premier
      `/profile` (Browse / Earn / Trust), localStorage persist `versuz_onboarded_v1`,
      ESC + arrow keys + click outside = close, accent color différent par étape.
- [x] **Copy-content button** (mai 2026) — corner-stamp top-right des `<pre>`
      content sur skill + claude_md detail. Animation sage "✓ Copied" 1.6s.
- [x] **Quality score display** (mai 2026) — Field "Quality" + strip rationale
      italique azure sur les detail pages, fallback sur MarketplaceCard quand
      pas de Elo.
- [x] **Quality-judge improvements** (mai 2026) — checkpoint resume, timeout, better JSON parsing, network retry, cross-provider fallback (Groq → OpenRouter auto when TPD exhausted).
- [x] **Premium content gating** (mai 2026) — paywall fix critique : SKILL.md
      et CLAUDE.md content cachés derrière teaser 500-char + masque gradient
      pour `tier=premium && !owned && !authored`. CTA Buy $X explicite.
- [x] **Marketplace UX overhaul** (mai 2026) :
  - Compact filters (Refine ▾ collapsible avec Tier/Trust/Quality/Tokens/Sort
    groupés inside) + categories pills horizontaux
  - Search bar inline avec stats row (au lieu de pleine largeur)
  - Topics row supprimée (low-signal)
  - Sponsored = 3 par page distribués aux **3 zones fixes** (top / middle / bottom)
    avec daily-stable shuffle. Plus de pinning entassé page 1.
  - `gridAutoFlow: dense` + `auto-fit` → fini les "trous" à la fin de page
  - Tokens filter (Small/Medium/Large) + Quality filter (60+/70+/80+/90+)
  - DB query `liveClaudeMds` filter `word_count >= 40` → false positives
    (3-token marker files) hidden
- [x] **Hero compact** sur utility pages (mai 2026) — `<PageHero compact>` prop
      réduit padding + title size de ~50% pour /profile, /buy, /promote, /claim,
      /status, /profile/settings, /profile/earnings, /profile/items.
- [ ] **Skeleton loaders** plus complets sur loading.js (actuellement basique)
- [ ] **Error boundaries** sur les routes principales (catch des crashes runtime)

## Taxonomie

- [x] **`other` bucket** (migration 0018) — étend les CHECK skills.category +
      claude_md_files.project_category. Classifier fallback à 'other' quand
      0 keyword match (au lieu de forcer dans une des 6/8 cats par défaut).
      Bench cron skip 'other' (pas de task suite). Leaderboard skip 'other'
      via `getRankableCategories`. Submit form notifie quand un item land en
      'other'. CATEGORY_LABELS étendus pour afficher "Other" propre dans
      la marketplace filter.

## Scrape — next options pour scale au-delà du GitHub rate limit

GitHub Code Search plafonne à 30 req/min + ceiling 1000 résultats par query
même avec 3 tokens rotatés. Pour scaler au-delà, options par ordre de ROI :

- [x] **Sourcegraph public API** ([sourcegraph.com/.api/search/stream](https://sourcegraph.com/.api/search/stream)) —
  shipped dans [scripts/scrape-codesearch/](./scripts/scrape-codesearch/).
  SSE stream parsing, dedup par (owner, repo, path), filter known-by-DB,
  content via raw.githubusercontent.com (UNMETERED), repo meta via GitHub
  API (1 call/repo avec multi-token rotation). **Smoke test : 1000 SKILL.md
  + 1000 CLAUDE.md découverts, 0 déjà en DB** → potentiel énorme de scale.
  Run : `npm run scrape:codesearch`. Cap SG : count:1000 par query, étendre
  via queries chunkées (par language/stars) si besoin de plus.
- [~] **grep.app API** — **bloqué par Vercel Security Checkpoint** (JS
  anti-bot challenge). Scripts headless reçoivent du HTML challenge au
  lieu de JSON. Code de l'adapter gardé dans
  [grepapp.mjs](./scripts/scrape-codesearch/grepapp.mjs) pour référence
  + au cas où la protection est retirée. Pour vraiment scraper grep.app :
  Playwright en mode non-headless (lourd, lent, fragile) — pas worth le coup.
- [ ] **MCP registry scrapers** — [Smithery](https://smithery.ai),
  [mcpservers.com](https://mcpservers.com), [pulsemcp.com](https://pulsemcp.com)
  catalogues 1000+ MCP servers. Souvent ont un SKILL.md / CLAUDE.md ou
  utilisable comme tel. Each registry = 100-200 nouveaux items.
- [ ] **BigQuery GH Archive** — bulk one-time seed via
  `bigquery-public-data.github_repos.contents` filtré sur path
  `*/SKILL.md` ou `*/CLAUDE.md`. Free tier Google Cloud 1TB/mois. Couvre
  tout l'historique GitHub depuis 2008. Setup : ~2h pour service account
  + 1 query. Probablement 10-20k matches à passer en filtres ensuite.
- [ ] **GitHub Public Events API** (`GET /events`) — real-time stream des
  push events publics, watch les nouveaux repos. Different bucket
  (10k req/h), pas affecté par code-search limit. Cron 5min → catche les
  nouveaux items dans les minutes qui suivent la publication.
- [x] **Crowdsource via `versuz submit`** — chaque créateur peut maintenant
  publier son propre skill depuis le terminal (avec ownership check), pas
  de scrape requis. Couvert par le CLI v0.1.0.

**Recommandation V0.2** : ~~Sourcegraph adapter en premier~~ → **shipped**.
Prochaines marches : MCP registries (Smithery, mcpservers.com — signal
très ciblé pour notre vertical) + searchcode.com en alternative non-Vercel
à grep.app. BigQuery uniquement si on doit re-seed massivement.

**Pour gratter plus de matches via Sourcegraph** (au-delà des 1000 par
query) : chunker la query par dimension orthogonale → `lang:markdown
stars:>10`, `stars:5..50`, `stars:>50`, etc. Ou par topic/language. Chaque
sous-query renvoie son propre lot de 1000.

## Auto-queue scrape → quality → bench (à brancher avant launch)

Aujourd'hui le pipeline est manuel : on scrape, puis on lance `quality-judge`,
puis on enqueue un bench cycle. Pour scale + ne pas oublier d'items frais,
brancher l'autoflow ci-dessous.

### Phase A — Auto quality-judge (fast win, gratis)

- [ ] **Cron `/api/cron/quality-judge`** déjà existe mais activer dans
  [vercel.json](./vercel.json) avec schedule `0 */6 * * *` (toutes les 6h).
  Le script `quality-judge.mjs` skip déjà les items avec `quality_score IS NOT NULL`,
  donc relancer fréquemment = auto-pick-up des nouveaux items scraped.
- [ ] **Limit par run** : 200 items (=~6 min sur Groq free). Compatible Vercel cron
  qui timeout à 60s côté Hobby — utiliser un fire-and-forget : le cron émet une
  POST vers le runner self-hosted OU un dispatch GitHub Actions.
- [ ] Alternative simple : **trigger sur scrape** → après chaque batch upsert,
  rate ce qu'on vient d'insérer en synchrone. Coût zéro avec Groq.
  Code : helper `judgeSlugsNow(slugs, kind)` dans `scripts/scrape/_judge-helper.mjs`,
  appelé depuis chaque scrape après le flush.

### Phase B — Auto bench enqueue (post-launch)

- [ ] **Daily cron `/api/cron/bench-enqueue`** : enqueue un nouveau cycle chaque
  jour à 04:00 UTC sur une catégorie rotée (rotation `document → sql → data →
  web → shell → code → nextjs → react → ...`, retour à document après 14 jours).
- [ ] **Bench worker** : encore manuel (`npm run bench`). 3 options pour auto :
  - GitHub Actions cron qui run `npm run bench` (5 min budget free)
  - Vercel cron qui POST vers un Modal/Railway worker
  - Self-hosted node process sur un VPS perso
  Pour V0 : laisser manuel, le user lance `npm run bench` le matin.
- [ ] **Auto-judge after new scrape integrated in cycle** : tout nouveau skill
  scraped sera inclus dans le PROCHAIN cycle de sa catégorie (cartesian product
  skill × task → judged). Pas besoin de logic spécifique : l'enqueue prend
  TOUS les subjects de la category courante.

### Phase C — Bench notifications + dashboard (V1)

- [ ] **Status page /admin/cycles** déjà OK, faut juste une "next scheduled cycle"
  qui montre quand le prochain auto-enqueue se déclenche.
- [ ] **Tweet automatisé** quand un cycle finit et change le top 10 : top-3
  posté sur Twitter via API + thread du delta vs cycle précédent.

## V2 (parqué)

- [ ] Real-time battles style Chatbot-Arena (live judging avec vote user)
- [ ] Dark theme (tokens prêts dans `.ui/`)
- [ ] Webhook creator (notify on rank change → Discord / Slack / email)
- [ ] API enterprise premium (custom benchmarks for clients)
- [ ] Multi-vertical scaling (au-delà des 6 cats skill + 8 cats claude-md)
- [ ] Anthropic Message Batches pour `prod` mode (50% off Sonnet, async)
- [ ] Deterministic pre-judge layer (regex/JSON-schema pre-pass avant LLM)
- [ ] Bench worker via Vercel Cron (split gros run en chunks de 5min)
- [ ] Switch to v1 mode quand budget DeepSeek (~$30/mo)

## Cost & scaling matrix (May 2026 plan)

### Token model — real per-call shape

SKILL.md / CLAUDE.md content moyenne ~1500 tokens (sources : iq-project.ai,
learn.microsoft, blog.stephane-robert — range 500-3000). Donc :

| Phase | Tokens in | Tokens out |
|---|---|---|
| Agent run | 2 000 | 1 000 |
| Judge call | 1 700 | 150 |

Per pair (1 agent + N judges) = `2k + 1.7k×N` input, `1k + 150×N` output.

For **100 skills × 5 tasks = 500 pairs** :

| Setup | Input M tok | Output M tok |
|---|---|---|
| 1 judge | 1.85 M | 0.575 M |
| 3 judges | 3.55 M | 0.725 M |

### Provider pricing (May 2026)

| Provider | Model | $/M input | $/M output | $/judge call | $/agent call |
|---|---|---|---|---|---|
| Anthropic | **Haiku 4.5** | $1.00 | $5.00 | $0.00245 | $0.00700 |
| Anthropic | Sonnet 4.6 | $3.00 | $15.00 | $0.00735 | $0.02100 |
| OpenAI | **GPT-5 nano** | $0.05 | $0.40 | $0.00015 | $0.00050 |
| OpenAI | **GPT-5 mini** | $0.25 | $2.00 | $0.00073 | $0.00250 |
| OpenAI | GPT-5 | $1.25 | $10.00 | $0.00363 | $0.01250 |
| **DeepSeek** | **V3** | $0.27 | $1.10 | $0.00062 | $0.00164 |
| DeepSeek | R1 | $0.55 | $2.19 | $0.00126 | $0.00329 |
| Google | Gemini 2.5 Pro | $1.25 | $10.00 | $0.00363 | $0.01250 |
| Google | Gemini 2.5 Flash | $0.30 | $2.50 | $0.00089 | $0.00310 |
| Mistral | Small | $0.20 | $0.60 | $0.00043 | $0.00100 |

(Free tiers Groq Llama × 3 = 3000 RPD, gardés pour `dev` mode uniquement.)

### Daily cost @ 100 skills × 5 tasks

| Mode | Stack | $/day | €/day | Trigger |
|---|---|---|---|---|
| **dev** (default) | 3 Groq Llama, free | **$0** | 0 € | dev/local, plafond 3000 RPD |
| **v1-thrift** | DeepSeek V4 Flash agent + GPT-5 nano judge | **$0.89** | **0.81 €** ✓ | `BENCH_MODE=v1-thrift` + DEEPSEEK_API_KEY + OPENAI_API_KEY |
| **or-thrift** | GPT-5 nano via OpenRouter (1 key) | **$0.95** | **0.86 €** ✓ | `BENCH_MODE=or-thrift` + OPENROUTER_API_KEY only |
| **v1** | DeepSeek V4 Flash agent + Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini | **$2.72** | **2.50 €** | direct keys, full ensemble |
| **v1 + Anthropic cache** | same, with prompt caching on Haiku | **$1.95** | **1.80 €** | direct keys, automatic |
| **or-v1** | Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini via OpenRouter | **$2.85** | **2.60 €** | `BENCH_MODE=or-v1` + 1 OR key |
| **prod** | Opus batch + Gemini Pro free + Mistral free | ~$3 | 2.75 € | Real budget |
| **gold** | Opus + GPT-5 + Gemini Pro canonical | ~$10 | 9 € | Championship cycles |

### OpenRouter vs direct provider keys

| Approach | Pros | Cons |
|---|---|---|
| **Direct keys** | cheapest, full prompt-caching discount | 5 separate billing accounts, top-ups, dashboards |
| **OpenRouter** | **1 key + 1 prepay**, all 200+ models, free models too | ~5-15% markup over direct |

Pour solo dev avec budget limité : **OpenRouter wins**. Le markup vaut bien
le fait de pas surveiller 5 dashboards. Prompt caching transparent à travers
OR pour Anthropic + DeepSeek.

### Caching strategy

1. **Output cache** (déjà en place) : `runner.mjs` dédup par `inputHash`. Si
   un (skill_md_content + task_input) est déjà dans `run_outputs`, on linke
   l'existant au job au lieu de re-call l'agent. Cycle qui a déjà tourné =
   re-run gratuit.
2. **Task cache** (déjà en place) : `task_proposals` — Gemini Flash génère
   les tasks 1× via `generate-tasks`, elles vivent en DB, jamais
   re-générées. Promote manuelle vers `tasks` via `/admin/task-proposals`.
3. **Prompt cache** (NEW) : Anthropic provider envoie maintenant le SKILL.md
   + task setup avec `cache_control: ephemeral`. Quand 3 judges hittent
   Anthropic dans la même fenêtre 5min pour le même skill+task, le 1er paie
   100% input, les 2 suivants paient 10%. ~30% d'économies sur input cost
   pour les ensembles Anthropic.

**Self-host vs paid API** : self-host (Modal/RunPod GPU) ne devient économique
qu'à 10k+ requêtes/min. Pour solo dev sur Versuz, paid API gagne largement.

## Quick wins encore dispo

1. **OPENROUTER_API_KEY only** + `BENCH_MODE=or-v1` → triple wow ensemble (Haiku + DeepSeek + GPT-5 mini) avec **une seule clé / un seul billing**, **~2.60 €/jour**
2. **OPENROUTER_API_KEY only** + `BENCH_MODE=or-thrift` → GPT-5 nano single judge, **~0.86 €/jour**, simplest possible setup
3. **DeepSeek + Anthropic + OpenAI keys** + `BENCH_MODE=v1` → direct, ~2.50 €/jour, full Anthropic prompt-cache discount
4. Stay free with `dev` mode (3 Groq Llama models) → 3000 RPD plafond, ~30 skills/jour
5. **Reset error jobs** : `update run_jobs set status='queued', error_message=null where status='error'`
6. ~~Migration 0011~~ — appliquée. Migration **0012** ajoute les IDs OR-préfixés (`anthropic/...`, `deepseek/...`, `openai/...`) au CHECK — à appliquer avant tout cycle `or-v1` / `or-thrift`.
7. Default cycle size **2 subjects × 2 tasks = 4 jobs** (was 3×3) pour cycle 1 minimal sans cramer la quota
8. **OpenRouter cache passthrough** activé pour modèles Anthropic dans [scripts/bench/providers/openrouter.mjs](scripts/bench/providers/openrouter.mjs) — `cache_control: ephemeral` forwardé. Vérifier dans la réponse `usage.cache_read_input_tokens` après le 2e judge.
