# Versuz — Contexte du projet

## Pitch en une phrase

Versuz est **la marketplace de confiance** pour les skills d'agents IA + les CLAUDE.md, avec un système de **vérification + tiers gratuit/premium** et un **leaderboard adversarial** (V1+) qui ranke les meilleurs avec 3 juges LLM frontier.

Deux types d'artefacts indexés :
1. **Skills** publics au format SKILL.md (Claude Code, Codex CLI, Cursor)
2. **CLAUDE.md** — fichiers de contexte projet pour agents

Trois tiers commerciaux :
- **Free** — scrapé depuis GitHub public, vérifié progressivement (claimed → verified → reviewed → featured), gratuit
- **Premium** — auteur soumet à un prix, Versuz prend 30%, l'auteur garde 70%
- **Featured** — Versuz first-party, on garde 100%, curated/expert quality

**Tagline** : *Skills go in. Only one wins.*
**Domaine** : versuz.dev

## Le problème qu'on résout

En mai 2026, l'écosystème des skills Claude Code a explosé : plus de 4 200 skills publics répertoriés sur claudemarketplaces.com, plus d'1,2 million sur skillsmp.com, et Anthropic a lancé sa propre marketplace officielle pour entreprises. Mais aucun de ces directories ne répond à **la** vraie question d'un dev qui adopte Claude Code :

> "Parmi les 47 skills qui prétendent faire la tâche X, lequel marche vraiment ?"

Les marketplaces actuels classent par stars GitHub et nombre d'installs — des signaux de popularité, pas de qualité. Versuz fait tourner chaque skill contre des tasks standardisées, fait juger les résultats par 3 LLMs (Claude Opus, GPT-5, Gemini), et publie un classement basé sur la performance réelle.

## Ce qu'on EST (revised May 2026)

- **Une marketplace** : on liste tout (free), on commissionne le premium (30%), on cure le featured (Versuz first-party)
- **Un système de vérification** : 5 niveaux (unverified → claimed → verified → reviewed → featured), badges visibles partout
- **Un leaderboard adversarial** (V1+) : top skills d'une catégorie ranked via 3 juges LLM frontier — c'est le moat de différenciation vs claudemarketplaces et co.

## Ce qu'on n'est PAS

- **Pas un outil de génération de skills** : SkillForge et d'autres font déjà ça
- **Pas une marketplace concurrente d'Anthropic** : on est complémentaire — Anthropic vend leur store, nous on est l'agrégateur indépendant qui ranke

## Positionnement stratégique

On est l'équivalent **LMArena pour les skills** : transparent, indépendant, dirigé par la communauté, gratuit en V0. Le moat se construit avec les données accumulées du leaderboard. À long terme, le modèle économique = API premium pour entreprises (benchmark de skills internes), analytics premium pour créateurs, placements sponsorisés (jamais des résultats truqués).

## Scope V0 (MVP en 6 semaines)

**Inclus** :
- **Deux entités rankables** : `skills` (catégorie focale = document/PDF extraction) et `claude_md_files` (8 project categories : nextjs / react / python-data / backend-api / mobile / devops / ml-training / generic)
- Skills scrapés depuis des repos GitHub publics (recherche `filename:SKILL.md`), classés `minimal` (SKILL.md seul) ou `bundled` (SKILL.md + scripts/refs/autres .md frères) — les deux types rankent ensemble sur les mêmes tasks
- CLAUDE.md scrapés depuis des repos publics (recherche `filename:CLAUDE.md` à la racine), classés par project-type via signaux fichiers + keywords + langage GitHub
- 30 tasks de benchmark par catégorie, déterministes où possible
- **Moteur de benchmark optimisé** : pour chaque tuple (subject × task), `inputHash = sha256(content || task_input)` → dédup output. Pour chaque output, 3 batchs API (Anthropic Message Batches = -50% coût, async), `outputHash` → dédup judges. Workers parallèles via Postgres `for update skip locked`
- Leaderboard web public unifié `/leaderboard` (toggle Skills / CLAUDE.md), pages détail par catégorie et par item, rationales des juges
- Read-only — pas d'auth, pas de soumissions, pas de paiements

**Exclus explicitement** :
- Soumissions de tasks par les users
- Soumissions de skills par les creators
- Authentification / comptes
- Couche marketplace / skills payants
- Multi-vertical hors document V0 (le reste arrive en V1+ via le scraper qui sait déjà classer)
- Multi-langue UI (anglais uniquement)
- App mobile
- Battles temps réel style Chatbot Arena (V2)
- Dark theme (tokens documentés dans `.ui/`, mais on ship light only)

## Stack technique

- **Frontend** : Next.js 16 (App Router, Turbopack, React Compiler) + JavaScript (.js / .jsx) + Tailwind v4 (`@theme inline`) — sans shadcn en V0 (DA trop opinionated, primitives custom)
- **Backend** : Next.js API routes pour les endpoints de lecture (incluant `/api/v1/skills` + `/api/v1/claude-md` pour le public read-only) ; le moteur de benchmark vit dans `scripts/bench/` en pur Node (plus de service Python séparé — la stack est unifiée pour le solo dev)
- **DB** : Supabase Free (Postgres, Auth GitHub OAuth + RLS public read + author insert) — DB metadata ~228 MB / 500 MB cap
- **Storage** : **Cloudflare R2** bucket `versuz-content` (public via `https://cdn.versuz.dev`) pour les SKILL.md / CLAUDE.md (10 GB free, zero egress). Supabase Storage gardé uniquement pour `premium-content` (signed URLs, tiny). Dispatch auto via env `R2_PUBLIC_URL` dans [src/lib/content/storage.js](./src/lib/content/storage.js).
- **Hosting** : Vercel pour Next.js. Crons via `vercel.json` (`/api/cron/bench` + `/api/cron/refresh-rankings`)
- **LLM Providers** (7 modes dans [src/lib/judges.js](./src/lib/judges.js)) :
  - `dev` : 3 Groq Llama (3.3 70B + 4 Scout + 4 Maverick) — gratuit, 3000 RPD plafond
  - `v1-thrift` : DeepSeek V4 Flash agent + GPT-5 nano judge — **0.81 €/jour** (1 judge, direct keys)
  - `v1` : DeepSeek V4 Flash agent + Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini judges — **2.50 €/jour** (3 judges, direct keys, prompt cache)
  - `or-thrift` : GPT-5 nano via OpenRouter — **0.86 €/jour** (1 OPENROUTER_API_KEY only)
  - `or-v1` : Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini via OpenRouter — **2.60 €/jour** (1 OR key, DeepSeek-direct routing + prompt cache)
  - `prod` : Opus 4.7 + Gemini 2.5 Pro free + Mistral free
  - `gold` : Opus 4.7 + GPT-5 + Gemini 2.5 Pro
- **OpenRouter** ([scripts/bench/providers/openrouter.mjs](./scripts/bench/providers/openrouter.mjs)) — recommandé pour solo dev. Une seule key, accès à 200+ modèles, prompt caching transparent, ~5-15% markup vs direct.
- **Token model** : SKILL.md/CLAUDE.md ~1500 tokens en moyenne (range 500-3000). Agent run = 2k in + 1k out. Judge call = 1.7k in + 150 out.
- **Cache layers** :
  1. `run_outputs.output_hash` dedup (skill+task identique → output réutilisé, déjà câblé dans `runner.mjs`)
  2. `task_proposals` cache pour Gemini-generated tasks (jamais re-générées)
  3. **Anthropic prompt cache** : SKILL.md + task setup envoyés avec `cache_control: ephemeral` → 90% off après le 1er judge dans la fenêtre 5min
- **Observabilité** : Sentry (errors, V1.6.1 — wizard + global-error capture), PostHog (analytics + session replay, V1.7 — provider monté dans `layout.js` via [src/components/posthog-provider.jsx](./src/components/posthog-provider.jsx), EU instance `eu.i.posthog.com`, pageview capturé manuellement sur change `usePathname`)
- **Package manager** : npm

> **Note Next 16** : `AGENTS.md` rappelle que la surface d'API diffère du training (params async, etc.). Consulter `node_modules/next/dist/docs/01-app/` avant tout ajout Next-spécifique.

## Schéma de base de données

16 migrations dans `supabase/migrations/` (source de vérité) :

- `0001_init.sql` — `skills`, `tasks`, `runs`, `scores`, vue `rankings` (legacy V0)
- `0002_claude_md_and_bench.sql` — `claude_md_files`, `cycles`, `task_sets`, `run_outputs` (dédup par hash), `run_jobs` (queue DB-backed avec `subject_kind`), `judge_batches`, `judge_scores`. Vue `rankings` étendue, RPC `refresh_rankings()` + `claim_run_jobs()`
- `0003_marketplace.sql` — colonnes `tier`, `verification_level`, `price_usd`, `author_user_id`, `verified_at` sur skills + claude_md_files. Tables `purchases` et `payouts` (Stripe Connect)
- `0004_widen_skills_category.sql` — élargit le CHECK sur `skills.category` (était bloqué à `pdf-extraction`)
- `0005_rls_public_read.sql` — RLS public read sur skills, claude_md_files, tasks
- `0006_task_proposals.sql` — table pour les drafts Gemini, status pending/approved/rejected
- `0007_submit_rls.sql` — RLS INSERT/UPDATE pour authenticated avec `author_user_id = auth.uid()`
- `0008_skills_github_url_drop_unique.sql` — drop UNIQUE sur `skills.github_url` (plusieurs SKILL.md par repo)
- `0009_widen_judge_models.sql` — élargit le CHECK sur `judge_model` (free dev judges)
- `0010_subscribers.sql` — newsletter subscribers (footer email subscribe)
- `0011_widen_judge_models_groq.sql` — Llama 4 Scout/Maverick + DeepSeek + Haiku 4.5 + Gemini Flash Lite + GPT-5 mini/nano
- `0012_widen_judge_models_openrouter.sql` — IDs préfixés OR (`anthropic/claude-haiku-4-5`, `deepseek/deepseek-chat` [→ 0032 V4 Flash], `openai/gpt-5-mini`, `openai/gpt-5-nano`) pour `or-v1` / `or-thrift` modes
- `0013_profiles.sql` — table `profiles` (1:1 avec auth.users), trigger bootstrap au signup, backfill, source de vérité `stripe_account_id` + display fields stables
- `0014_purchases_rls.sql` — RLS sur `purchases` (buyer + seller read, service-role write) + `payouts` (self read)
- `0015_premium_downloads.sql` — bucket privé `premium-content` + colonnes `private_storage_path` (subjects) + `download_url`/`download_url_expires_at` (purchases)
- `0016_promotions.sql` — table `promotions` (ledger boost) + colonnes `promoted_until` sur subjects + RLS
- `0017_cycles_partial_status.sql` — `partial` status pour cycles mid-budget halt
- `0018_other_category.sql` — bucket `other` étendu sur skills.category + claude_md_files.project_category
- `0019_quality_score.sql` — colonnes `quality_score / quality_rationale / quality_judged_at / quality_judge_model` sur subjects
- `0020_content_hash.sql` — colonne `content_hash` SHA-256 hex + indexes sur subjects (dedup auto)
- `0021_is_official.sql` — colonne `is_official BOOLEAN` sur subjects + indexes partiels + backfill via whitelist
- `0022_cli_submissions.sql` — table tracker pour `versuz submit` (anti-spam rate limit + audit trail)

Principes-clés du moteur :

- **Output dedup** : un même `(content || task_input)` → un seul run, jamais re-exécuté
- **Judge dedup** : un même output_text → jugé une seule fois par judge_model, ever
- **Cycles** : chaque tick 24h crée une row `cycles`, les jobs sont scoped au cycle, l'Elo est calculé en delta sans rewriter le passé
- **Workers parallèles** : `claim_run_jobs(cycle_id, limit)` RPC utilise `for update skip locked` côté Postgres → N workers tirent sans coordination

## Identité visuelle

> **La source de vérité visuelle est `.ui/README.md`** (DA Claude Design v1, mai 2026). Override sur l'ancien bloc « moderne, audacieux, confiant + dark mode + vermillon » qui était spéculatif.

Résumé pour mémoire (consulter `.ui/` pour les détails) :
- **Mode** : light par défaut (bone `#F2EEE6` / ink `#14120E`). Theme dark documenté mais hors V0.
- **Accent** : ember `#C2410C` (le seul accent ambient). Italic display = ember.
- **Palette sémantique secondaire** : sage `#3F7D4F` (rang #1), crimson `#B23A3A`, azure `#2A5FA8`, amber `#D69E2E`.
- **Typo** : Instrument Serif (display, italic 0;1) + Geist (UI, 300/400/500/600) + JetBrains Mono (scores, rangs, commandes).
- **Coins** : carrés partout (`--radius: 0`).
- **Pas de** : gradients, glow, glassmorphism, soft shadows, blobs, emojis dans les titres.
- **Layout éditorial** : grid `180px 1fr` (FigureNumber colonne gauche, contenu colonne droite). Section padding `120px 64px`.

## Conventions de code

- **JavaScript** (`.js` / `.jsx`). Pas de TypeScript en V0.
- React Server Components par défaut. `"use client"` uniquement si interactivité nécessaire.
- Tailwind v4 avec `@theme inline` dans `src/app/globals.css`. Pas de `tailwind.config.js`.
- Composants sous 200 lignes. Splitter au-delà.
- Server Actions pour les mutations ; jamais d'écritures DB via API routes pour les actions user-triggered.
- Validation `zod` pour toutes les données externes (forms, réponses API, env vars).
- Filenames : `kebab-case.jsx`. Composants : `PascalCase`. Hooks : `useCamelCase`.
- Pas d'abréviations sauf universelles (id, url, db).
- Routes qui fetchent : `loading.js` et `error.js` obligatoires.

## Structure du projet

Single-package à la racine (pas monorepo). Le moteur Python sera dans un repo sibling.

```
versuz/
├── src/
│   ├── app/                 # App Router pages (.js)
│   ├── components/
│   │   ├── brand/           # marques, eyebrow, figure-number, …
│   │   ├── site/            # VzNav, VzTicker, VzFooter
│   │   └── *.jsx            # rank-badge, hair-bar, skill-row, …
│   └── lib/
│       ├── fixtures/        # données V0 (.ui/data.jsx ported)
│       ├── queries/         # accès données serveur (Supabase ↔ fixtures)
│       └── supabase/        # clients @supabase/ssr
├── supabase/migrations/     # SQL timestampé
├── scripts/
│   ├── seed.mjs              # push fixtures → Supabase
│   ├── scrape/               # SKILL.md scraper (github + parse + classify + bundle detection)
│   ├── scrape-claude-md/     # CLAUDE.md scraper (+ project-type classifier)
│   └── bench/                # moteur de notation (cache, queue, runner, judge, aggregate)
├── supabase/migrations/      # 0001_init.sql + 0002_claude_md_and_bench.sql
├── .ui/                      # DA Claude Design (référence, pas shippé)
├── public/                   # assets statiques (white-vz.svg, white-vz-v.svg)
├── AGENTS.md                 # convention Next 16 — briefe les agents AI sur les breaking changes
├── CONTEXT.md                # ce fichier
├── CLAUDE.md                 # règles de travail (pointer court vers CONTEXT.md)
├── TODO.md                   # liste des tâches
└── README.md
```

## Routes web

**Public**
- `/` — landing
- `/marketplace` — directory complet avec filtres client-side (toggle Skills/CLAUDE.md, filter cat/tier/trust/sort, grid de MarketplaceCard)
- `/leaderboard` — vue ranked (toggle + category cards → deep pages avec rankings une fois le judging actif)
- `/standings` → redirect vers `/leaderboard`
- `/standings/[category]` — top skills d'une catégorie (vue rank-focused)
- `/claude-md` → redirect vers `/leaderboard?type=claude-md`
- `/claude-md/[category]` — top CLAUDE.md d'un project-type
- `/skills/[slug]` — détail d'un skill (stats + 3 judges + history + rivalries + tier badges)
- `/methodology` — méthodo détaillée
- `/about` — pitch, founder, roadmap
- `/status` — health du système (infra + judges + cycle)

**Auth + Submit + Claim**
- `/login` + `/register` + `/profile` — Supabase Auth + GitHub OAuth, profile dashboard avec stats + bar chart + sparkline
- `/auth/callback` — OAuth redirect handler
- `/submit` — picker (Skill ou CLAUDE.md)
- `/submit/skill` + `/submit/claude-md` — forms 2-tabs (URL GitHub ou content paste), DB write réel + auto-claim si owner GitHub match
- `/claim/[kind]/[slug]` — standalone claim avec vérif live GitHub API

**Open data + creator**
- `/feed` — index humain-readable des RSS feeds
- `/feed/skills` + `/feed/claude-md` — RSS 2.0 XML par catégorie (`?category=`)
- `/api/v1/skills` + `/api/v1/claude-md` — JSON read-only, paginé, filtré
- `/api/v1/skills/[slug]` + `/api/v1/claude-md/[slug]` — single item
- `/badge/[kind]/[slug]` — SVG embed badge (420×62, 4-color top stripe, single SCORE column right, tier dot). V1.6 : query params `?show=score|elo|prior|rank` + `?style=default|terminal`
- `/badge/author/[login]` (V1.6) — author tier badge (newcomer → veteran)
- `/badge/category/[cat]?kind=skill|claude_md` (V1.6) — leaderboard badge per category
- `/api/og/upset` (V1.6) — 1200×630 social card "Today's Upset"
- `/best/[kind]` (V1.7) — index page listant les catégories rankables, kind ∈ {skill, claude-md}. Catch les visiteurs qui tapent `/best/skill` sans catégorie.
- `/best/[kind]/[category]` — SEO long-tail "Best X skill" : top 10 + FAQ + JSON-LD ItemList. Sitemap priority 0.8.
- `/api/search?q=` — backing pour le Cmd+K search modal
- `/api/subscribe` — newsletter footer email POST
- `/api/cron/bench` + `/api/cron/refresh-rankings` — Vercel crons (gated par `CRON_SECRET`)
- `/sitemap.xml` + `/robots.txt`

**Marketplace transactionnel (V1.5)**
- `/profile/settings` — Stripe Connect Express onboarding seller
- `/profile/earnings` — gross/net/fees + recent sales table + diagnostic panel
- `/buy/[kind]/[slug]` — preview + Stripe checkout (split 70/30 destination_charges)
- `/buy/[kind]/[slug]/success` — receipt + access link
- `/promote/[kind]/[slug]` — boost flat $4.99/30j (pure Versuz revenue, caps 365j + rate limit)
- `/promote/[kind]/[slug]/success`
- `/api/webhooks/stripe` — handle `checkout.session.completed`, `account.updated`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.{created,closed}`. Bail-early sur events non gérés (balance.available, etc.)

**Admin** (gated par `ADMIN_GITHUB_IDS` ou `ADMIN_GITHUB_LOGINS`)
- `/admin` — overview compteurs (skills, claude_md, pending proposals, live tasks)
- `/admin/task-proposals` — approve/reject/promote tasks générées par Gemini Flash
- `/admin/skills` + `/admin/claude-md` — éditer verification_level, tier, delete
- `/admin/content-drafts` (V1.6) — pipeline éditorial "Today's Upset" : preview cards 1200×630, copy URL, download PNG (alimenté par `getRecentUpsets()` via `rank_history`)

**Marketplace vs Leaderboard — distinction**
- **Marketplace** = directory pour browser et filtrer (l'expérience principale en V0, parce que le judging n'est pas encore actif)
- **Leaderboard** = vue ranked (active dès que le bench engine produit des Elo)
- Les deux pointent vers les mêmes deep pages (`/skills/[slug]`, `/claude-md/[category]/[slug]`)

## Scripts npm

- `npm run dev` / `build` / `start` / `lint` / `format` (le `dev` et `start` lancent Node avec `--max-http-header-size=32768` pour éviter les 431 sur les cookies Supabase JWT)
- `npm run seed` — push fixtures vers Supabase
- `npm run scrape:skills` / `scrape:claude-md` — scrape avec concurrency 6, repo-meta cache, `--force-update`, `--max-pages=N`, `--category=X`, `--dry-run`. Backoff 403/422/429. **Multi-token rotation** via `GITHUB_TOKENS=t1,t2,t3` (cf. [scripts/_github-tokens.mjs](./scripts/_github-tokens.mjs)).
- `npm run scrape:aggregators` — 14 awesome-* + 8 GitHub Topics, batch upsert tous les **5** (configurable via `SCRAPE_BATCH_SIZE`), Ctrl+C-safe, auto-purge content dups en fin de run
- `npm run scrape:codesearch` — **Sourcegraph public API** adapter
  ([scripts/scrape-codesearch/](./scripts/scrape-codesearch/)). Stream SSE,
  cap 1000 matches/query, dedup + filter known + raw.githubusercontent.com
  content (UNMETERED). **3-5× la capacité de discovery** vs GitHub Code Search
  seul (qui plafonne 1000 par query aussi mais beaucoup plus rate-limité).
  grep.app adapter présent mais blocked par Vercel anti-bot (cf. TODO).
- `npm run scrape:all` — skills + claude-md + aggregators + codesearch dans cet ordre (commande unique)
- `node scripts/bench/quality-judge.mjs` — single-LLM rate 5 axes (default Groq Llama 4 Scout free), `--provider=groq|google|openrouter`, `--limit=N`, `--rejudge`, `--kind=skill|claude_md`
- `npm run bench:smoke` — judge ensemble health check
- `npm run bench:agent-smoke` — fake skill × fake task end-to-end (sans Supabase)
- `npm run bench:seed-tasks` — load `built-in-tasks.json` dans `tasks` (102 tasks hand-craftées)
- `npm run bench:enqueue` — créer cycle + queue jobs (cartesian product)
- `npm run bench` — claim + run + judge + refresh_rankings (resume cycle queued FIFO)
- `npm run generate-tasks` — Gemini Flash drafts new task_proposals → `/admin/task-proposals`
- **`npm run pipeline:full`** — batch complet : scrape exhaustif (169 niches) → quality → bench. Une nuit/week-end pour maximiser la découverte.
- **`npm run pipeline:hot`** — vagues rapides 5 items : scrape → quality → bench par lots. ~8 min/vague, résultats live rapidement. Options : `--wave-size=N`, `--min-stars=0`, `--vagues=N`
- **`node scripts/bench/post-cycle-hooks.mjs`** (V1.6) — à lancer après chaque cycle completed. Snapshot `rank_history`, insert achievements (Triple Crown / category_winner / first_blood), update streak counters. Idempotent (unique partial indexes sur `item_achievements`). Args : `--cycle=<id>` ou `--dry-run`.

> Note PowerShell : `npm run X -- --flag` est cassé sur Windows. Lancer via `node scripts/bench/X.mjs --flag=...`.

## Position du fondateur

Solo build par Toma (FlukX Studio). 21 ans, basé en France, expertise design + dev fullstack + automatisation EdTech (PST&B / Galileo). Objectif V0 : ship en 6 semaines à partir du démarrage. Ce projet vise les 3 priorités simultanées : générer du cash en solo (Premium 30/70, Boost $4.99/30j, Featured 100%, Pro Author $9/mo), apprendre l'IA en profondeur (LLM-as-judge, benchmarking, distributed systems), et construire un truc public dont je suis fier.

## Contraintes

- ~~**Pas d'auth en V0**~~ → Supabase Auth + GitHub OAuth shippés (V0.5 mai 2026)
- ~~**Pas de paiements en V0**~~ → Stripe Connect Express + destination charges + webhook
  + premium downloads + boost shippés en test mode (V1.5 mai 2026). Live mode pending domain.
- ~~**Pas d'analytics tant que la prod n'est pas live** — PostHog reste désinstallé.~~ → PostHog wired V1.7 (provider EU instance, pageview manuel via App Router).
- **Ne PAS ajouter sans demander** : redux, zustand, axios, moment, date-fns (utiliser Intl natif), styled-components, MUI, Chakra. (framer-motion est installé pour les reveal/parallax — OK pour le hero.)
- Chaque décision se justifie contre la question : "est-ce V0 ?"

### Update 11 mai 2026 — Rubric v4 + live pipeline + auto-queue submit

- **Rubric v4 aligned FLASK/JudgeBench/HELM** (après audit Perplexity) : 5 axes
  `instruction_following`/`correctness`/`completeness`/`usefulness`/`safety`
  (poids 0.35/0.30/0.20/0.10/0.05), 7 hard penalty rules + internal consistency
  rule + anti-inflation guardrails. Score cap retiré, length-bias neutrality.
  Migration 0029 recrée les RPCs `axes_by_subject` + `judge_disagreement` en
  SECURITY DEFINER (bypass RLS sur run_jobs/judge_scores).
- **DB reset complet** : tout judge_scores/run_jobs/cycles wipés, repart de
  zéro avec le nouveau rubric. ~2363 skills + 2835 CLAUDE.md indexed maintenant
  (post scrape aggregators 11 mai). Cycle 9 (skills.document) terminé : 47-51
  scores par judge, mean ensemble ~55, distribution Haiku 43/DeepSeek 61/GPT 58.
- **Prompt caching actif** : marker `===== END SYSTEM RUBRIC =====` dans le
  prompt pour que OpenRouter cache la partie statique (rubric ~1500 tokens) via
  `cache_control: ephemeral`. Cache stats loggées en fin de run.
- **Live pipeline** :
  - Scrapers flush par batch (1 pour aggregators, 5 pour les autres) → items
    apparaissent sur /marketplace en quasi-temps réel pendant le scrape.
  - Bench refresh rankings tous les 25 outputs jugés (BENCH_REFRESH_EVERY) →
    items apparaissent sur /leaderboard pendant le run, pas après les 14h.
- **Auto-queue submit** (web + CLI) — migration 0030 `bench_pending boolean` :
  1. Upsert avec `bench_pending=true`
  2. `after()` background fire `judgeQualityInline` (Groq free, ~3s) → quality
     score rempli sans bloquer la response
  3. Prochain bench `loadSubjects` ORDER BY `bench_pending DESC` → items
     submitted passent en premier
  4. Cycle end → sweep `UPDATE bench_pending=false` sur les judgés
- **Admin /admin/cycles refresh** : funnel (Raw/Quality/Benched/Pending) + cycle
  progress segmentée + ETA agent+judge wall-time + judge histograms SVG per
  model. Auto-refresh 15s pendant running cycle. SVG icons inline (pas
  d'emoji).
- **Leaderboard table refresh** : LMArena-style avec axes columns triables,
  search bar inline, stats strip (mean/median/stdev/top + histogramme
  distribution), composite score = weighted axes (décimales fines anti-tie).
- **+5 awesome lists + 16 GitHub topics** ajoutés : continuedev/awesome-rules,
  PatrickJS/awesome-cursorrules, SchneiderSam/awesome-windsurfrules,
  obviousworks/vibe-coding-ai-rules, raoufchebri/awesome-mcp, tairov/
  awesome-agents.md · topics model-context-protocol, mcp, cursor-rules,
  windsurf, continue-dev, coding-agent, ai-agents, agentic-coding, vibe-coding,
  prompt-engineering, prompt-library, system-prompt, llm-tools, roo-code,
  cline, codex.
- **Scraper bugs fixés** : (1) raw fetch teste maintenant `default_branch`
  de l'API GitHub avant main/master → fini les 404 sur les monorepos
  (openclaw/skills etc.) · (2) upsert tolérant le conflict `github_url`
  (retry avec onConflict: github_url si slug-conflict échoue avec 23505).

### État au 14 mai 2026 (V1.5 launch-ready — Supabase recovered + filters polished + GH Actions configured)

- **48 migrations Supabase** appliquées (0001 → 0048). Toutes en prod via MCP supabase :
  - 0037 marketplace indexes (composite + GIN topics + trigram — **drops appliqués** sur les 5 trigram saturants)
  - 0038 license_spdx (60213 items backfilled via GitHub API)
  - 0039 description_hash (near-dup detection)
  - 0040 multi_category (`categories jsonb`)
  - 0041 archive flag (221 hard-deleted dedup near-dups)
  - 0042 content_storage (`content_path` → Storage bucket public)
  - 0043 RLS perf wrap `auth.uid()` → `(select auth.uid())`
  - 0044 `is_bundled` generated col
  - 0045 widen category check (writing/design/marketing/automation/research)
  - 0046 `repo_skill_count` denormalized + index
  - 0047 widen category check v2 (api-integration/macos/communication/media/testing/devops)
  - 0048 `byte_count` generated col (extracted from metadata.byte_count, indexed)
- **DB size** : 776 MB → **~228 MB** (sous Free tier 500 MB) après offload R2 + cleanup. Pro tier upgrade temporaire pour la migration → downgrade Free ready.
- **Storage migration vers Cloudflare R2 (mai 2026)** : 103,572 .md files (1.1 GB) déplacés depuis Supabase Storage bucket `content` → R2 bucket `versuz-content` (`https://cdn.versuz.dev`). Path shape inchangé (`skills/<slug>.md` / `claude-md/<slug>.md`) → DB `content_path` column zéro modif. Supabase Storage bucket `content` wipé clean. Premium-content reste sur Supabase (signed URLs, tiny). Dispatch dual-backend via env `R2_PUBLIC_URL` ([src/lib/content/storage.js](./src/lib/content/storage.js) pour Next.js + [scripts/_storage.mjs](./scripts/_storage.mjs) pour Node scripts). R2 usage ~856 MB / 10 GB free (zero egress fees). Coût steady-state $0/mois.
- **Classifier v4** (`scripts/scrape/classify.mjs`) : 27 buckets total. Reclassify-all a bougé 11762 skills depuis "other" → buckets spécifiques (`other` passé de ~40k à ~30k).
- **Filters server-side complets** : Bundle (mig 0044+0046), Tokens (mig 0048 byte_count), Source (ILIKE patterns + dynamic `getAvailableSources()`), Category (multi-cat via `categories @>`), tier/verified/official/quality/topics (déjà server). Plus de count drift entre header et grid.
- **License badges** : crimson border pour copyleft GPL/AGPL/LGPL (1215 items), gris muted pour permissive MIT/Apache/BSD (54k+).
- **Bundle distinction** : `is_bundled` (skill_type='bundled', 1241) vs `repo_skill_count > 1` (multi-skill repo, ~89k). Filter "Bundle" union des 2 = 90927. "Single" = strict 2680.
- **Featured cards** : 2-cell grid span (`gridColumn: span 2`) quand `tier='featured'`. Auto-flow dense pour pas de holes.
- **Stripe LIVE config complete** : Platform profile validé, Connect Express activé, branding ember, webhook LIVE avec 3 events. Code 100% compatible — bascule LIVE = push env vars + redeploy.
- **OG image** : `public/og-images.png` (1200×630) câblée dans `layout.js`. Detail pages skills + claude_md gardent leur dynamique opengraph-image.js.
- **Resend** : envoie depuis `Versuz <hello@versuz.dev>` avec `reply_to: contact@flukxstudio.fr` → réponses arrivent dans l'inbox flukx perso, branding professionnel côté inbound.
- **CHANGELOG.md migré en anglais** + `/changelog` page in-app translated.
- **Submit flows** : skill et claude_md tolèrent locale FR (4,99 → 4.99), step="0.01".
- **Admin featured bug** : fix `defaultValue` stale via `key={...}` sur form re-mount post-revalidate.
- **GitHub Actions** (3 workflows) : scrape-daily (02:00 UTC, max 1000), quality-judge (every 4h, Groq free, $0), bench-runner (daily 03:00 UTC, $1/run, monthly cap $25 via `cycles.actual_cost_usd` mig 0049).
- **Pack ads vidéo** : 7 scènes shippables via `npm run ads:export` (Playwright + ffmpeg).

### État au 11 mai 2026 (V1.5 + UX overhaul + premium gating + judges or-v1 + CLI/MCP beta)

- **22 migrations Supabase** appliquées (0017 partial · 0018 'other' bucket ·
  0019 quality_score columns · 0020 content_hash SHA-256 dedup · **0021
  is_official** · **0022 cli_submissions anti-spam tracker**)
- **Bench data resetée** (0 judge_scores, 0 run_outputs, 0 run_jobs)
  → leaderboard vide, prêt pour bench cycles propres. **~440 skills + ~800
  CLAUDE.md** (post multi-token scrape, content-hash dedup, word_count
  filter). Cycles 1-3 gardés en historique. **~410 items quality-judged**
  (32% du registry → tournera autour de 80% après une passe complète).
- **Quality scoring v3** : ~200 items déjà LLM-judged (mean 67/100, target
  N(65, 12)) via Groq Llama 4 Scout free. Rubric force `weaknesses` + 6
  penalty rules avant scores (CoT JSON-ordered). Affiché sur detail pages
  (Field "Quality" + strip rationale italique azure) et MarketplaceCard
  fallback quand pas de Elo. Cron `/api/cron/quality-judge` toutes les 6h.
- **Content-hash dedup automatique** : SHA-256 hex sur chaque row
  (skills.content_hash + claude_md_files.content_hash, indexed). Auto-purge
  branchée en queue de chaque scrape (garde stars max). Plus jamais besoin
  de SQL manuel pour cleanup.
- **Aggregator scraper** : 14 awesome-* sources + 8 GitHub Topics
  (claude-code, claude-skill, mcp-server, etc.) en complément de GitHub
  Code Search. Per-source `kinds` hint (anthropics/skills → skill-only),
  single `listRepoRoot` call (skip 50% des 404s), batch upsert tous les 20
  + SIGINT trap pour Ctrl+C-safe. Backoff 403/422/429.
- **Onboarding modal** sur premier `/profile` (3 slides : Browse / Earn /
  Trust), localStorage persist, accent color différent par étape.
- **Copy-content button** corner-stamp top-right des `<pre>` content sur
  detail pages (✓ Copied feedback 1.6s).
- **Premium content gating** (CRITICAL FIX 11 mai) — SKILL.md / CLAUDE.md
  content paywallé : teaser 500-char + masque gradient + CTA Buy $X pour
  `tier=premium && !owned && !authored`. Plus de fuite du contenu.
- **Judge mode default flipped** to `or-v1` — landing page affiche
  Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini partout. DeepSeek-direct routing
  confirmed (provider used : DeepSeek), prompt cache hit from call 2.
  Set `BENCH_MODE=dev` en env pour fallback Groq Llama gratuit.
- **Marketplace UX overhaul** :
  - Filters compactés sous bouton **Refine ▾** collapsible (Tier/Trust/
    Quality/Tokens/Sort tous inside, Categories pills toujours visibles)
  - Search inline dans stats row · Topics row supprimée
  - Sponsored = **3 par page aux 3 zones fixes** (top/middle/bottom-not-
    glued), daily-stable shuffle. Plus de pinning entassé page 1
  - Sponsored cards = 2-col span horizontal (même hauteur, 2x larges)
  - `gridAutoFlow: dense` + `auto-fit` → fini les trous de fin de page
  - Tokens partout (au lieu de words), `word_count × 1.3`
  - DB query `liveClaudeMds` filter `word_count >= 40` → false positives
    (3-token marker files) hidden
- **PageHero `compact` prop** sur 9 utility pages → padding + title
  réduits de ~50%, éditorial pages gardent le hero plein.
- Stripe Connect end-to-end validé en test mode : checkout → webhook → DB →
  earnings, refund testé, seller dispute UI shippé.
- Marketplace UI : Buy / Owned / Yours / Boosted / TopN badges (TopN cachés
  tant qu'aucun ranking). **Compare picker** : checkbox corner-stamp + floating
  bar via portal.
- Topics filter : reduced to count > 1, cap 12 (anti-noise).
- Mobile responsive complet : nav hamburger drawer (portal escape sticky
  stacking), small mark logo, hero decorations cachées, padding clamp().
- Resend SMTP : welcome email subscribe + branded purchase receipt avec
  download signed URL.
- **6 crons Vercel** : bench daily, refresh-rankings every 15min,
  sweep-stuck-jobs 6h, refresh-stripe-accounts 6h, weekly-digest Friday,
  **quality-judge every 6h** (LLM-rate 50 unjudged items per run).
- Cost guardrail mid-run : bench halt si `BENCH_BUDGET_USD` exceeded,
  cycle marqué `'partial'`, `/admin/cycles` bouton "Continue cycle →".
- **Profile public** `/u/[login]` (stat grid + listings) linkable depuis
  /buy "seller: @login".
- **Bulk admin** sur /admin/skills + /admin/claude-md (checkbox + 6 actions),
  **/admin/subscribers** RGPD-aware (Unsub audit-trail + Erase right-to-be-forgotten + CSV export).
- **Drag-drop upload** premium file (PremiumDropZone via DataTransfer).
- **Empty state leaderboard** éditorial "Bench is warming up" + 3 CTAs.
- Pages docs : `docs/stripe-go-live.md`, `docs/domain-go-live.md`,
  **`docs/cli-mcp-go-live.md`** (CLI + MCP publish checklist).
- **Official badge** (migration 0021) : pill ✓ azure carré 18×18 à droite du
  TierBadge, auto-flagged au scrape via whitelist
  `src/lib/official-orgs.js` (anthropics, google, openai, vercel, etc.).
  Filtrable dans Refine. Independent de la trust ladder.
- **CLI** [cli/](./cli) — `npx versuz` (v0.1.0 beta, defaults localhost).
  Interactive prompts · figlet ANSI Shadow logo · cli-table3 colorisé ·
  6 commands : list/search/info/install/login/whoami/logout/submit.
  Auth GitHub PAT pour submit (stocké `~/.versuz/auth.json` chmod 600).
- **MCP server** [mcp-server/](./mcp-server) — `@versuz/mcp` (v0.1.0 beta).
  5 tools pour Claude Code : versuz_search · versuz_list_skills ·
  versuz_list_claude_md · versuz_get · versuz_install.
- **Submit API** [src/app/api/v1/submit/route.js](./src/app/api/v1/submit/route.js)
  + [src/app/api/v1/auth/whoami/route.js](./src/app/api/v1/auth/whoami/route.js) —
  POST /api/v1/submit gate par 8 couches anti-spam : auth PAT vérifiée via
  `/user`, **owner-or-org-member only** via `/orgs/X/members/Y`, rate limit
  5/h/user (table `cli_submissions`), dedup URL 24h, regex github.com strict,
  size cap 200 KB, free tier hardcoded, audit trail complet.
- **Multi-token scraping** [scripts/_github-tokens.mjs](./scripts/_github-tokens.mjs) —
  N Octokit instances + Proxy round-robin. Config `GITHUB_TOKENS=t1,t2,t3`.
  BATCH_SIZE défaut **5** pour visibilité quasi-temps réel.
- **Real-time KPI landing** — `/api/stats` endpoint + `<LiveStatsGrid>`
  client poll 8s · CountUp anime entre les valeurs · dot pulse 1s sur update.
- **Footer Tools column** + landing **§ Install section** + about
  **§ 02 Tools** (Founder section retirée) — montre CLI + MCP avec badge
  BETA, exemples code, lien GitHub.
- **Prior v2** — quality_score (signal le plus fort, ±200 sur 50) + is_official
  (+120) intégrés. Trust ladder progressive (lvl 2/3/4 = +60/+100/+150).
  Range élargie 900-2100, médiane ~1280 (vs plafonné 1480 avant).

### Ce qui est auto post-deploy

- ✅ **Webhooks Stripe** : checkout, refund, dispute, account.updated, promote
- ✅ **Crons** : refresh-rankings (15min), sweep-stuck-jobs (6h), refresh-stripe-accounts (6h), weekly-digest (vendredi)
- ✅ **Bench enqueue** : daily 04:00 UTC enqueue un cycle pour `skills.document` (1 scope/jour)
- ✅ **Newsletter signup** : POST /api/subscribe → DB + welcome email Resend
- ⚠ **Bench RUNNER** : encore manuel (`npm run bench`). Le cron enqueue, faut un worker pour exécuter.
- ⚠ **Scraping** : encore manuel (`npm run scrape:skills` / `scrape:claude-md`). Pas de cron weekly setup.
- ⚠ **Bench rotation entre catégories** : seul `skills.document` est dans le cron — les 13 autres scopes (5 skills + 8 claude-md) doivent être rotated manually OR il faut un dispatcher.

→ Tous ces "manuels" deviendront auto plus tard avec un worker / cron supplémentaires (parqué post-launch).

### Reste essentiel (priorisé · 14 mai 2026 late)

**Tech infra** :
1. **Supabase downgrade Pro → Free** + refund ticket (DB stable @ ~281 MB, sous quota)
2. **Stripe identity verification finale** (1-5j Stripe side) → push env vars LIVE Vercel
3. **Domain DNS** Cloudflare → Vercel (A `76.76.21.21` + CNAME www, **proxy OFF** pour Let's Encrypt)
4. **Resend domain DNS** versuz.dev (SPF + DKIM + return-path MX + DMARC) chez Cloudflare
5. **GitHub Actions secrets** dans repo settings : NEXT_PUBLIC_SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY, SCRAPE_GITHUB_TOKENS, OPENROUTER_API_KEY, GROQ_API_KEY
6. **Vercel env vars production** : copier `.env.local` → Vercel scope Production
7. **`npm publish`** × 2 (cli + mcp-server, déjà bumpés vers `https://versuz.dev`)

**Optionnel V1.5** :
- Stripe Tax activation (volume EU)
- Hero trust signal row sous le headline
- Mobile hero CTA padding clamp()
- Multi-compare 4 items
- Trending rail "Hot this week"
- Submit flows → Storage direct (au lieu de skill_md_content inline)

Tout le reste est V2+ (real-time battles, dark theme, deterministic
pre-judge, multi-vertical scaling).

## Comment travailler avec une IA sur ce projet

Quand une IA (Claude, GPT, Cursor, etc.) bosse sur Versuz, elle doit :

1. Lire ce CONTEXT.md en premier, puis `AGENTS.md` (rappel Next 16)
2. Server components par défaut, `"use client"` uniquement si interactivité nécessaire
3. Ne jamais committer de secrets — utiliser `.env.local` (couvert par `.gitignore`)
4. Toute modif DB passe par une nouvelle migration timestampée dans `supabase/migrations/`
5. Pour les composants visuels, regarder `src/components/section.jsx` (Section / SectionHeader / PageHero) — pattern unifié, à réutiliser
6. En cas de doute sur le scope : demander "est-ce V0 ?"
7. PRs petites. Un changement logique par PR.
8. Si tu ne sais pas, demande avant de générer 500 lignes au pif.