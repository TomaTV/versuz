# Versuz · TODO

Tout ce qui est `[x]` archivé vit dans [CHANGELOG.md](./CHANGELOG.md) (en anglais — public).
Ce fichier ne garde que les `[ ]` actifs.

Dernière mise à jour : **2026-05-14 (late — recovery + V1.5 features done)**

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

### CLI/MCP v0.2
- [ ] `GET /api/v1/skills/<slug>/bundle.zip` endpoint
- [ ] GitHub Device Flow dans CLI (au lieu de PAT manuel)
- [ ] Premium auth CLI/MCP (vérif via `purchases` table)
- [ ] MCP tool `versuz_submit`

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
- API enterprise premium (custom benchmarks for clients)
- Anthropic Message Batches pour `prod` mode (50% off Sonnet, async)
- Deterministic pre-judge layer (regex/JSON-schema pre-pass)
- Hetzner VPS V1 (si > 500 submits/jour)
