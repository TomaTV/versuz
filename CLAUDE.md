# CLAUDE.md

This project's canonical context lives in [`CONTEXT.md`](./CONTEXT.md). Read
it first — it covers the mission, V0 scope, stack, schema, conventions,
folder layout, routes, and scripts.

The current task list lives in [`TODO.md`](./TODO.md). Don't add new ideas
without asking.

The visual direction is in [`.ui/README.md`](./.ui/README.md) (Claude
Design v1, May 2026). Light theme · bone background · ember accent ·
Instrument Serif display · square corners · no shadows. Tokens are mapped
to Tailwind v4 in `src/app/globals.css` via `@theme inline`.

## Heads-up — Next 16

`AGENTS.md` reminds agents that Next 16 has breaking changes vs training
data (`params` is async, `cookies()` is async, etc.). Consult
`node_modules/next/dist/docs/01-app/` before touching Next-specific APIs.

## Strategic posture (May 2026 · V1.5)

**Marketplace-first, judging-second.** Versuz is a directory of public
SKILL.md and CLAUDE.md, with progressive verification (5 levels) and a
3-tier commercial model (free / premium / featured). The bench engine is
fully wired (agent + judge + retry + rotation + circuit breaker).
Registry as of 11 May 2026 : **~440 skills + ~800 CLAUDE.md** (post
multi-token rotation scrape, content-hash dedup, word_count >= 40 stub
filter), no Elo yet (bench data reset 11 May, 0 judge_scores) but
**~410 items quality-judged** (LLM rates 5 axes, mean 67/100, target
N(65, 12)).

**CLI + MCP server shipped** (mai 2026, both v0.1.0 beta) :
[cli/](./cli) is a Node CLI (`npx versuz`) — interactive prompt-driven
browse / search / info / install + URL-only `versuz submit` gated by
GitHub PAT (login/whoami/logout). [mcp-server/](./mcp-server)
(`@versuz/mcp`) wraps the same 5 tools (search/list_skills/list_claude_md/
get/install) for Claude Code via `claude mcp add versuz npx -y @versuz/mcp`.
Both default to `http://localhost:3000`, override via `VERSUZ_API` env or
`--api=<url>` flag. Pre-launch checklist in
[docs/cli-mcp-go-live.md](./docs/cli-mcp-go-live.md) — 5 lines to bump
default URLs + 2 `npm publish` on the day `versuz.dev` resolves.

**Submit anti-abuse (CLI)** — 8 layers : GitHub PAT auth (verified via
`/user`) · **owner-or-org-member only** (verified via `/orgs/X/members/Y`)
· rate limit 5/h/github_user_id (table `cli_submissions`) · 24h URL dedup
· strict github.com regex · 200 KB size cap · free tier hardcoded · full
audit trail (success/duplicate/rejected/error). Submit nécessite une URL
GitHub — pas d'inline content (impossible de vérifier l'ownership sans repo).
Auto-verification level 1 d'office quand check passe. Source :
[src/app/api/v1/submit/route.js](./src/app/api/v1/submit/route.js).

**Official badge** (mai 2026, migration 0021) — pill carré 18×18 azure
filled avec ✓, à droite du TierBadge sur les cards/detail pages. Auto-flag
au scrape via whitelist [src/lib/official-orgs.js](./src/lib/official-orgs.js)
(~30 orgs : anthropics, google, openai, vercel, stripe, supabase, etc.,
miroir SQL dans la migration pour le backfill). Filtrable dans Refine
panel ("Official only"). Indépendant de la trust ladder — un item peut être
both featured ET official.

**Topics filter in Refine** + **active-filter chips row** — composant
`<TopicAdder>` discret (input + HTML datalist autocomplete sur top topics
du source courant). Chips row au-dessus du grid affiche tous les filtres
actifs (topics, official, trust, tier, quality, tokens) avec × pour
remove individuel → feedback visuel quand un filtre vient d'une URL
(`/marketplace?topics=mcp&official=true`).

**Real-time KPI on landing** — [src/components/live-stats-grid.jsx](./src/components/live-stats-grid.jsx)
poll `/api/stats` toutes les 8s, anime les counts via CountUp, dot ember
pulse 1s quand un chiffre bouge. SSR initial avec `getIndexCounts()` (single
`SELECT COUNT(*)`, ~5ms), page `force-dynamic + revalidate=0` → fresh à
chaque load + auto-update sans refresh. Skill/claude_md topics splittés
en 2 sections distinctes sur landing avec counts exacts par kind.

**Multi-token scraping (Proxy round-robin)** — [scripts/_github-tokens.mjs](./scripts/_github-tokens.mjs)
crée N Octokit instances (une par PAT) + Proxy qui rotate à chaque
top-level access. Vraie rotation cette fois (l'ancien hook before-request
était écrasé par auth-token strategy). 3 tokens = 15k req/h core + 90 req/min
code-search. Config `GITHUB_TOKENS=t1,t2,t3` dans `.env.local`. BATCH_SIZE
défaut 20 → **5** pour voir le scrape progresser quasi-temps réel.

**Prior v3** (mai 2026, [src/lib/utils.js](./src/lib/utils.js)) — quality-first
algo. Si scoré (LLM 5-axis 0-100), base = `600 + quality × 15` (range 600-2100,
quality DOMINE). Sinon base 1100. Social signals deviennent des ajustements :
stars cap 200, forks cap 120, license +20, recency tier (+40/+20/-60/-100),
trust ladder (+20/+50/+80/+120), official +80. **Per-repo dampening** :
contributions sociales × 1/sqrt(N) où N = nombre de skills/CLAUDE.md du même
repo. Empêche un mega-repo (facebook/react 244k★ avec 20 SKILL.md) de
flooder les premières pages avec un prior identique. Computed via
`applyRepoSkillCount()` dans [rankings.js](./src/lib/queries/rankings.js).

**Diversity sort marketplace** — quand `sort=prior` (default), un interleave
post-sort limite à 2 items consécutifs du même owner. Items du même owner
sont défer'd → repris quand un autre owner pop. Ordre relatif global préservé
(top priors d'abord), mais plus de "20 facebook skills puis 20 microsoft" en
page 1. Code dans
[marketplace-grid.jsx](./src/components/marketplace/marketplace-grid.jsx) `filtered` useMemo.

**Default judge mode `or-v1`** (mai 2026) : landing page +
all "we use 3 judges" copy display **Claude Haiku 4.5 + DeepSeek V4 Flash +
GPT-5 mini** via OpenRouter (premium ensemble, ~$2.60/jour for 100 skills).
DeepSeek V4 Flash replaced V3 in or-v1 — 2× cheaper input ($0.14/M vs $0.32/M)
+ DeepSeek-direct routing on OR enables prompt cache (cache_read $0.0028/M).
Set `BENCH_MODE=dev` in `.env.local` for free Groq Llama trio if no OR key.

**Stripe Connect Express** validated end-to-end in test mode (10 May 2026) :
checkout → webhook → DB → earnings dashboard. Refund + dispute handlers
wired and validated. Domain not yet acquired → live mode pending. See
[docs/stripe-go-live.md](./docs/stripe-go-live.md) +
[docs/domain-go-live.md](./docs/domain-go-live.md).

**Resend SMTP** wired for branded emails ([src/lib/resend.js](./src/lib/resend.js)) :
welcome email on newsletter signup, branded purchase receipt with download
link on `checkout.session.completed`. Skips silently if `RESEND_API_KEY`
unset (best-effort, never blocks the user flow).

**Mobile responsive** : nav has hamburger menu drawer (rendered via portal
to escape sticky header stacking context), small mark logo on < 1024px,
all user actions consolidated inside the drawer. Hero decorations hidden
< 768px. Section + PageHero use `clamp()` padding (16px → 64px horizontal).

**Compare picker** ([src/components/marketplace/marketplace-grid.jsx](./src/components/marketplace/marketplace-grid.jsx)) :
checkbox stamp en corner top-left de chaque MarketplaceCard (visible au
hover, toujours visible si checked, toujours visible sur touch via
`@media (hover: none)`). Floating compare bar via portal (z 9998), animation
slide-up, click "Compare →" envoie sur `/compare?a=X&b=Y&kind=...`. Auto-detect
kind sur la page compare (try skill puis fallback claude_md), erreur claire
si kind mismatch.

**Topics filter** : limité aux topics avec count > 1 (cap 12 max) pour
éviter le bruit des singletons. Topics sélectionnés restent visibles même
sous le seuil.

**Cycles partial + continue** : si `BENCH_BUDGET_USD` est dépassé mid-run,
le cycle est marqué `'partial'` (migration 0017). `/admin/cycles` montre un
bouton "Continue cycle →" qui flip back à `'queued'` ; bump le budget puis
re-lance `npm run bench` pour reprendre.

**Crons additionnels** ([vercel.json](./vercel.json)) :
- `/api/cron/refresh-stripe-accounts` toutes les 6h — backup webhook
  `account.updated`, drift detection sur stripe_charges_enabled, etc.
- `/api/cron/weekly-digest` vendredi 9h UTC — top 5 skills + top 5 CLAUDE.md
  via Resend à tous les `subscribers` non-désabonnés.

**Profile public** `/u/[login]` ([src/app/u/[login]/page.js](./src/app/u/[login]/page.js)) :
stat grid + bio + GitHub link + listings skills + claude_md du seller.
Linkable depuis `/buy/[kind]/[slug]` "seller: @login".

**Admin operations** ([src/components/admin/registry-admin-table.jsx](./src/components/admin/registry-admin-table.jsx)) :
client component avec checkbox per row + dropdown bulk action (verify lvl 2/3/4,
unverify, tier-free, delete). `bulkSubjectAction(kind, action, slugs[])` server
action. `/admin/subscribers` page : list + Unsub (RGPD audit-trail) + Erase
(right-to-be-forgotten) + CSV export inline. Lien dans la nav admin.

**Drag-drop premium upload** ([src/components/submit/submit-form.jsx](./src/components/submit/submit-form.jsx)
`<PremiumDropZone>`) : dropzone avec hover state + click-to-pick fallback +
keyboard accessible. Sets file via `DataTransfer` API sur input hidden →
form submission native, pas de changement backend.

**Better empty state leaderboard** : remplace "no completed cycles" muet par
hero éditorial "Bench is warming up" + 3 CTAs (marketplace / methodology / submit).

**Quality scoring v3** (11 mai 2026) — single-LLM rate sur 5 axes
(clarity / specificity / completeness / structure / usefulness, 0-100, avg
des 5). Default = **Groq Llama 4 Scout free** (1000 RPD, 30 RPM, ~500k TPD).
Switchable via env `QUALITY_JUDGE_PROVIDER` → `google` (Gemini Flash 1500 RPD)
ou `openrouter` (gpt-5-nano payant, no daily cap). Rubric v3 force le modèle
à émettre `weaknesses` et `applicable_penalty_rules` AVANT les scores (CoT
forcé via JSON schema order). 6 hard penalty rules (file <100 lines, refs
externes non bundlées, no code block, etc.) + règle anti-politesse explicite
pour CJK. Distribution réelle obtenue : mean 67, stdev 6-10. Affiché sur
detail pages (Field "Quality" + strip rationale italique azure) et sur
MarketplaceCard quand pas de Elo. Cron `/api/cron/quality-judge` toutes les
6h, limit 50/run. Migration `0019_quality_score.sql`.

**Content-hash dedup** (11 mai 2026, migration `0020_content_hash.sql`) —
SHA-256 hex du contenu brut SKILL.md / CLAUDE.md sur chaque row, indexé.
Détecte les copies verbatim entre repos différents (forks, templates,
copy-paste de classes scolaires entières). **Auto-purge** branché en queue
de chaque scrape via [scripts/_dedup.mjs](./scripts/_dedup.mjs) :
`purgeContentDuplicates(sb, table)` garde le row avec le plus de stars
(puis forks, puis id stable), delete le reste avec log clair. Scrapers
filtrent aussi les nouveaux dups au pre-upsert. Backfill historique 7 dups
nettoyés (5 forks d'un même devoir scolaire mlft9 + 2 paires hackathon).
Helper compute : [scripts/_hash.mjs](./scripts/_hash.mjs).

**Aggregator scraping** (11 mai 2026, [scripts/scrape-aggregators/](./scripts/scrape-aggregators/)) —
**14 awesome-* curated lists** + **8 GitHub Topics** (`claude-code`,
`claude-skill`, `mcp-server`, etc.) comme sources complémentaires à
GitHub Code Search (qui plafonne à 1000 résultats). Topic search a un
cap RPM 3x plus généreux (30 vs 10). Per-source `kinds` hint pour skip 50%
des 404s (anthropics/skills → skill-only, VoltAgent/awesome-claude-code-subagents
→ claude_md only). Single `listRepoRoot` call par candidat au lieu de 2
`getContent` aveugles. **Batch upsert** tous les 20 items + SIGINT trap qui
flush le batch courant avant exit (Ctrl+C-safe à tout moment). Backoff
auto sur 403/429 core API (read X-RateLimit-Reset). Sources dans
[scripts/scrape-aggregators/sources.mjs](./scripts/scrape-aggregators/sources.mjs).

**Onboarding modal** (11 mai 2026, [src/components/onboarding/onboarding-modal.jsx](./src/components/onboarding/onboarding-modal.jsx)) —
3-slide modal sur premier `/profile` (Browse / Earn / Trust). Persisté via
localStorage `versuz_onboarded_v1` (bump suffix pour re-onboarding global).
Portal vers document.body, ESC + arrow keys + click outside ferment, accent
color différent par étape (ember → azure → sage), progress bar 3-slot.

**Copy-content button** (11 mai 2026, [src/components/copy-content-button.jsx](./src/components/copy-content-button.jsx)) —
bouton corner-stamp top-right du `<pre>` content sur skill + claude_md
detail pages. Animation sage "✓ Copied" 1.6s puis revient à "Copy SKILL.md".
Reste visible pendant le scroll grâce au position absolute sur conteneur
relatif.

**Scraper hardening** (11 mai 2026) — backoff 403 + 422 (1000-result hard
ceiling) + 429 sur tous les scrapers. Sleep entre pages monté à 6.5s pour
respecter le 10 RPM code-search. Quality-judge a un retry 429-aware avec
parsing du hint "try again in Xs" envoyé par Groq.

**Marketplace UX V1.5** (11 mai 2026, [src/components/marketplace/marketplace-grid.jsx](./src/components/marketplace/marketplace-grid.jsx)) :
- **Filter compact** : Categories pills horizontaux + bouton **Refine ▾**
  collapsible qui contient Tier / Trust / Quality / **Tokens (Small/Medium/
  Large)** / **Sort** dropdowns. Sort viré de la stats row pour pas de
  doublon. Active count badge sur Refine (`Refine [3] ▾`).
- **Search bar inline** dans la stats row (320px max) au lieu de full-width.
  Topics row supprimée (low-signal).
- **Sponsored distribution** : 3 par page aux **3 zones fixes** (top
  positions 0-3 / middle 22-28 / bottom 38-44 not-glued). Daily-stable
  shuffle (seed = jour + page + slug) → différents items par jour mais
  stable mid-session. Plus de pinning entassé page 1.
- **Sponsored cards** : 2-col span horizontal (même hauteur que normales,
  juste 2x plus larges). Border distinctive : amber 2px (boosted) /
  sage 1.5px (featured) + diagonal corner ribbon "★ Boosted" pour
  boosted. `gridAutoFlow: dense` + `auto-fit` → fini les "trous" en fin
  de page.
- **Premium content gating** (CRITICAL FIX) — SKILL.md / CLAUDE.md content
  paywallé pour `tier=premium && !owned && !authored`. Teaser 500-char +
  masque gradient + CTA Buy $X. Plus de fuite du contenu via "Show content"
  button.
- **PageHero `compact` prop** sur 9 utility pages (profile/buy/promote/
  claim/status/profile-{settings,earnings,items}) — réduit padding +
  title size de ~50% (clamp 144→64px). Éditorial pages (marketplace,
  leaderboard, about, methodology, feed, submit, compare, /u/[login])
  gardent le hero plein.
- **Compact filter UI components** : `<CompactSelect>` helper inline-flex
  label + select, accent border quand non-default value.
- **Tokens display** (au lieu de words) — `word_count × 1.3` partout :
  cards, detail meta, OG image, compare table, page meta description.

**Rubric v4 (11 mai 2026)** — alignement FLASK / JudgeBench / HELM, après
audit Perplexity. 5 axes : `instruction_following` (0.35) · `correctness` (0.30)
· `completeness` (0.20) · `usefulness` (0.10) · `safety` (0.05). 7 hard
penalty rules (ajouts F hallucinations, G confiance non calibrée), internal
consistency rule (weakness listée → axe ≤ 80), anti-inflation guardrails
contre le "Style Outweighs Substance" bias. Score cap retiré (full 0-100
range). Length-bias neutrality block explicite dans le prompt.

**N=5 tasks/item — standard Versuz** (validé Perplexity, mai 2026) — sweet
spot statistique pour benchmark public de ranking : 3 judges × 5 tasks = 15
evals/item, CI95 ±6-7 pts, Spearman > 0.7 vs gold humain attendu. Coût
$0.025/item via or-v1 avec caching. N=3 trop instable (swaps re-run), N=6+
ROI décroissant. Default dans `scripts/bench/full.mjs`, override via `--tasks=N`. Migration
[0029_rubric_v4_axes.sql](./supabase/migrations/0029_rubric_v4_axes.sql)
recrée les RPCs `axes_by_subject` + `judge_disagreement` (SECURITY DEFINER
pour bypass RLS sur run_jobs/judge_scores). Migration
[0027_axes_rpc.sql](./supabase/migrations/0027_axes_rpc.sql) +
[0028_round_rankings.sql](./supabase/migrations/0028_round_rankings.sql)
(avg_score arrondi 2 décimales dans la matview).

**Prompt caching actif** ([scripts/bench/judge.mjs](./scripts/bench/judge.mjs)) —
prompt restructuré avec marker `===== END SYSTEM RUBRIC =====` pour que
OpenRouter envoie la partie cacheable (rubric ~1500 tokens identique pour
tous les pairs) en `cache_control: ephemeral` côté Anthropic + cache auto
côté DeepSeek + implicit côté OpenAI. Gain ~30-85% sur l'input judge cost
selon le hit rate. Cache stats loggées en fin de cycle (`prompt cache : X
read · Y created · hit rate Z%`).

**Live drip publishing** (11 mai 2026) — fini les "wait until end of run".
- Scrapers : batch=1 par défaut sur scrape-aggregators, batch=5 sur
  scrape-codesearch / scrape / scrape-claude-md. Items apparaissent sur
  /marketplace dans les secondes qui suivent l'upsert. Envs : SCRAPE_BATCH,
  SCRAPE_CS_BATCH, SCRAPE_BATCH_SIZE.
- Bench : refresh_rankings tous les N outputs jugés (default 25, env
  BENCH_REFRESH_EVERY). Items apparaissent sur /leaderboard pendant le run,
  pas après les 14h du cycle complet.

**Auto-queue submit** (11 mai 2026, migration
[0030_bench_pending.sql](./supabase/migrations/0030_bench_pending.sql)) —
quand un user submit via web ou CLI :
1. Upsert avec `bench_pending=true` flag (priority pour le prochain bench)
2. `after()` background : `judgeQualityInline` (Groq free) → quality_score
   rempli dans ~3s sans bloquer la response
3. Prochain `npm run bench` : `loadSubjects` ORDER BY bench_pending DESC,
   github_stars DESC → l'item est judgé en premier
4. Cycle complete sweep : `UPDATE bench_pending=false` sur tous les
   subjects judgés

Helper inline : [src/lib/quality/judge-inline.js](./src/lib/quality/judge-inline.js).
Wired dans [/api/v1/submit/route.js](./src/app/api/v1/submit/route.js) et
[src/lib/submit/actions.js](./src/lib/submit/actions.js).

**Admin /admin/cycles dashboard refresh** (11 mai 2026) — funnel + cycle
progress + judge histograms.
- § 00 Funnel : barre horizontale 56px avec segments Raw / Quality /
  Benched (couleurs crimson/amber/sage), labels inline avec valeurs + %.
  Per-kind coverage (Skills X/Y benched + CLAUDE.md X/Y benched) avec mini
  bar de progression. Bandeau pending separate si > 0.
- § 00b Running cycle : progress bar segmentée multicolore (completed/
  cached/errors), stats grid 5 colonnes, ETA réaliste (queued ×
  medianAgentMs + pendingOutputs × 6s wall time judges parallèles), phase
  label avec icône SVG (agenting/judging/finalizing).
- § 02 Judge stats : grid 3 cards (Anthropic / DeepSeek / OpenAI),
  histogramme SVG inline 10 buckets par judge, big avg + median + range,
  border-left coloré par famille de model.
- Auto-refresh client toutes les 15s pendant un cycle running (60s sinon)
  via `<AutoRefresh />` ([src/components/admin/auto-refresh.jsx](./src/components/admin/auto-refresh.jsx)).
  SVG icons inline (IconClock/IconHourglass/IconPhase/LiveDot) — pas
  d'emoji.

**Leaderboard table refresh** (11 mai 2026) — LMArena-style :
- Table layout : `# | Model | Co | Fo | Cp | Us | De | Score ↓`
  (axes full-name dans le header, abrégés dans les cells)
- Sort par axe ou score via boutons header, état client-side (pas de
  reload), URL preserve les filtres type/category
- Search bar instant (filtre name/author/slug/category)
- Stats strip : Ranked / Mean / Median / Stdev / Top + histogramme
  distribution (10 buckets color-coded)
- Mobile : `overflow-x: auto` avec `min-width: 880px` (scroll horizontal
  au lieu de squish)
- Composite score = weighted axes (mêmes poids que le rubric) — donne
  des décimales fines pour casser les ties (63.7 vs 63.2 plutôt que 63
  vs 63)

**14 awesome-* sources + 26 GitHub topics** (11 mai 2026) — ajout post-
Perplexity research :
- Awesome lists : `raoufchebri/awesome-mcp`, `continuedev/awesome-rules`,
  `PatrickJS/awesome-cursorrules`, `SchneiderSam/awesome-windsurfrules`,
  `obviousworks/vibe-coding-ai-rules`, `tairov/awesome-agents.md`
- Topics : `model-context-protocol`, `mcp`, `cursor-rules`, `windsurf`,
  `continue-dev`, `coding-agent`, `ai-agents`, `agentic-coding`,
  `vibe-coding`, `prompt-engineering`, `prompt-library`, `system-prompt`,
  `llm-tools`, `roo-code`, `cline`, `codex`
- Yield projeté : +3k-6k items au prochain `npm run scrape:aggregators`

## Two ranked entities

1. **Skills** (SKILL.md files, optionally bundled with sibling files)
   - Categories: `document`, `sql`, `data`, `web`, `shell`, `code`
2. **CLAUDE.md** files (project context for agents)
   - Categories: `nextjs`, `react`, `python-data`, `backend-api`,
     `mobile`, `devops`, `ml-training`, `generic`

Both surface in `/marketplace` (filtered grid, default browsing UX) and
`/leaderboard` (ranked view, active once bench engine produces scores).

## Three commercial tiers

- **Free** — scraped public, verified progressively (claimed → verified →
  reviewed → featured), $0
- **Premium** — author-listed, fixed price, Versuz takes 30% / author 70%
- **Featured** — Versuz first-party curation, 100% Versuz

### Premium download gating (V1.5, mai 2026)

Acheter un premium ne se limite plus au badge "Yours" — l'auteur uploade un
SKILL.md (ou bundle .zip) au submit qui atterrit dans le bucket privé
Supabase `premium-content`. Au `checkout.session.completed`, le webhook mint
une signed URL (TTL 7j) et la stocke sur la `purchases` row. La SkillDetail
re-mint une URL fraîche par render pour les owned/authored, ce qui couvre le
cas "le buyer revient une semaine après". Helper :
[src/lib/premium/storage.js](./src/lib/premium/storage.js). Migration :
[0015_premium_downloads.sql](./supabase/migrations/0015_premium_downloads.sql).
Les listings premium "legacy" (sans `private_storage_path`) restent en mode
badge-only — l'auteur peut re-submit pour ajouter un payload.

### Pay-to-promote / Boost (V1.5, mai 2026)

N'importe quel item (free OU premium) peut être boosté via un achat Stripe
flat **$4.99 / 30 jours**. Versuz garde 100% (pure ad placement, pas de
Connect split). Stacking additif : `promoted_until = max(now, current) + N`.
Caps :
- **365j max actif** — refusé au checkout + clamp défense en profondeur côté webhook
- **rate limit 1 achat / 24h par item par buyer** — anti double-click panique
- **6 slots visibles top-of-grid** sur `/marketplace` (au-delà, pill amber gardé mais sort normal)

Feature complet : [src/lib/stripe/promote-actions.js](./src/lib/stripe/promote-actions.js)
+ [promote-config.js](./src/lib/stripe/promote-config.js) +
[/promote/[kind]/[slug]](./src/app/promote/[kind]/[slug]/page.js) +
webhook handler `versuz_action=promote`. Migration :
[0016_promotions.sql](./supabase/migrations/0016_promotions.sql) (table `promotions`
ledger + colonnes `promoted_until`).

Le boost ne touche **PAS** le ranking — pure mécanique de discovery.

### Stripe Connect Express + destination charges

- Authors onboardent via `/profile/settings` → "Become a seller →"
  (Stripe-hosted Express onboarding, pré-rempli FR par défaut)
- Buy flow : `/buy/[kind]/[slug]` — preview + checkout test
  (carte 4242 4242 4242 4242)
- Split automatique 70/30 via `payment_intent_data.transfer_data.destination`
  + `application_fee_amount` (Stripe gère les payouts au seller)
- Webhook `/api/webhooks/stripe` handle 6 events :
  `checkout.session.completed`, `account.updated`,
  `payment_intent.payment_failed`, `charge.refunded`,
  `charge.dispute.created`, `charge.dispute.closed`
- Earnings dashboard : `/profile/earnings` — gross, fees, net 30d/lifetime,
  table des ventes, panneau diagnostic (helpful pour debug)
- Profiles table ([0013_profiles.sql](./supabase/migrations/0013_profiles.sql))
  bootstrap au signup (trigger sur `auth.users`) + backfill des users existants.
  Source de vérité pour `stripe_account_id`, `stripe_charges_enabled`, etc.

⚠ **Test mode tant qu'on n'a pas le domaine.** `stripe listen` doit tourner
dans une fenêtre PowerShell séparée pour que le webhook frappe localhost.
Sans ça, achat OK côté Stripe mais row jamais insérée. Voir
[docs/stripe-go-live.md](./docs/stripe-go-live.md) checklist.

## Seven bench modes (May 2026 update)

- `dev` — **3 Groq models** (Llama 3.3 70B + Llama 4 Scout + Llama 4
  Maverick). Per-model quota = 3 × 1000 RPD = 3000 free RPD total. Default.
- `v1-thrift` — **direct keys, single judge < €1/day** : DeepSeek V4 Flash
  agent + GPT-5 nano judge. ~0.81 €/jour @ 100 skills × 5 tasks. Brand names
  (DeepSeek + OpenAI) sans casser la tirelire.
- `v1` — **direct keys, 3-judge wow ensemble** : Claude Haiku 4.5 +
  DeepSeek V4 Flash + GPT-5 mini (DeepSeek as agent). ~2.50 €/jour. Anthropic
  prompt-caching enabled by default → ~30% input savings.
- `or-thrift` — **OpenRouter, single key, single judge** : GPT-5 nano via
  OR. ~0.86 €/jour. Simplest possible setup, one bill.
- `or-v1` — **OpenRouter, single key, 3 judges** : Haiku 4.5 + DeepSeek V4 Flash
  + GPT-5 mini all routed through OR. ~2.60 €/jour. DeepSeek-direct routing
  confirmed working (provider used : DeepSeek), prompt cache kicks in from call 2.
- `prod` — Opus 4.7 + Gemini 2.5 Pro free + Mistral free. Used for the
  signature ranking once we have funding.
- `gold` — Opus 4.7 + GPT-5 + Gemini 2.5 Pro. Full canonical, championship
  cycles only.

**OpenRouter** ([scripts/bench/providers/openrouter.mjs](./scripts/bench/providers/openrouter.mjs)) is
the recommended path for solo dev — one `OPENROUTER_API_KEY`, access to
200+ models including all of the above. ~5-15% markup over direct, traded
for not babysitting 5 separate billing dashboards.

Set `BENCH_MODE`. Single source of truth: `src/lib/judges.js`. UI copy
reads from `JUDGES`/`judgesLabel()` — never hardcode judge names elsewhere.

`BENCH_JUDGE_COUNT=N` slices the active ensemble down to the first N
judges (3× fewer calls per output, no ensemble disagreement). Useful for
free-tier conservation.

## Cost & scaling matrix

Token model: SKILL.md/CLAUDE.md ~1500 tokens (range 500-3000 per
real-world data). Per pair (1 agent + N judges) = 2k + 1.7k×N input,
1k + 150×N output. For 100 skills × 5 tasks = 500 pairs.

| Mode | Stack | $/day | €/day | Trigger |
|---|---|---|---|---|
| **dev** | 3 Groq Llama, free | $0 | 0 € | default |
| **v1-thrift** | DeepSeek V4 Flash agent + GPT-5 nano judge | $0.89 | **0.81 €** ✓ | `BENCH_MODE=v1-thrift` + DEEPSEEK_API_KEY + OPENAI_API_KEY |
| **v1** | DeepSeek V4 Flash agent + Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini | $2.72 | **2.50 €** | `BENCH_MODE=v1` + 3 keys |
| **or-v1** | Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini via OpenRouter | **$2.85** | **2.60 €** | `BENCH_MODE=or-v1` + 1 OR key |
| **prod** | Opus batch + Gemini Pro free + Mistral free | ~$3 | 2.75 € | Real budget |
| **gold** | Opus + GPT-5 + Gemini Pro canonical | ~$10 | 9 € | Championship cycles |

Self-host only becomes economical at 10k+ requests/min. Until then, paid
API wins.

## Core directories

- `src/app/` — App Router pages, including `/admin`, `/profile`, `/claim`,
  `/feed`, `/api/v1/*`, `/api/cron/*`, `/api/webhooks/stripe`,
  `/badge/[kind]/[slug]`, `/buy/[kind]/[slug]` (+ success), `/promote/[kind]/[slug]` (+ success)
- `src/components/section.jsx` — `<Section>` / `<SectionHeader>` /
  `<PageHero>` primitives
- `src/components/marketplace/` — `MarketplaceCard` (TopNBadge + Boosted
  pill + Tier badge + Owned/Yours CTAs), `MarketplaceGrid` (client,
  URL-synced filters + topics multi-select + pagination), `TierBadge`,
  `VerificationBadge`
- `src/components/motion/` — CSS-driven animations (`Reveal`,
  `RevealStagger`, `HeroHeadline`). No more framer-motion `whileInView`
  on these — content is visible from SSR, animation runs via CSS keyframe.
- `src/components/embed-badge-block.jsx` — copy-paste markdown/HTML for
  the `/badge/[kind]/[slug]` SVG ribbon (refactored 420×62, 4-color stripe
  top, single SCORE column right, tier dot indicator).
- `src/components/dashboard/stat-grid.jsx` — server-rendered KPI grid +
  bar chart + sparkline (no chart library)
- `src/components/site/` :
  - `vz-nav` — desktop wordmark + mobile small mark, user cluster hidden
    < 1024px (consolidated into hamburger drawer), `justifySelf: end` on
    right cluster so hamburger sticks to the right edge.
  - `mobile-nav-menu` — hamburger button + portal-rendered drawer with
    Browse + Account sections, escapes header stacking context (z 9999).
  - `back-button` — smart `← Back` : uses `router.back()` if user has
    navigation history, otherwise falls back to provided href.
  - `vz-ticker`, `vz-footer`, `cmd-k-search` (global search modal, hidden
    on touch < 768px since keyboard-only).
- `src/components/brand/` — `versuz-mark.jsx` (2-flame ember + currentColor
  composable mark, May 2026 redesign), `versuz-wordmark.jsx` (typed verSuz
  with italic 's' + ember dot)
- `src/lib/queries/rankings.js` — server-side data access. `liveSkills`,
  `liveClaudeMds`, `getCategoryRankings`, `getLeaderboardCategories`,
  `getTopTopics`, `getAllRanksBySlug` (TopNBadge backing query). Cached
  per-request via `React.cache()`. Items get `isBoosted` / `promotedUntil`
  / `privateStoragePath` mapped from DB.
- `src/lib/auth/` — `actions.js` (sign-in/out), `server.js`
  (`getCurrentUser` cached), `admin.js` (`isAdmin`/`requireAdmin`)
- `src/lib/profiles/server.js` — `getProfile` cached + `getCurrentProfile`
  (synthetic fallback) + `updateProfileAsAdmin` + `getSellerProfile`
- `src/lib/purchases/server.js` — `getOwnedSlugs(userId)` +
  `getAuthoredSlugs(userId)`, both return `{skills:Set, claudeMds:Set}`
- `src/lib/stripe/` :
  - `server.js` — lazy `getStripe()` singleton, `siteUrl()`, `platformFeeCents()`
  - `connect-actions.js` — `startStripeOnboarding`, `refreshStripeAccountStatus`,
    `openStripeDashboard`, `openStripeDisputes` (deep-link via Express loginLink
    redirect_url)
  - `checkout-actions.js` — `loadBuyableSubject`, `createCheckoutAction`
  - `promote-actions.js` — `loadPromotableSubject`, `createPromoteCheckoutAction`
    (with caps + rate limit)
  - `promote-config.js` — `PROMOTE_*` constants (separate file because
    "use server" can't export non-async)
- `src/lib/premium/storage.js` — Supabase Storage bucket helpers :
  `uploadPremiumFile` + `signPremiumDownloadUrl` (7d TTL)
- `src/lib/resend.js` — minimal Resend SMTP client (no SDK), `sendEmail()`
  + `isResendConfigured()`. Used by `/api/subscribe` (welcome email) and
  `/api/webhooks/stripe` (branded purchase receipt with download link).
- `src/lib/submit/actions.js` — real DB-write server actions (URL fetch +
  inline content, classifies + upserts, auto-claims if owner match,
  premium upload + tier picker, admin-bypass for premium self-listings)
- `src/lib/claim/actions.js` — `claimSubject` with live GitHub API
  ownership re-check
- `src/lib/admin/actions.js` — admin server actions (approve/reject task
  proposals, set verification level / tier, delete)
- `src/lib/supabase/admin.js` — service-role client for admin routes only
- `src/lib/judges.js` — judge presets (dev/v1/prod/gold/or-v1/or-thrift/v1-thrift)
- `src/lib/utils.js` — `approximateTokens`, `formatTokenCount`,
  `computePrior` (cold-start signal)
- `scripts/scrape/` + `scripts/scrape-claude-md/` — concurrency 6,
  per-repo metadata cache, `--force-update` flag, **403/422/429 backoff**
  (read X-RateLimit-Reset, sleep + retry max 3x), 6.5s entre pages
- `scripts/scrape-aggregators/` — 14 awesome-* sources + 8 GitHub Topics,
  batch upsert tous les 20, SIGINT trap pour flush avant exit, per-source
  `kinds` hint, `listRepoRoot` single-call pour skip 404s. Run via
  `npm run scrape:aggregators`. Configurable : `SCRAPE_BATCH_SIZE`,
  `SCRAPE_CONCURRENCY` (default 2), `GITHUB_TOPICS_MAX_PAGES` (default 3)
- `scripts/_hash.mjs` — `contentHash(s)` SHA-256 hex pour dedup
- `scripts/_dedup.mjs` — `purgeContentDuplicates(sb, table)` post-upsert
  cleanup, garde le row avec le plus de stars/forks/id stable
- `scripts/seed-premium.mjs` — bump 5 skills + 1 claude_md à premium $1.99
  pour test buy flow (env `SEED_AUTHOR_USER_ID`)
- `scripts/reset-premium.mjs` — undo seed-premium proprement (gère le CHECK
  constraint price_consistent), `--dry-run`, `--keep-author`,
  `--keep-verification`
- `scripts/bench/` :
  - `index.mjs` — orchestrator (resumes existing queued cycles, FIFO)
  - `agent.mjs` — Gemini → Groq → Mistral rotation, recognizes `openrouter` provider
  - `judge.mjs` — sync judge calls + circuit breaker on quota exhaustion
  - `runner.mjs` — output-hash dedup
  - `enqueue-cycle.mjs` — cartesian product of subjects × tasks
  - `seed-tasks.mjs` — load `built-in-tasks.json` into `tasks` table
  - `built-in-tasks.json` — 102 hand-crafted tasks (60 skill + 42 claude_md)
  - `rate-limit.mjs` — `callWithRetry` (8s/30s/90s backoff) +
    `callWithRotation` (cross-provider failover)
  - `providers/` — google, groq, mistral, anthropic, openai, deepseek,
    `openrouter` (cache_control passthrough for Anthropic models)
- `supabase/migrations/` — 20 migrations from `0001_init.sql` to
  `0020_content_hash.sql` (see [supabase/migrations/](./supabase/migrations/)).
  Recent : 0012 OR judge model IDs · 0013 profiles · 0014 purchases RLS ·
  0015 premium downloads · 0016 promote ledger · 0017 cycles partial ·
  0018 other category bucket · 0019 quality_score columns ·
  **0020 content_hash (SHA-256 dedup, indexed, backfilled)**.

## Scripts

- `npm run dev / build / start / lint / format`
- `npm run seed` — push fixtures to Supabase
- `npm run seed:premium` — bump 5 skills + 1 claude_md à premium $1.99 (test buy flow)
- `npm run reset:premium` — undo seed-premium (`--dry-run`, `--keep-author`, `--keep-verification`)
- `npm run scrape:skills` / `scrape:claude-md` — `--force-update`,
  `--max-pages=N`, `--category=X`, `--dry-run`
- `npm run scrape:aggregators` — 14 awesome-* + 8 GitHub Topics, batch
  upsert, Ctrl+C-safe, auto-purge content dups en fin de run
- `node scripts/bench/quality-judge.mjs` — single-LLM rate 5 axes,
  `--provider=groq|google|openrouter`, `--limit=N`, `--rejudge`,
  `--kind=skill|claude_md`
- `npm run bench:smoke` — judge ensemble health check
- `npm run bench:agent-smoke` — fake skill × fake task end-to-end
- `npm run bench:seed-tasks` — load `built-in-tasks.json`
- `npm run bench:enqueue` — create cycle + queue jobs
- `npm run bench` — claim + run + judge + refresh_rankings (resumes
  existing queued cycle)
- `npm run generate-tasks` — Gemini Flash drafts new task_proposals
  (admin reviews via `/admin/task-proposals`)

### Email (Resend)

Optionnel mais activé. Set `RESEND_API_KEY` + `RESEND_FROM` dans `.env.local`.

```
RESEND_API_KEY=re_...
RESEND_FROM="Versuz <hello@versuz.dev>"
```

Sans la clé, `sendEmail()` retourne `{ skipped: true }` silencieusement —
les flows (subscribe, purchase) marchent toujours, juste pas d'email envoyé.

### Stripe local dev (test mode)

Tant qu'on n'a pas le domaine, garder Stripe en sandbox. Workflow :

```powershell
# Terminal A (laisser tourner) — forward webhooks vers localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → copie le whsec_ affiché → .env.local STRIPE_WEBHOOK_SECRET=...
# → restart npm run dev

# Terminal B — refund test
stripe payment_intents list --limit 5
# → trouve le PI avec metadata.versuz_subject_kind=skill
stripe refunds create --payment-intent=pi_xxx
# → vérifie en SQL : select status from purchases where stripe_payment_intent_id='pi_xxx'
#   doit être 'refunded'

# Terminal B — replay un event
stripe trigger checkout.session.completed   # fixture sans metadata, bail-early dans handler — attendu
```

**Note PowerShell users**: `npm run X -- --flag` is broken on Windows
(npm intercepts unknown flags). Run scripts via `node` directly:
`node scripts/bench/enqueue-cycle.mjs --scope=skills.document`.

## Working agreement

1. Read `CONTEXT.md` first.
2. Visual direction: port from `.ui/`, do not reinvent.
3. Server components by default; `"use client"` only with interactivity.
   Marketplace filters are client-side because users want instant feedback.
4. New DB changes go through `supabase/migrations/` with a new timestamped
   file.
5. Routes that fetch data: provide `loading.js` and `error.js`.
6. Fixture fallback in `src/lib/queries/rankings.js` is intentional V0 —
   the web app must build end-to-end without Supabase configured.
7. Never commit secrets — `.env.local` is git-ignored.
8. Bench engine optimisations are non-negotiable: dedup by content hash,
   per-job retry, circuit breaker. Don't replace with simpler approaches
   without flagging it.
9. Single source of truth for judges: `src/lib/judges.js`. UI copy reads
   `JUDGES`/`judgesLabel()`. Never hardcode judge names elsewhere.
10. Animation budget: CSS keyframes for entrance reveals (visible from
    SSR), framer-motion only for true interactive parallax. Never use
    `whileInView` on bulk content — it leaves SSR content invisible
    until JS hydrates (5-20s in dev).
11. When in doubt about scope: "is this V0?"
