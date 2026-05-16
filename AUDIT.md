# Audit Versuz — Business, Revenue & Growth

> Date : 2026-05-16 · Branche : `claude/versuz-platform-audit-ZchZ3`
> Contexte : 50 visiteurs / 10k vues actuels, 1 mois d'ads prêt à drop,
> focus business + revenue + growth.

---

## TL;DR — Diagnostic

Versuz est **un produit complet** (5,200+ items indexés, bench engine live,
3 tiers commerciaux, CLI + MCP, gamification, content automation, R2 + Stripe
Connect, 7 vidéos ads prêtes). La tech est solide.

Mais **le moteur de revenu n'a pas démarré** et **la croissance est en
attente passive** — pas par manque d'assets, par manque d'**exécution
d'exécution**. Tu as :

- Un launch playbook 553 lignes — **0 date committée**, **0 owner**, **0 wave
  shippée** ([docs/launch-marketing.md](docs/launch-marketing.md))
- 7 ads vidéo exportables — **personne n'en a vu une seule**
- 7 skills `vz-*` Featured (Versuz first-party, 100% revenue) — **0 process
  documenté pour en produire 10 de plus**
- 0 item Premium vendable dans la DB (très probablement) — **0 outreach
  author engagé**
- Pas de PostHog/Sentry — **50 visiteurs déjà arrivés, 0 funnel mesuré**

Le risque principal : **brûler les 30 jours d'ads sans capacité à mesurer
ni à convertir**. Avant tout ad spend → fix les 5 P0 ci-dessous.

---

## TOP 10 — Actions prioritaires (1 semaine)

| # | Action | Impact | Effort | Section |
|---|--------|--------|--------|---------|
| 1 | **Wire PostHog + Sentry** avant d'envoyer 1€ d'ads | P0 | 2h | §4.1 |
| 2 | **Move "$ npx versuz" dans le hero** (au-dessus du fold) | P0 | 1h | §2.1 |
| 3 | **Ship Wave 1 du playbook cette semaine** — dates fixes, 3 posts/jour | P0 | 6h | §2.6 |
| 4 | **Documenter pipeline Featured + ship 5 nouveaux vz-\*** | P0 | 1 sem | §1.4 |
| 5 | **Lancer outreach Anthropic/Vercel/Stripe** avec pitch deck Featured | P0 | 4h | §1.7 |
| 6 | **Ajouter abonnement Pro author $9/mo** (analytics + boost gratuit + badges custom) | P1 | 2j | §1.5 |
| 7 | **Sitemap tiering** + pages SEO "Best X skill" auto-gen | P1 | 1j | §2.3 |
| 8 | **Wire `post-cycle-hooks.mjs` dans `bench-runner.yml`** + tweet auto via API | P1 | 2h | §3.2 |
| 9 | **CTA "Embed badge in README"** sur chaque detail page | P1 | 3h | §2.4 |
| 10 | **A/B framework** sur les 5 surfaces de monétisation (PostHog feature flags) | P1 | 4h | §1.2 |

---

# §1 — Business model & revenue (FOCUS #1)

## 1.1 — État du stack revenue

**Surfaces actives** (5, toutes shippées V1.6) :

| Surface | Fichier | CTA |
|---------|---------|-----|
| Home §Featured strip | [src/app/page.js:42](src/app/page.js) | "Pitch a featured item" |
| Marketplace top promo | [src/app/marketplace/page.js:107-150](src/app/marketplace/page.js) | "$4.99/30d boost" |
| Leaderboard bottom promo | (à confirmer côté `/leaderboard`) | "Want to climb?" |
| Skill detail author-aware | [src/components/skills/promote-skill-slot.jsx:14-90](src/components/skills/promote-skill-slot.jsx) | Boost (owner) / Submit (visitor) |
| Skill detail cross-sell | `<FeaturedPicksStrip>` dans [src/app/skills/[slug]/page.js](src/app/skills/[slug]/page.js) | 3 autres Versuz Featured |

**Stripe** : 100% production-ready ([src/app/api/webhooks/stripe/route.js](src/app/api/webhooks/stripe/route.js) — 435 lignes, 6 events gérés dont refund/dispute/idempotency). **Aucun bug bloquant**.

**Verdict** : architecture revenue saine, **mais les revenus dépendent
quasi-exclusivement de Featured** (100% Versuz) tant que tu n'as pas
d'authors Premium onboarded — et le pipeline Featured est artisanal.

## 1.2 — Manque #1 : **0 framework d'A/B test sur les 5 surfaces**

Pas une seule trace de feature flag, variant copy, ou tracking de conversion
sur les CTAs. Tu shippes 5 promo slots… et tu ne sais pas lequel convertit.

**Recommandation** :
- Activer PostHog feature flags (gratuit jusqu'à 1M events/mois)
- Variants à tester en priorité :
  - **Boost CTA** : "Boost — $4.99/30d" vs "Surface yours · $4.99" vs "Pin to top · $4.99"
  - **Featured strip** : couleur card amber vs sage vs neutral
  - **Author-aware CTA** : "Boost yours" vs "Climb to #1" vs "Get featured"
- Métriques : CTR + checkout completion + revenue per session

## 1.3 — Manque #2 : **Aucun revenu récurrent**

Tu as **1 seul one-time** (Premium $X) + **1 one-time renouvelable** (Boost
$4.99/30j). **0 abonnement, 0 LTV stack, 0 base récurrente**.

À ce rythme :
- Top author qui pousse 10 skills à $5 + 10 boosts/an = ~$100/an
- Plafond LTV individu : ~$600/an même pour un power-seller
- Aucun visibility revenue (forecast impossible)

## 1.4 — Featured tier : **goulot d'étranglement principal**

- 7 skills `vz-*` produits ([vz-skills/](vz-skills/))
- Seuls 4 sont seedés dans [scripts/seed-vz-skills.mjs](scripts/seed-vz-skills.mjs) (vz-changelog $0.99, vz-pdf-extract $1.99, vz-sql-migrate $1.99, vz-stripe-connect $2.99)
- 3 sans prix (vz-bench-debug, vz-launch-check, vz-scrape-runner) → probablement free Featured
- **0 doc** sur "comment produire 1 nouveau vz-* par semaine"
- **0 calendrier éditorial**
- **0 SOP de QA**

C'est la surface qui a le plus de visibilité (home §Featured strip = 1ʳᵉ chose
qu'un visiteur voit) et tu rotates 3 items sur 7. Risque : visiteur récurrent
voit toujours les mêmes 3 picks.

**Recommandation immédiate** :
- Créer [docs/featured-pipeline.md](docs/featured-pipeline.md) avec SOP : choix
  sujet → SKILL.md template → quality-judge interne (target ≥80) → seed →
  push social
- Ship 5 nouveaux vz-* d'ici 14 jours : `vz-readme-gen`, `vz-jest-add`,
  `vz-vercel-deploy`, `vz-supabase-migration`, `vz-component-extract`
- Pricing : monter à $4-9 (le market accepte facilement à ce niveau pour des
  skills validés ; voir SkillForge Pro $19/mo)
- Inventaire cible : 20 Featured en rotation d'ici fin juin

## 1.5 — **Nouveau tier proposé : Pro Author $9/mois** (recurring)

Single biggest revenue unlock possible. Crée la base récurrente qui te manque.

**Inclus** :
- Analytics dashboard : views/installs/downloads par skill, time-series, source
  attribution
- **1 boost actif gratuit en permanence** (effective $4.99 → $0/mo si tu te
  servirais du boost de toute façon)
- Custom badge styles (animated, gradient, dark mode)
- Priority bench queue (tes submits passent en tête de file)
- Featured candidate flag (Versuz review automatique)
- Bulk discount à 25% sur tous les Boosts au-delà du 1er
- Email digest hebdo personnalisé (tes skills + concurrents directs)

**Math** : 50 authors × $9/mo = $450/mo recurring. Tu n'as besoin que de 50
personnes ; le market est large (1.2M+ skills sur skillsmp).

**Tracking** : nouvelle colonne `profiles.is_pro_author boolean` + table
`subscriptions` (Stripe Subscriptions, distinct des Connect destination
charges actuels). Migration 0053.

## 1.7 — Outreach partnerships : **plan d'attaque**

Mentionné en TODO mais 0 contact démarré. Trois cibles avec angles spécifiques :

**Anthropic** :
- Cible : Maggie Vo (DevRel) ou Alex Albert
- Angle : "On benchmark publiquement votre marketplace officielle vs les 4200
  alternatives — votre store sort en moyenne #N sur 47. Voici les data."
- Demande : co-marketing blog post + featured slot dans leur doc
- Featured tier compliment : 5 skills `anthropics/skills/*` en Featured Versuz
  (100% Versuz revenue, leur exposition)

**Vercel** :
- Cible : Lee Robinson ou DevRel
- Angle : "Versuz indexe les skills `vercel/*` (next-gen, ai-sdk-utils, etc.)
  et les ranke. Vous voulez un badge officiel ?"
- Demande : Vercel For Startups creds + featured app listing

**Stripe** :
- Cible : Stripe Apps team
- Angle : "vz-stripe-connect est notre skill Featured Stripe (déjà
  publié) — collaborate on a Stripe-specific skill collection?"
- Demande : amplification sur newsletter dev + co-author un guide

**Outils** : un Notion CRM ou simple Airtable suffit. 3 emails/semaine pendant
4 semaines = 12 contacts → tu en convertis 1-2 → 1 partnership =
distribution change game.

## 1.8 — Autres surfaces de revenu **inexploitées**

| Surface | Effort | Potentiel mensuel |
|---------|--------|-------------------|
| Newsletter sponsor slot (1 par digest, $50/sem) | 0 (tu as déjà la newsletter) | $200/mo |
| Job board "Hire a top author" ($99/listing) | 1 jour | $200-500/mo |
| Author verification fast-track ($9 one-time skip queue) | 2h | $50-100/mo |
| Skill bundles (3 skills à prix groupé, 30% Versuz) | 1 jour | scale avec premium |
| Custom domain badges ($5/mo pour badge.tonsite.com) | 1 jour | $50/mo |
| Sponsored category card (top de /standings/sql, $19/mo) | 4h | $100-200/mo |

**Total potentiel sans Pro tier** : ~$600-1100/mo de **recurring add-ons** à
partir d'un produit existant — sans changer ta stack fondamentale.

## 1.9 — Friction conversion actuelle

Discovery → Paid action = **3-3.5 clics** (acceptable). Mais friction réelle :

- **PAT GitHub pour CLI submit** — utilisateur doit générer un PAT et le coller
  dans le terminal. Drop-off probable 40-60% à cette étape. Solution : GitHub
  Device Flow (TODO mentionné, jamais shipped)
- **No "preview before buy"** sur les Premium cards ([src/components/marketplace/marketplace-card.jsx:410-418](src/components/marketplace/marketplace-card.jsx)) — pas de mask gradient comme indiqué dans CLAUDE.md, juste un line-clamp 3. À revoir : "Read the first 500 chars" + CTA Buy
- **`/buy/[slug]` 1-step OK** mais aucun social proof inline ("23 people bought this") faute de tracking events

---

# §2 — Marketing & growth (FOCUS #2)

## 2.1 — Hero landing : **value prop floue**

[src/app/page.js:140-200](src/app/page.js) — le hero actuel est éditorial
("An open public benchmark for AI agent skills") mais **manque le hook
mémorisable**.

Le pitch killer existe dans le README.md ligne 24 : *"LMArena, but for agent
skills."* — il n'est pas dans le hero.

**Problèmes** :
- Pas de pitch "comme X" qui ancre dans 1s la valeur
- CLI install command **§07** (ligne ~729) = 90% des mobile users ne le voient
  jamais
- Judges nommés (Haiku/DeepSeek/GPT-5) dans `judgesLabel()` mais affichés en
  small caps tertiaires, pas en proof-point

**Recommandations** :
1. Hero h1 : *"The LMArena for AI agent skills."* (italique sur "LMArena")
2. Sous-titre h2 : *"Three LLM judges grade every public SKILL.md. The
   winners rank #1. Updated daily."*
3. Add right under hero : `$ npx versuz` dans un CommandBlock avec copy
   button — au-dessus du fold
4. Trust row sous hero : `5,200 skills · 714 judged · 3 judges (Haiku · DeepSeek · GPT-5 mini) · Updated 6h ago`

## 2.2 — Sitemap : **crawl budget risk**

[src/app/sitemap.js](src/app/sitemap.js) — fetch tous les skills + claude_md =
~5,200 items aujourd'hui mais cible 100k. Sans tiering :
- Sitemap XML ~5MB à 100k items
- Google brûle son crawl budget sur les rank 500+
- Catégories `/standings/{cat}` non-listées = perte SEO long-tail

**Fix concret** :
```js
// priority differentiation
sitemap.push(...top10PerCategory.map(s => ({ url, priority: 0.9, changeFrequency: 'daily' })));
sitemap.push(...top100Rest.map(s => ({ url, priority: 0.6 })));
sitemap.push(...allOthers.map(s => ({ url, priority: 0.3 })));
// add category pages explicitly
sitemap.push(...categories.map(c => ({ url: `/standings/${c.id}`, priority: 0.8 })));
```

Et **paginer le sitemap** : `/sitemap.xml` (index) → `/sitemap-skills-1.xml`,
`/sitemap-claude-md-1.xml`, etc. (chunks 5k).

## 2.3 — **Quick win SEO majeur** : pages "Best X skill"

Tu as 27 catégories de skills + 8 de CLAUDE.md = 35 long-tail SEO pages
auto-générables depuis les data existantes.

Template `/best/{kind}/{category}` :
- H1 : "Best Claude Code skills for SQL (May 2026)"
- Subhead : "Ranked by 3 LLM judges across 5 tasks. Updated daily."
- Body : top 10 cards + "How we ranked" + FAQ "What is a SKILL.md?"
- Internal links : autres catégories, /methodology

35 pages × 200-500 visits/mo dès mois 3-4 SEO = **+7-17k traffic mensuel
organique** à terme. Effort : 1 jour pour le template + 1 helper query.

## 2.4 — Badges : **viralité non-exploitée**

Tu as 3 endpoints badge :
- [/badge/[kind]/[slug]](src/app/badge/[kind]/[slug]/route.js) (item)
- /badge/author/[login] (V1.6)
- /badge/category/[cat] (V1.6)

**Mais** : aucune surface ne dit "Mets ce badge dans ton README". L'ami qui
voit `npx versuz` dans un README ↔ visite ↔ +1 visiteur qualifié. C'est ta
boucle organique la plus puissante.

`<EmbedBadgeBlock>` existe avec tabs markdown/html/url et copy button, mais
elle est sur les detail pages uniquement, **pas mise en avant pour le sharing**.

**Recommandation** :
- Sur skill detail : encart proactif après les axes → "Show this skill's
  rank on your README" + preview badge + copy button
- Email post-submit (Resend déjà en place) : "Your skill is live + here's
  your badge"
- Page `/badges` dédiée : showcase des 3 endpoints, exemples d'intégration
  Notion/Linear/Discord, screenshot d'embeds

## 2.5 — Content automation : **manuelle = pas scalable**

Le flow actuel :
1. Cycle complete → `post-cycle-hooks.mjs` run (mais **pas wired en
   workflow**, voir §3.2)
2. Toi tu vas sur `/admin/content-drafts` → tu picks upsets → tu downloads
   PNG → tu copies URL → tu paste dans Twitter/LinkedIn

C'est 30min/jour si tu fais sérieusement. **Burn-out garanti** en 2 semaines.

**Recommandation** :
- Étape 1 (1 sem) : auto-post Bluesky via API (gratuit, OAuth simple,
  pas de rate limit méchant)
- Étape 2 (2 sem) : X API gratuite via `oauth1` (450 posts/mois suffisent)
- Étape 3 (1 mois) : Discord webhook vers serveur Anthropic (`#showcase`)
- Étape 4 (2 mois) : Email weekly digest auto-généré aux subscribers

Scripts à wire dans [scripts/social/](scripts/social/) (nouveau dossier) :
`post-upset.mjs --kind=auto --threshold=3` qui lit `getRecentUpsets()` et
poste sur tous les channels actifs.

## 2.6 — Launch playbook : **0 exécution**

[docs/launch-marketing.md](docs/launch-marketing.md) = 553 lignes de gold.
Wave 1 (Jour 1-3), Wave 2 (Jour 4-7), Wave 3 — tout y est, **rien n'a été
shipped**.

Le problème : aucun "Jour 1" n'est défini. Tu attends que "tout soit prêt"
(domaine, Stripe LIVE, npm publish CLI/MCP) → tout est en attente externe →
tu ne shippes jamais.

**Recommandation drastique** :
- Définis **Jour 1 = lundi prochain** (peu importe si Stripe LIVE pas ready
  — Boost reste $0 si Stripe test, c'est OK pour la wave 1)
- Découpe le playbook en checklist Notion/Linear avec assignation à toi-même
  par jour
- 3 posts/jour pendant 7 jours = 21 posts → tu auras testé chaque format

**Si tu attends 1 mois de plus pour shipper la wave 1, tu auras dépensé tes
30 jours d'ads sur un funnel non-mesuré et ton organic sera plat.**

## 2.7 — Distribution npm : **bloqueur trivial**

`npm publish` pour CLI v0.2.0 et MCP server v0.1.0 = **TODO depuis des
semaines** ([TODO.md](TODO.md) ligne 16-17). Sans publish :
- `npx versuz` ne marche pas pour les early adopters
- MCP `claude mcp add versuz npx -y @versuz/mcp` ne marche pas
- Toutes les vidéos ads et copy qui montrent ces commands sont fausses

**À faire AVANT toute promotion sociale** : `cd cli && npm publish` + idem
mcp-server. 10 min. Bloqueur le plus stupide du projet.

## 2.8 — Manques structurels

| Manque | Impact | Effort |
|--------|--------|--------|
| **Pas de blog** | Pas de SEO long-tail, pas de thought leadership | 2-3 jours pour setup + 1ʳᵉ post |
| **Pas de Discord** | Pas de community feedback loop, pas de retention | 1 jour |
| **Pas de Product Hunt setup** | Pre-launch DMs + launch day prep manquent | 1 semaine de prep |
| **Pas de programme ambassador** | Top authors n'ont pas d'incentive à promouvoir | 1 semaine design |
| **Pas de Show HN draft posté** | Drafté dans launch-marketing.md mais jamais publié | 30 min |

---

# §3 — Product/UX (gaps secondaires mais impactants)

## 3.1 — Gamification half-shipped

Mig 0052 ship 4 systèmes :
- `item_achievements` (triple_crown, streak_milestone, category_winner, first_blood)
- `author_achievements` (newcomer → veteran)
- `rank_history` (snapshots cycle)
- Streak cols sur skills + claude_md

**Visible côté user** :
- 🔥 streak sur SkillRow + detail (OK)
- ♛ Triple Crown sur detail (OK)
- **Author tiers : invisibles partout** — pourquoi tu as fait migration 0052 si personne ne voit les badges author ?
- **Pas de page `/achievements`** — pas de "wall of fame"
- **Pas de notifications** quand un author hit un milestone

→ La gamification est ton moteur de retention. Tu l'as à moitié build, à
moitié shipped. Recommandation : finir le travail (page /achievements + tier
badge sur `/u/[login]` + email Resend sur milestone) = 2 jours.

## 3.2 — `post-cycle-hooks.mjs` jamais wire en workflow

[scripts/bench/post-cycle-hooks.mjs](scripts/bench/post-cycle-hooks.mjs)
existe + idempotent + bien documenté. Mais **aucun workflow GitHub Actions
ne l'appelle**. Donc :
- Achievements stales jusqu'à exécution manuelle
- Streak counters désynchronisés du leaderboard
- `rank_history` non-snapshot → "Today's Upset" pipeline cassé

**Fix** : ajouter step à la fin de
[.github/workflows/bench-runner.yml](.github/workflows/bench-runner.yml) :
```yaml
- name: Post-cycle hooks
  if: success()
  run: node scripts/bench/post-cycle-hooks.mjs
```

## 3.3 — Confusion `skills.category` natif (27) vs `rankings.category` bench scope (5)

Documenté dans CHANGELOG comme fix (helper `getBenchedTopByCategory` créé),
mais l'utilisateur final voit toujours :
- Detail page : "Category: macos"
- Leaderboard : la skill ranked sous scope "sql"
- Aucune explication

**Fix** : sur le bandeau de la skill detail, sous le category badge, ajouter
*"Benched under: SQL · why?"* (lien vers méthodologie). 1h de travail.

## 3.4 — 4 systèmes de badges (Tier / Verify / Quality / Official) — noisy

Sur une marketplace card tu peux voir : `Premium $1.99`, `✓ verified`,
`Quality 78`, `✓ official`, `Boosted`. Un visiteur non-formé voit 5 signaux
sans légende → blank stare.

**Fix** : tooltip hover sur chaque badge explicant le signal en 1 phrase
("Quality = LLM-rated 0-100 on 5 axes"). 2h.

## 3.5 — Marketplace filters non-persistés URL

`<MarketplaceGrid>` est client mais ne sync pas les filters dans
`useSearchParams`. Conséquences :
- Reload = filters reset
- Share URL = pas le bon état
- Back button = état perdu

Fix : 4-6h pour passer en `<Link>` SSR-friendly avec query params.

---

# §4 — Tech & observabilité (de-risk avant ads)

## 4.1 — **P0 absolu : observabilité = 0**

Tu as Vercel Analytics seul. Pas de PostHog (funnels, recordings, A/B),
pas de Sentry (errors), pas de Better Stack/Axiom (logs).

**Implication directe sur ton plan ads** : tu vas dépenser des €€€ sans :
- Savoir d'où viennent les visiteurs qui convertissent
- Voir où ils dropent dans le funnel
- Détecter qu'une page renvoie une 500 silencieuse
- Faire de l'A/B test des variants Boost

**Setup en 2h** :
- PostHog Free (1M events/mo) → wrap dans `<Suspense>` ; events :
  `landing_view`, `cta_boost_click`, `cta_submit_click`, `install_command_copy`,
  `pricing_view`, `purchase_success`
- Sentry Free (5k events/mo) → wrap `app/global-error.js` + capture in API routes
- Both : ~20 min setup + 1h instrumentation

**Avant 1€ d'ads, fix ça.**

## 4.2 — Bench budget : alertes manquantes

[.github/workflows/bench-runner.yml](.github/workflows/bench-runner.yml) cap
$25/mo OK. Mais :
- Pas d'alerte si on hit 80% du budget
- DeepSeek reasoning tokens peuvent surfacer après-coup (lag OpenRouter)
- Discord/Email webhook absent

**Fix simple** : si `actual_cost_usd > BUDGET * 0.8` → curl webhook Discord.
30 min.

## 4.3 — 0 tests E2E

Playwright installé, jamais utilisé. Flows critiques sans test :
- Submit (web + CLI)
- Buy + webhook
- Install (CLI + MCP)
- Claim

Risque : migration qui casse silencieusement le checkout, découvert 3 jours
plus tard.

**Recommandation** : 3 smoke tests Playwright (submit, buy avec carte
4242 Stripe test, install via CLI) = 1 jour de travail, infinite peace of
mind.

## 4.4 — Background jobs swallow errors

`after()` hooks dans submit + quality-judge utilisent `catch (e) {
console.warn }`. Si Supabase down ou OR rate-limited :
- L'user voit "success"
- Le quality-judge ne run jamais
- Personne ne le sait

**Fix** : envoyer ces catches dans Sentry + table `failed_jobs` pour retry
manuel.

---

# §5 — Roadmap recommandée

## Semaine 1 (revenue + de-risk)
- [ ] Wire PostHog + Sentry (2h)
- [ ] `npm publish` CLI v0.2.0 + MCP v0.1.0 (30 min)
- [ ] Wire `post-cycle-hooks.mjs` dans bench-runner workflow (15 min)
- [ ] Move `$ npx versuz` dans hero (1h)
- [ ] Hero h1 = "LMArena for AI agent skills" + judges nommés visible (1h)
- [ ] Email outreach Anthropic + Vercel + Stripe (4h — rédaction + envoi)
- [ ] Define **Day 1** of launch playbook = lundi prochain (0h, juste décide)
- [ ] Featured pipeline doc + ship 1 nouveau vz-* (2j)

## Semaine 2 (ship marketing + new tier)
- [ ] Wave 1 du launch playbook shipped (3 posts/jour × 7 jours)
- [ ] Sitemap tiering + pages SEO `/best/{kind}/{cat}` (1j)
- [ ] CTA "Embed this badge in README" sur detail pages (3h)
- [ ] Pro Author tier $9/mo : design + Stripe Subscriptions + mig 0053 (2j)
- [ ] Ship 2 nouveaux vz-* Featured (1j)

## Semaine 3-4 (automation + scale)
- [ ] Auto-post upsets Bluesky API (1j)
- [ ] Discord webhook achievements (4h)
- [ ] Page `/achievements` + author tier badges sur `/u/[login]` (1j)
- [ ] 3 smoke E2E Playwright (1j)
- [ ] Blog setup + 2 premiers posts (3j)
- [ ] Ads campaign launch — drop le 1 mois préparé, avec funnels mesurés

## Mois 2 (partnerships)
- [ ] Auto-post X API (1j)
- [ ] Email weekly digest aux subscribers (2j)
- [ ] Closing 1ʳᵉ partnership Anthropic ou Vercel (variable)
- [ ] Programme ambassador design + outreach 5 top authors (1 sem)

---

# Annexes

## A. Surfaces auditées (fichiers clés)

- Landing : [src/app/page.js](src/app/page.js)
- Pricing : [src/app/pricing/page.js](src/app/pricing/page.js)
- Submit : [src/app/submit/page.js](src/app/submit/page.js) +
  [src/lib/submit/actions.js](src/lib/submit/actions.js)
- Buy : [src/app/buy/[kind]/[slug]/page.js](src/app/buy/[kind]/[slug]/page.js)
- Webhooks : [src/app/api/webhooks/stripe/route.js](src/app/api/webhooks/stripe/route.js)
- Marketplace card : [src/components/marketplace/marketplace-card.jsx](src/components/marketplace/marketplace-card.jsx)
- Leaderboard : [src/components/leaderboard-table.jsx](src/components/leaderboard-table.jsx)
- Promote slot : [src/components/skills/promote-skill-slot.jsx](src/components/skills/promote-skill-slot.jsx)
- Badge route : [src/app/badge/[kind]/[slug]/route.js](src/app/badge/[kind]/[slug]/route.js)
- Post-cycle hooks : [scripts/bench/post-cycle-hooks.mjs](scripts/bench/post-cycle-hooks.mjs)
- Workflows : [.github/workflows/](.github/workflows/)
- Launch playbook : [docs/launch-marketing.md](docs/launch-marketing.md)
- Marketing briefs : [docs/marketing-briefs.md](docs/marketing-briefs.md)
- Vz Featured pipeline : [scripts/seed-vz-skills.mjs](scripts/seed-vz-skills.mjs) + [vz-skills/](vz-skills/)

## B. Métriques cibles à 90 jours

Avec exécution sérieuse du plan ci-dessus :

| Métrique | Aujourd'hui | M+1 | M+3 |
|----------|-------------|-----|-----|
| Visiteurs uniques / mois | ~50 | 500-1000 | 3-5k |
| GitHub stars | ~? | 50-100 | 300-500 |
| npm downloads CLI / mois | 0 | 200-500 | 1-3k |
| Authors avec >=1 skill submitted | ~? | 10-20 | 50-100 |
| Pro Authors ($9/mo) | 0 | 5-10 | 30-50 |
| Premium items vendus | 0-5 | 10-30 | 50-150 |
| MRR | $0 | $50-150 | $400-800 |
| Featured items en rotation | 7 | 15 | 25-30 |

## C. Plan d'attaque pour les ads (puisque tu en as 1 mois prêt)

**Pré-requis avant 1€ dépensé** :
1. PostHog + Sentry wired (§4.1)
2. Variants A/B définis sur hero + Boost CTA (§1.2)
3. UTM tracking sur tous les liens
4. CLI + MCP publiés sur npm (§2.7)

**Budget allocation suggérée** (sur 30 jours) :
- 50% Twitter/X Ads — cible : devs qui suivent @AnthropicAI, @cursor_ai
- 25% Reddit Ads — cible : r/ClaudeAI, r/LocalLLaMA, r/ChatGPTCoding
- 15% LinkedIn — cible : "ML Engineer" + companies AI
- 10% retargeting via Meta pixel (post-visit)

**Funnels mesurés** :
1. Ad click → landing view (CTR cible >2%)
2. Landing view → CLI copy (cible 8%) OU Submit click (cible 3%) OU Pricing click (cible 5%)
3. Pricing → Become a seller (cible 1%)
4. Submit → Item live (cible 60% — toujours bcp de drop sur GitHub OAuth)

Sans cette instrumentation, le mois d'ads = €€€ wasted.

---

*Audit produit avec exploration parallèle de 4 agents Explore + lecture
manuelle de 12 fichiers clés. ~25 min de travail total. Pour questions ou
priorités à challenger, ping.*
