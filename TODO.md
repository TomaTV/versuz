# Versuz · TODO

Tout ce qui est `[x]` archivé vit dans [CHANGELOG.md](./CHANGELOG.md) (en anglais — public).
Ce fichier ne garde que les `[ ]` actifs.

Dernière mise à jour : **2026-05-16 (V1.7 — audit P1 batch + /best 404 fix + PostHog wire)**

---

## 🎯 V1.7 — Sprint actualisé post-enterprise (semaine 16-18 mai)

V1.7 shippé : PostHog provider + 10 events + 5 funnels prêts pour dashboard,
`/best/[kind]` index, `.vz-blog-body` typographie, hero install strip retiré,
fix /best/skill/* 404, CLI v0.2.1 + MCP v0.2.0 publiés, enterprise tier retiré
entièrement (page + admin + DB table + docs).

Stack monétisation consolidé : Premium 30/70 + Boost $4.99/30j + Featured 100%
+ **Pro Author $9/mo** (schéma DB ready via mig 0054, code checkout livré, env
`STRIPE_PRO_AUTHOR_PRICE_ID` gate /pricing entre waitlist et live).

Plafond cible : **$1200-1950/mo @ steady-state**.

### P0 — cette semaine (must-ship avant Wave 1 samedi 18 mai)

- [ ] **Ship 5 nouveaux vz-* Featured** — actuel 7, target 12. Cadence 2-3/jour mercredi-jeudi. SOP : pick depuis PostHog top searches × gap-categories, write SKILL.md < 1500 mots, test live Claude Code, quality-judge ≥ 80, seed + push
- [ ] **A/B Boost CTA copy** via PostHog feature flags — 3 variants ("Boost $4.99/30d" vs "Surface yours $4.99" vs "Pin to top $4.99") sur les surfaces home / marketplace / leaderboard / detail
- [ ] **Newsletter capture sur `/skills/[slug]`** — `<NewsletterInline>` en fin de page detail pour capter le viral Wave 1
- [ ] **PostHog dashboard EU — créer les 5 funnels** : (1) Hero→CLI activation, (2) Browse→Buy, (3) Author conversion, (4) Submit funnel, (5) Newsletter capture. Cibles dans `AUDIT.md` §4
- [ ] **Wave 1 social drop samedi 18 mai** — humain (Twitter thread + LinkedIn + TikTok terminal demo)

### P1 — ce mois-ci (Wave 2-3)

- [ ] **Pro Author live activation** — attendre 20-30 waitlist signups via /pricing, créer Stripe Product+Price récurrent ($9/mo), push `STRIPE_PRO_AUTHOR_PRICE_ID` dans Vercel env, redeploy
- [ ] **Author analytics dashboard** — views/installs par skill + 30j sparkline + source attribution (npm CLI / MCP / web copy / GitHub badge). Defend $9/mo perceived value. À shipper en même temps que Pro Author live
- [ ] **Pro Author boost permanent gratuit** — `bench_pending` priorité dans `loadSubjects` quand `is_pro_author=true` + 1 boost auto-renew gratuit chaque mois
- [ ] **Bluesky auto-post** depuis `post-cycle-hooks.mjs` — Bluesky API gratuite, post le top mover par cycle
- [ ] **Outreach Anthropic + Vercel** — pitch Featured partnership (5 skills `anthropics/skills/*` en Featured Versuz 100%, leur exposition vs notre data publique). Stripe retiré du pitch
- [ ] **Top movers email weekly** — subset du digest, test la cadence retention
- [ ] **Brancher `post-cycle-hooks.mjs`** dans `.github/workflows/bench-runner.yml`

### P2 — parqué (après V1.7)

- [ ] Multi-compare 4 items
- [ ] Onboarding tour `/marketplace`
- [ ] MCP `versuz_battle` demo video (vu que MCP shippé)
- [ ] Pro Author nice-to-have : custom badge styles, bulk discount, Featured candidate flag

---

## 🎯 V1.6 — Sprint social (18 mai → 16 juin)

Tout le code V1.6 est shippé (PHASE 0 à PHASE 4 + 5 surfaces monétisation natives). Ce qui reste = humain + ops.

### Monétisation déjà en place (V1.6)

5 surfaces de revenus natifs activées, zéro AdSense :
- [x] Home `§ Featured` — strip Versuz first-party (vz-bench-debug + vz-scrape-runner)
- [x] `/marketplace` top promo card — "Got a skill? Boost $4.99/30d"
- [x] `/leaderboard` bottom promo block — "Want to climb this ranking?"
- [x] `/skills/[slug]` author-aware — Boost CTA si owner, Submit CTA si visitor
- [x] `/skills/[slug]` cross-sell — More Versuz picks (autres Featured items)

Pour augmenter l'inventaire / le revenu :
- [ ] Démarcher Anthropic / Vercel / Stripe pour Featured tier sur leurs skills officiels (100% Versuz)
- [ ] Démarcher 3-5 top authors pour Premium (30/70 split)
- [ ] Build plus de skills `vz-*` first-party (chaque nouveau = inventaire Featured supplémentaire)

### À publier sur npm (déplacé vers V1.7 — bump 0.2.1)
- [x] `cd cli && npm publish` — v0.2.0 publié 2026-05-15, **v0.2.1 bumpé 2026-05-16** (à republish)
- [ ] `cd mcp-server && npm publish` — bump description + keywords (cf [.distribution/npm-submissions.md](./.distribution/npm-submissions.md))

### À submit sur les directories (toi)
Voir [.distribution/STEP-BY-STEP.md](./.distribution/STEP-BY-STEP.md) pour le pas-à-pas (2 exemples concrets) :

- [ ] **GitHub release v0.1.0** sur `TomaTV/versuz` ([.distribution/release-notes.md](./.distribution/release-notes.md))
- [ ] **6 MCP directories** : mcp.so, smithery.ai, glama (awesome-mcp-servers), pulsemcp, modelcontextprotocol/servers, mcpmarket
- [ ] **NPM** : openbase, socket.dev, libraries.io (auto-indexés, juste vérifier après 48h)
- [ ] **Awesome-lists PRs** : awesome-claude-code, awesome-ai-agents, awesome-mcp-servers, awesome-llm-apps, awesome-cursor, etc.

### Pipeline ops après chaque cycle
- [ ] Brancher `post-cycle-hooks.mjs` dans `bench-runner.yml` (auto après cycle completed)
- [ ] OU le faire manuellement : `node scripts/bench/post-cycle-hooks.mjs` après chaque cycle
- [ ] Workflow social : ouvrir `/admin/content-drafts` → pick 1-3 upsets → publier

### Sprint social — 15 posts (18 mai → 16 juin)
- [ ] Vague 1 (J1-J5) — teasing : Twitter thread launch annonce + LinkedIn carousel méthodologie + TikTok/Reel `npx versuz` 20s
- [ ] Vague 2 (J7-J21) — daily drops & upsets : 8 posts mix Twitter / TikTok / LinkedIn / Instagram (cf brief Claude)
- [ ] Vague 3 (J23-J29) — crescendo : Launch Week format Supabase + Battle of the Month reel + LinkedIn rapport-style + peak day 16/06 (Twitter Space + Product Hunt + LinkedIn fondateur + TikTok victory lap)
- [ ] DM 5 amplificateurs J1 : @theo, @rauchg, @swyx, @transitive_bs, 1 français Claude Code (avec accès anticipé + données exclusives leaderboard)
- [ ] Tournage 6× **Bench Drop** vidéos terminal 20-30s 9:16 via `npx versuz battle <a> vs <b>` screencast

---

## 🚀 Deploy checklist (prochaine session)

Tout le tech infra est launch-ready. Ordre d'exécution pour push prod :

### Avant deploy
1. [ ] **Supabase downgrade** Pro → Free (DB stable @ 281 MB sous quota 500 MB)
2. [ ] **Supabase refund ticket** (template dans CHANGELOG des conversations)
3. [ ] **DNS Cloudflare** :
   - `A versuz.dev → 76.76.21.21`
   - `CNAME www → cname.vercel-dns.com`
   - **Proxy OFF** sur les 2 (orange cloud → grey) — sinon double SSL clash Vercel Let's Encrypt
4. [ ] **Resend DNS** versuz.dev : SPF + DKIM + return-path MX + DMARC (depuis dashboard Resend → Domains → Add)
5. [ ] **GitHub Secrets** dans Repo Settings → Actions → Secrets :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SCRAPE_GITHUB_TOKENS=ghp_x,ghp_y,ghp_z`
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`

### Vercel deploy
6. [ ] Vercel → Add Domain `versuz.dev` + `www.versuz.dev` (redirect www → apex auto)
7. [ ] Vercel env vars Production scope — copier `.env.local` :
   - `NEXT_PUBLIC_SITE_URL=https://versuz.dev`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY=sk_live_...`, `STRIPE_WEBHOOK_SECRET=whsec_live_...`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `RESEND_API_KEY`, `RESEND_FROM=Versuz <hello@versuz.dev>`, `RESEND_REPLY_TO=contact@flukxstudio.fr`
   - `OPENROUTER_API_KEY`, `BENCH_MODE=or-v1`, `BENCH_BUDGET_USD=1` (workflow caps $25/mois via `cycles.actual_cost_usd`)
   - `ADMIN_GITHUB_LOGINS=TomaTV`, `ADMIN_GITHUB_IDS=...`
   - `CRON_SECRET` (générer `openssl rand -hex 32`)
8. [ ] **Supabase Auth** Site URL → `https://versuz.dev`, Redirect URLs += `https://versuz.dev/auth/callback`
9. [ ] **GitHub OAuth App** → Homepage URL `https://versuz.dev`
10. [ ] **Stripe webhook** : vérifie l'endpoint LIVE pointe `https://versuz.dev/api/webhooks/stripe`
11. [ ] `git push main` → Vercel auto-deploy

### Post-deploy
12. [ ] Smoke test : landing, /marketplace, click 1 skill, /leaderboard, /submit
13. [ ] `dig versuz.dev` → `76.76.21.21` (DNS propagated)
14. [ ] `curl -I https://versuz.dev` → 200 + SSL valide
15. [ ] `https://versuz.dev/sitemap.xml` rend du XML valide
16. [ ] OG image vérifiée via `https://opengraph.xyz/url/https%3A%2F%2Fversuz.dev`
17. [ ] Test stripe LIVE : mini-achat $0.99 → vérifier webhook + refund flow
18. [ ] `npm publish` × 2 :
    - `cd cli && npm publish` (déjà bumpé vers `https://versuz.dev`)
    - `cd mcp-server && npm publish` (idem)
19. [ ] Test depuis poste neuf : `npx versuz@latest search pdf`
20. [ ] Trigger 1er GitHub Action manuellement : Actions → Scrape daily → Run workflow (mode codesearch)
21. [ ] Trigger 1er bench : Actions → Bench runner → Run workflow (mode or-v1)

### Marketing post-launch (humain)
- Logo Veo (3 formats) — brief dans docs/marketing-briefs.md
- Figma templates Insta/LinkedIn/Twitter
- Press kit folder `public/press-kit/`
- Tweet thread + Show HN draft + Bluesky/Twitter bio
- 7 ads vidéo déjà shippées via `npm run ads:export`

---

## En attente externe (bloqué)

### Supabase
- [x] DB recovery via Pro upgrade temporaire ($25, prorata <$1) — disk-full résolu
- [x] Drop trigram indexes (mig 0037, 5 indexes saturants) — -150 MB
- [x] Apply migrations 0039 → 0048 (description_hash, multi-cat, archive, content_storage,
  RLS perf, is_bundled, widen category, repo_skill_count, widen v2, byte_count)
- [x] Content offload Storage bucket → DB passée 776 → 281 MB
- [x] Reclassify-all v3 + classifier étendu (15 nouveaux buckets V1.5+)
- [x] Backfill licenses (60k items via GitHub API)
- [x] Backfill byte_counts (93k skills + 10k claude_md via Storage object sizes)
- [x] Hard-delete archived (221 dedup near-dups + orphan Storage cleanup)
- [ ] **Downgrade Pro → Free** (DB stable @ ~280 MB, plenty under 500 MB quota)
- [ ] **Refund ticket** Supabase support (template dans la conversation précédente)

### Stripe
- [x] **Platform profile validé** (2026-05-13) — Funds flow: Buyers purchase from you · Sellers paid individually · Refund liability Stripe · Express Dashboard hosted onboarding
- [x] Branding LIVE — logo + couleur ember + name Versuz
- [x] Connect LIVE activé — Express + capabilities card_payments + transfers
- [x] Webhook LIVE créé avec `checkout.session.completed`, `account.updated`, `payment_intent.payment_failed`
- [ ] **Identity verification finale** (en cours, 1-5j) — débloque les transferts LIVE
- [ ] Push env vars LIVE dans Vercel Production scope (sk_live_, pk_live_, whsec_ LIVE) + redeploy
- [ ] Test live mini-achat $0.50 puis refund flow

---

## À faire dès que les bloqueurs sautent

### Infra
- [ ] Vercel → Add Domain `versuz.dev` + `www` (DNS Cloudflare déjà OK, proxy off)
- [ ] Vercel env vars Production scope — voir [docs/domain-go-live.md](./docs/domain-go-live.md) §1.3
- [ ] Supabase Auth Site URL = `https://versuz.dev` + Redirect URLs
- [ ] GitHub OAuth Homepage = `https://versuz.dev`
- [ ] Resend domain DNS chez Cloudflare (SPF/DKIM/DMARC) + verify
- [ ] `npm publish` × 2 (cli + mcp-server, default URL déjà bumpé)

### Bench cycle initial
- [ ] Quality-judge massif : `node scripts/bench/quality-judge.mjs --limit=4000`
- [ ] First real bench cycle : `node scripts/bench/enqueue-cycle.mjs --scope=skills.document --subjects=10 --tasks=5` puis `npm run bench`

---

## Scraper / Bench / Quality — GitHub Actions (DONE 2026-05-14 late)

3 workflows configurés dans `.github/workflows/` :

- **scrape-daily.yml** : daily 02:00 UTC, mode `codesearch` par défaut, `SCRAPE_MAX_NEW=1000` cap. Auto-backfill byte_count après. `SCRAPE_USE_STORAGE=1` → écrit direct dans le bucket.
- **quality-judge.yml** (NEW) : every 4h, `--limit=50000`, Groq free, $0 cost, 8 workers.
- **bench-runner.yml** : daily 03:00 UTC, mode `or-v1` (3 judges), `BENCH_BUDGET_USD=1` per-run, **monthly cap $25** via pre-flight check sur `cycles.actual_cost_usd` (mig 0049, exit 78 si dépassé). Auto refresh_rankings. → max ~$25-30/mois.

**Secrets GitHub à configurer** (Repo Settings → Secrets and variables → Actions) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCRAPE_GITHUB_TOKENS` (comma-separated `ghp_x,ghp_y,ghp_z`)
- `OPENROUTER_API_KEY` (bench)
- `GROQ_API_KEY` (quality + bench dev mode)

Scraper unifié : `npm run scrape` → orchestre les 4 adapters (github, aggregators, codesearch, sourcegraph) séquentiellement. Un seul writer DB à la fois → fini la saturation Supabase.

---

## Marketing exec (briefs prêts dans [docs/marketing-briefs.md](./docs/marketing-briefs.md) + [docs/claude-design-prompt.md](./docs/claude-design-prompt.md))

### Ads vidéo — DONE (2026-05-14)

7 scènes vidéo exportables via `npm run ads:export` (script `scripts/export-ads.mjs` + Playwright + ffmpeg, 2× DPR supersampling, frame-accurate trim).

- [x] `judgesVertical` (1080×1920, 8s) — 3 frontier judges stacked + composite
- [x] `judgesLinkedIn` (1200×627, 9s) — 3 judges row + rationale snippet
- [x] `climbLinkedIn` (1200×627, 9s) — `pdf-extract` #47 → #3 sparkline ELO +230 (avec skill identity hero ajouté)
- [x] `terminalStory` (1200×627, 19s) — narrative end-to-end : search → why → install → submit + CTA
- [x] `boostLinkedIn` (1200×627, 13s) — skill #43 → boost $4.99 → climb to #1 + FEATURED pill
- [x] `tiersLinkedIn` (1200×627, 13s) — 5 trust tiers : Unverified → Claimed → Verified → Reviewed → Featured
- [x] `numbersVertical` (1080×1920, 9s) — big stat reveal TikTok/Insta : 100k / 3 / every 4h / 0 hidden

Helpers cinématiques en place dans `.ads/versuz-ads-scenes-3.jsx` : `breathe()`, `easeOutSoftBack`, `counterEase`, `StableNum` (réserve la largeur du final value via ghost element pour éviter les décalages quand un counter compte 0 → 18,400), gate `^6` sur breathe pour pas de jitter pendant l'entry.

### Marketing à exécuter (humain ou Veo)

- [ ] Logo animation Veo (3 formats : square / vertical / landscape) — brief dans [docs/marketing-briefs.md](./docs/marketing-briefs.md#m1-logo-animation-veo)
- [ ] Brand kit Claude artifact — prompt prêt dans [docs/claude-design-prompt.md](./docs/claude-design-prompt.md)
- [ ] Figma templates : Insta carousel 10 slides + Reels 15s/30s + LinkedIn post + Twitter banner
- [ ] Press kit folder `public/press-kit/` (SVG logos + 4 screenshots)
- [ ] Copy : tweet thread (10 tweets) + Show HN draft + Bluesky / Twitter bio + Insta captions (variants A/B/C)
- [ ] OG images vérifiées via opengraph.xyz

---

## Landing polish — DONE (2026-05-14)

3 agents d'audit lancés (perf + landing UX + features V1.5). Findings hauts-impact appliqués :

- [x] §06 Final CTA : bouton primary **"Submit your skill →"** linké à `/submit` (était juste du texte mono, pas de lien)
- [x] §06 Secondary CTA : teaser **"Boost a skill · $4.99 / 30 days"** linké à `/marketplace?promote=intro`
- [x] §03 step 05 "Rank" : "Bayesian Elo..." → "Skills are ranked like chess players. New entries start fair. Top performers earn harder matches."
- [x] §03 step 04 "Score" : remplacé par "Scores tallied fairly. When judges disagree, we publish their exact reasoning."
- [x] Hero subhead : judges nommés (Haiku, DeepSeek, GPT-5)
- [x] §06 description : jargon supprimé, "No fee, no gatekeeper"
- [x] Install button one-click sur skill detail + claude_md detail : `npx versuz@latest install {slug}` en PRIMARY (ember accent), Copy button inline sur tous les `CommandBlock`
- [x] Embed badge URL variant : 3ème tab "URL" en plus de Markdown/HTML pour Notion/Linear/Discord
- [x] CHANGELOG.md migrated en anglais (public-facing) + `/changelog` page in-app translated
- [x] OG image (1200×630) câblée dans `layout.js`, hérité par toutes les pages publiques sauf detail (qui ont leur dynamique)

---

## V1.5 marketplace polish — DONE (2026-05-14 late)

- [x] **Bundle filter** : 2 columns (`is_bundled` mig 0044 + `repo_skill_count` mig 0046) → Single 2680 / Bundle 90927, server-side indexed
- [x] **Tokens filter** : `byte_count` column (mig 0048) backfilled depuis Storage → server-side pour skills ET claude_md
- [x] **Source filter** : `normalizeSource()` mappe les valeurs raw (github-search, web-directory, gitlab, mega-github, etc.) vers buckets canoniques. Dropdown affiche counts réels via `getAvailableSources(kind)`.
- [x] **Classifier v4** : 11 nouveaux buckets (writing, design, marketing, automation, research, api-integration, macos, communication, media, testing, devops) — reclassify-all bouge 11762 items hors de "other"
- [x] **Featured** : 2-cell grid span sur cards `tier=featured` (mig auto via item.tier check)
- [x] **License badges** : crimson pour copyleft GPL/AGPL/LGPL, gris muted pour permissive (MIT/Apache/BSD) — 60213 items badged après backfill
- [x] **Admin featured bug** : fix `defaultValue` stale via `key={...}` qui force re-mount du select après revalidatePath
- [x] **Submit price** : tolère locale FR (4,99), step="0.01", parse `Number(rawStr)` après normalize comma→dot

## Landing polish — restant (1-3h chacun)

- [ ] Hero trust signal — row "Trusted by X authors · Y skills indexed" sous le headline (1h)
- [ ] Mobile hero CTA padding : `clamp(12px 20px, 4vw 26px)` au lieu du fixe 16/26 ([page.js:163-165](src/app/page.js))
- [ ] Replace `<pre>` install cards avec `<CodeBlock/>` animée type-reveal (1-2h)
- [ ] Multi-compare 4 items (étendre `/compare?a&b&c&d` au lieu du binary) (2-3h)
- [ ] Trending rail "Hot this week" sur /marketplace top (basé sur `scraped_at < 7j`) (2h)
- [ ] Submit flows → Storage direct (au lieu de skill_md_content inline) — V1.5 cleanup (30 min)

---

## Pre-launch checks (J-1)

- [ ] Smoke test E2E localhost : submit / buy (carte 4242) / install CLI / install MCP
- [ ] Run le skill `vz-launch-check` (dans `vz-skills/vz-launch-check/SKILL.md`) — vérif env vars + DNS + SSL + Stripe webhook + Supabase Auth
- [ ] Test live mini-achat $0.50 sur Stripe live → vérif refund flow
- [ ] `dig versuz.dev` → 76.76.21.21
- [ ] `curl -I https://versuz.dev` → 200 + SSL valide
- [ ] `npx versuz@latest search pdf` depuis un poste neuf
- [ ] `https://versuz.dev/sitemap.xml` rend du XML valide

---

## Post-launch (V1.5+)

### Bench
- [ ] Full bench du catalog : `node scripts/bench/full.mjs --all --tasks=4` ~$50-60 / 10h
- [ ] GH Actions bench cron (workflow existe — activer)
- [ ] Validate anti-inflation rubric après prochain bench
- [ ] Human gold set calibration (200 items, V1)
- [ ] Pairwise Bradley-Terry sur top 5%

### Discovery
- [ ] MCP registry scrapers (Smithery, mcp.so, mcp-get) — 5k-15k MCP servers potentiels
- [ ] Multi-format scrape : AGENTS.md (Codex), .cursorrules, .windsurfrules, .continue/rules/*.md
- [ ] BigQuery GH Archive — bulk one-time seed
- [ ] GitHub Public Events API — real-time stream nouveau push events

### Marketplace UX
- [ ] Filter "Permissive only" dans Refine (server-side via `license_spdx IN (...)`)
- [ ] Cap dur "max 5 items du même repo" en marketplace
- [ ] Page repo : améliorer la design (responsive, search dans le bundle)

### CLI/MCP v0.3 (après v0.2.0 publié)
- [ ] `GET /api/v1/skills/<slug>/bundle.zip` endpoint
- [ ] GitHub Device Flow dans CLI (au lieu de PAT manuel) → débloque `--add-badge` PR auto
- [ ] Premium auth CLI/MCP (vérif via `purchases` table)
- [ ] MCP tool `versuz_submit` (mirror CLI submit)
- [ ] MCP tool `versuz_battle` (mirror nouveau CLI battle)

### Gamification refinements (V1.6+)
- [ ] Triple Crown vraie unanimité (3 juges votent #1 sur le même skill) au lieu du proxy `avg_score >= 85`
- [ ] Surface achievements collection sur `/u/[login]` profile public
- [ ] Notif email/Discord quand un author hit un milestone (Champion, Veteran, Triple Crown)
- [ ] Page `/achievements` publique pour browse les meilleurs cumulards

### Data quality (long-term)
- [ ] SimHash / MinHash sur description pour near-dups fuzzy
- [ ] LLM-based classifier (DistilBERT fine-tuné ou GPT-5-nano) pour items en `other`
- [ ] Re-judge quality_score quand le content change (track via content_hash diff)

### Bloqué par "pas de domaine"
- [ ] Stripe Tax activation (volume EU)
- [ ] Stripe Customer email receipts

---

## V2 (parqué)
- Real-time battles style Chatbot-Arena (live judging avec vote user)
- Dark theme (tokens prêts dans `.ui/`)
- Webhook creator (notify on rank change → Discord / Slack / email)
- Anthropic Message Batches pour `prod` mode (50% off Sonnet, async)
- Deterministic pre-judge layer (regex/JSON-schema pre-pass)
- Hetzner VPS V1 (si > 500 submits/jour)
