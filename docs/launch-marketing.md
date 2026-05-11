# Versuz · Launch & Marketing Playbook

> **Status** : draft v1, mai 2026. À exécuter dès que `versuz.dev` résout en HTTPS + CLI/MCP publiés sur npm + premier bench cycle terminé.

Ce doc est un playbook séquencé pour transformer Versuz d'un side project en un outil reconnu dans l'écosystème Claude Code. Solo dev, budget pub ~0€, organic-first.

---

## Pré-requis bloquants (à valider avant le jour J)

- [ ] `versuz.dev` résout en HTTPS (cf. [docs/domain-go-live.md](./domain-go-live.md))
- [ ] CLI publié sur npm : `npx versuz` retourne le menu interactif (cf. [docs/cli-mcp-go-live.md](./cli-mcp-go-live.md))
- [ ] MCP publié sur npm : `claude mcp add versuz npx -y @versuz/mcp` marche
- [ ] Stripe en live mode (cf. [docs/stripe-go-live.md](./docs/stripe-go-live.md))
- [ ] Premier bench cycle complet (~50 skills judged en `or-v1`, leaderboard populé)
- [ ] OG images correctes sur la landing + marketplace + détail pages (vérif via [opengraph.xyz](https://opengraph.xyz))
- [ ] Vidéo demo TikTok/Reels prête (CLI + MCP en action, ~20s)
- [ ] Logo Versuz animé prêt (prompt Veo dans `docs/launch-marketing.md` section « assets visuels »)
- [ ] Compte Twitter/X actif avec bio + bannière Versuz
- [ ] Compte Bluesky actif
- [ ] Domaine vérifié sur Resend (DKIM/SPF/DMARC)

---

## Audience cible

| Persona | Où elle traîne | Ce qu'elle cherche |
|---|---|---|
| **Claude Code power-user** | Twitter/X, Anthropic Discord, r/ClaudeAI | "what's the best skill for X" |
| **Skill creator** | GitHub, Twitter, indie hackers | distribution + revenue |
| **AI agent builder / startup** | HN, r/LocalLLaMA, dev.to | reliable building blocks |
| **Tech writer / influencer** | Twitter, dev.to, YouTube | scoop / story angle |
| **Researcher / enterprise** | Bluesky, mailing lists | benchmarking methodology |

---

## Wave 1 — Soft launch (Jour 1-3)

Objectif : valider que tout marche en public, build d'audience initiale ~100-300 personnes.

### 1.1 — GitHub

- [ ] Pin `versuzdev/versuz` sur le profil principal
- [ ] Ajouter topics : `claude-code`, `skill`, `mcp-server`, `marketplace`, `benchmark`, `llm`, `ai-agent`
- [ ] Activer GitHub Discussions
- [ ] Star badges dans README (npm version, license, build status)
- [ ] Demander à 5 amis de star/watch le repo pour amorcer

### 1.2 — MCP registries

Cross-poster `@versuz/mcp` sur les 3 principaux registries :

- [ ] **[Smithery.ai](https://smithery.ai)** — soumettre via leur form. Description : *"Browse, search, and install Claude skills + CLAUDE.md from the open Versuz registry directly inside Claude Code."*
- [ ] **[mcpservers.com](https://mcpservers.com)** — PR sur leur GitHub
- [ ] **[pulsemcp.com](https://pulsemcp.com)** — submit form

Catégories à cocher : `Developer Tools`, `Search`, `Marketplace`.

### 1.3 — Anthropic Discord

- [ ] Post dans `#showcase` :

> 🎯 **Just shipped Versuz — open benchmark for Claude skills**
>
> *Stars don't prove quality.* Versuz indexes every public SKILL.md / CLAUDE.md on GitHub (~3,000 so far), benchmarks them against the same task suite, lets 3 LLMs judge.
>
> Try the CLI : `npx versuz`
> Add the MCP : `claude mcp add versuz npx -y @versuz/mcp`
>
> Live at versuz.dev — free, open, MIT.
>
> [screenshot of CLI ASCII logo + result table]

- [ ] Post dans `#skills` channel (si existe)
- [ ] Réponses utiles dans `#help` pendant 1 semaine pour build presence

### 1.4 — Bluesky thread

5 posts, max 300 chars chacun :

1. *"There are 4,200 Claude skills on GitHub. None tell you which one actually works. I built Versuz to fix that → versuz.dev"*
2. *"Existing directories (claudemarketplaces, skillsmp) rank by stars and installs. That's popularity, not quality. Versuz benchmarks the outputs : 3 LLMs grade every skill against the same 30 tasks."*
3. *"~1,700 SKILL.md + ~1,300 CLAUDE.md auto-discovered + quality-judged. Free, open, MIT. The leaderboard updates daily."*
4. *"Install from your terminal : npx versuz install <slug> → ./.claude/skills/<slug>/SKILL.md. Or plug into Claude Code as native tools : claude mcp add versuz npx -y @versuz/mcp"*
5. *"Solo build, 6 weeks, open in public. Source : github.com/versuzdev/versuz. Feedback welcome ✨"*

Schedule chaque post à 30 min d'écart pour un feed naturel.

---

## Wave 2 — Le pic (Jour 4-7)

Objectif : viser 1k+ uniques, top 10 HN, 100-200 GitHub stars.

### 2.1 — Twitter/X thread (lundi 9h CET)

10 tweets. Image ou GIF par tweet où c'est pertinent.

**Tweet 1 (hook)** :
> There are 4,200 Claude skills on GitHub.
>
> None tell you which one actually works.
>
> I built Versuz to fix that 🧵

**Tweet 2 (problem)** :
> Existing directories rank by stars and installs. That's popularity, not quality.
>
> A skill with 50k stars might be unmaintained. A skill with 30 stars might smoke it. You have no way to know.
>
> [screenshot side-by-side : claudemarketplaces vs reality]

**Tweet 3 (solution)** :
> Versuz benchmarks the outputs.
>
> Every public skill on GitHub gets run through the same task suite. Three frontier LLMs (Claude Haiku 4.5, DeepSeek V3, GPT-5 mini) grade independently. Bayesian Elo per category. Updated daily.
>
> Free, open, MIT.

**Tweet 4 (scale)** :
> Current registry :
> – ~1,700 SKILL.md
> – ~1,300 CLAUDE.md
> – ~410 quality-judged
> – Multi-source scrape : GitHub Code Search + Sourcegraph + 14 awesome-* lists + 8 GitHub Topics
>
> [screenshot stats grid]

**Tweet 5 (CLI demo)** :
> Install any skill from your terminal :
>
> [GIF 8s : npx versuz search pdf → table → install pdf-extract]
>
> npx versuz · zero install, beautiful ASCII output. Submit your own with `versuz submit <github-url>`.

**Tweet 6 (MCP demo)** :
> Or plug Versuz into Claude Code as native tools :
>
> claude mcp add versuz npx -y @versuz/mcp
>
> Now Claude can search and install skills inline. Ask "find me a PDF skill and install it" — it just works.
>
> [GIF Claude Code using the tool]

**Tweet 7 (anti-spam) ** :
> Anti-spam is real :
> – PAT auth required to submit
> – Owner-or-org-member only (you can only submit your own repos)
> – Rate limit 5/h
> – Free tier hardcoded, premium goes through Stripe Connect on the web
>
> No bot farms, no rugpulls.

**Tweet 8 (monetization)** :
> Versuz lets authors monetize too.
>
> Premium listings via Stripe Connect Express. Authors keep 70% on every install, no minimum payout. Already live in test mode.

**Tweet 9 (tech)** :
> Built with :
> Next.js 16 + React 19 + Supabase + OpenRouter + 22 SQL migrations + 6 Vercel crons + Resend SMTP + framer-motion
>
> Pure Node CLI (figlet + chalk + cli-table3) + MCP server with @modelcontextprotocol/sdk
>
> Solo build, 6 weeks, in public.

**Tweet 10 (CTA)** :
> Try it now :
>
> 🌐 versuz.dev
> 📦 npx versuz
> 🔌 claude mcp add versuz npx -y @versuz/mcp
> ⭐ github.com/versuzdev/versuz
>
> Feedback welcome. RT to share with someone who's tired of guessing.

**Mentions à ajouter** : `@AnthropicAI` sur tweet 1 (Claude Code), aucun sur les autres (éviter le spam).

### 2.2 — Show HN (lundi 13h CET = 7h ET)

Submit le même jour, ~1h après le tweet thread pour cross-pollination.

**Title** :
```
Show HN: Versuz – Adversarial benchmark for Claude skills (1,700+ indexed, free)
```

**URL** : `https://versuz.dev`

**Comment (premier post auto-comment)** :
```
Hey HN — solo dev here. I got tired of picking Claude Code skills from
directories that rank by GitHub stars rather than actual quality. So I built
Versuz, which benchmarks every public skill against the same task suite and
has 3 frontier LLMs grade the outputs (Bayesian Elo per category).

A few things that might be interesting :

- Multi-source scrape : GitHub Code Search caps at 1k results per query, so I
  layer Sourcegraph (no cap) + 14 awesome-* lists + 8 GitHub Topics. ~3k total
  items indexed so far.

- Anti-spam is real for submissions : GitHub PAT auth, owner-or-org-member
  check via `/orgs/X/members/Y`, rate limit 5/h, audit trail. You can only
  submit your own repos.

- The whole thing is consumable from the terminal :
  npx versuz search pdf
  npx versuz install pdf-extract-anthropic

  Or as native tools in Claude Code :
  claude mcp add versuz npx -y @versuz/mcp

- LLM judge runs ~$2.50/day for 100 skills × 5 tasks (Haiku 4.5 + DeepSeek V3
  + GPT-5 mini via OpenRouter). Free dev mode uses Groq Llama trio.

- Premium listings via Stripe Connect Express, authors keep 70%.

Free, MIT, open in public.

Code : https://github.com/versuzdev/versuz
Methodology : https://versuz.dev/methodology

Would love feedback on the judging approach (5-axis quality rubric + 3-LLM
ensemble for adversarial bench), and any skill you can't find that should be
in there.
```

**Tactical** :
- Submit Tuesday or Wednesday morning EST (9-10am EST = highest visibility window).
- NOT Friday or weekend.
- Stay actively responsive in comments for the first 4 hours.
- Don't beg for upvotes — don't even mention HN in tweet thread until later.

### 2.3 — Indie hackers

- [ ] Post dans le main forum [indiehackers.com/forum](https://indiehackers.com/forum)
- [ ] Title : *"Shipped a free adversarial benchmark for Claude skills — 1,700+ indexed, MIT"*
- [ ] Story angle : solo, 6 weeks, no funding, marketplace + judge engine + CLI + MCP
- [ ] Crosspost daily aux milestones (first 100 users, first sale, etc.)

---

## Wave 3 — Reddit + Product Hunt (Jour 7-14)

### 3.1 — Reddit posts (espacés sur la semaine)

Ne pas tout balancer le même jour, ban-risque sur cross-posting.

**Mardi · r/ClaudeAI** (le plus chaud)
- Title : *"I built a leaderboard for the 4,200 Claude skills on GitHub — npx versuz to install any of them"*
- Focus : Claude Code user perspective, CLI demo en haut
- Joindre 1 image + 1 GIF

**Mercredi · r/LocalLLaMA**
- Title : *"Adversarial benchmark for Claude skills — 3 LLM judges + Bayesian Elo, methodology inside"*
- Focus : methodology technique, lien vers /methodology
- Discussion attendue sur le judge ensemble

**Jeudi · r/programming**
- Title : *"How we benchmark 4,200 AI agent skills with 3 LLMs — open source, MIT"*
- Long-form (50-80 lignes), screenshots, architecture diagram

**Vendredi · r/SideProject**
- Title : *"6 weeks solo: open benchmark for AI agent skills (npx versuz)"*
- Story-first angle, indie hackers vibe

**Samedi · r/MachineLearning** (modération stricte)
- Title : *"[P] Versuz — public LLM-judged benchmark for Claude/Codex SKILL.md files (open dataset)"*
- Focus : dataset disponibilité, judge methodology
- Lien vers le JSON API public

### 3.2 — Product Hunt launch (jeudi)

PH launches sont fenêtre **Tuesday-Thursday** pour max trafic. Wednesday est sweet spot.

**Préparation 1 semaine avant** :
- [ ] Set up le profile, [pages.producthunt.com/upcoming](https://www.producthunt.com/launching) prepost
- [ ] DM 20-30 personnes (HN, Twitter followers, Discord) pour qu'ils upvotent à 12:01 PT
- [ ] 5 hi-res screenshots préparés (landing, marketplace, CLI demo, MCP demo, leaderboard)
- [ ] 1 vidéo 30s embed (la TikTok recyclée)
- [ ] Tagline (60 chars) : *"Open benchmark for Claude skills. Search, judge, install."*
- [ ] Description (260 chars max) : full pitch

**Jour J** :
- Submit 11:30 PM PT veille → mise en ligne 12:01 AM PT
- Post sur Twitter à 9 AM PT : "We're #X on Product Hunt — would love your support"
- Reply to every comment within 1h pendant les premières 6h

Cible : Top 5 daily. Top 1 daily = bonus mais pas critique.

---

## Wave 4 — Content recurrent (ongoing)

Objectif : install Versuz comme **the place** où tout le monde regarde quand un skill sort. Build d'authority par la cadence.

### 4.1 — Weekly digest (vendredi)

Tweet thread chaque vendredi à 14h CET :

> 📊 **Versuz Weekly · S{week_num}**
>
> Top 5 new skills indexed this week :
> 1. {slug-1} (★ {stars}, prior {prior})
> 2. {slug-2} ...
>
> Top 5 new CLAUDE.md :
> 1. ...
>
> Featured battle of the week : {skill-A} vs {skill-B} →
>
> Browse : versuz.dev/marketplace

Auto-générable depuis l'endpoint `/api/v1/skills?sort=recent&limit=5` + `/feed`.

### 4.2 — Bench cycle threads (quand un cycle finit)

Chaque fois qu'un bench cycle se termine (~quotidien) :

> 🏆 **Cycle {N} just finished — document category**
>
> Top 3 :
> 1. {slug} — Elo {1234}
> 2. ...
>
> Biggest mover : {slug} +{delta}
> Biggest drop : {slug} -{delta}
>
> Full ranking : versuz.dev/leaderboard/document
>
> Methodology : 3 LLM judges, 30 held-out tasks, weighted aggregation.

### 4.3 — TikTok / Reels (bi-hebdo)

Format 15-30s. Idées :

| Vidéo | Hook | CTA |
|---|---|---|
| "If you use Claude Code, watch this" | CLI search → install in 10s | "Try : npx versuz" |
| "I tested every PDF skill on GitHub" | Tableau de comparaison Elo | "Free at versuz.dev" |
| "Claude can install its own skills now" | MCP demo in real Claude Code | "claude mcp add versuz npx -y @versuz/mcp" |
| "How I submit a skill in 30 seconds" | versuz login + submit URL flow | "Get yours up at versuz.dev/submit" |
| "Why stars are a lie for skills" | Compare popular vs winning | Methodology link |

Outils :
- Logo animé via Veo 3 (prompt déjà drafté section ci-dessous)
- Recording terminal : [Asciinema](https://asciinema.org) + export GIF, ou OBS pour native screencast
- Music : non-copyrighted Lo-Fi tracks ou TikTok library

### 4.4 — Long-form content (mensuel)

| Mois | Plateforme | Angle |
|---|---|---|
| M+1 | dev.to | "Lessons from indexing 1.7k Claude skills" — multi-source scrape, dedup, rate limits |
| M+2 | Hashnode | "How I run an open LLM benchmark for $2/day" — judge cost optim, OpenRouter, prompt caching |
| M+3 | Medium | "Anti-spam for solo dev marketplaces : 8 layers" — submit API design |
| M+4 | dev.to | "Building a CLI that doesn't suck : npx versuz" — UX patterns |

### 4.5 — YouTube tuto (one-shot)

5-7 min video :
- Hook 30s : problème (4k skills, lequel marche)
- Solution 1 min : versuz.dev tour
- Demo 2 min : CLI install + MCP in Claude Code
- Submit 1 min : how to add your skill
- Methodology 1 min : 3 LLMs, 30 tasks, Elo
- CTA 30s : star repo, follow, sub

Pin en haut de la chaîne. Embed sur la landing page (peut-être en §02 Why).

---

## Assets visuels à préparer

### 1. Vidéo logo animé (Veo / Sora)

Recoller le prompt déjà drafté :

```
A 3-second animated intro for the Versuz logo on a clean bone-white background
(#F1ECDF). The logo is a minimalist mark made of two stylized ember flames :
a sharp black "V" silhouette on the left, and a 4-pointed orange ember star
(#C8401A) on the right, slightly overlapping.

Animation sequence :
- 0.0–0.4s : bone-white background only, perfectly still
- 0.4–1.2s : the black "V" mark draws itself in from the top-left with a
  quick ink-stroke motion, like a calligrapher's brush
- 1.0–1.6s : the orange ember star bursts in from the right with a soft glow
  + tiny spark particles, settles into position next to the V with a subtle
  bounce
- 1.6–2.4s : a single small ember spark drifts upward off the star, fades out
- 2.4–3.0s : hold the final composition perfectly still, slight ambient
  flicker on the ember

Aesthetic : editorial, premium, Instrument Serif vibe, square corners, no
shadows, no gradients except the ember glow. Camera locked. Render 1080×1920
9:16 vertical. Subtle film grain. Sound : ember crackle + chime at 1.6s.
```

### 2. Twitter banner (1500×500)

Composition :
- Background : bone (#F1ECDF)
- Left : Versuz wordmark grand (200px Instrument Serif)
- Right : capture marketplace en perspective tilted -8°
- Tagline middle : *"Skills go in. Only one wins."*
- Bottom : `versuz.dev · open benchmark for AI agent skills`

### 3. OG images (1200×630)

Une OG image par type de page (déjà partiellement implémenté) :
- Landing
- Marketplace
- Detail skill
- Detail claude_md
- Leaderboard category

Vérifier toutes les variantes avec [opengraph.xyz](https://opengraph.xyz) avant le lancement.

### 4. Screenshots pour press kit

Préparer un dossier `press-kit/` dans le repo avec :
- Logo SVG (color + mono + reverse)
- Wordmark SVG
- 4 hero screenshots (landing, marketplace, CLI, MCP)
- 1 architecture diagram
- Bio Toma + FlukX Studio
- Press release one-pager

URL : `versuz.dev/press` ou GitHub `/press-kit/`.

---

## Métriques à tracker

### Quotidien (premier mois)

| Métrique | Source | Cible J+30 |
|---|---|---|
| Visites uniques landing | Vercel Analytics gratuit | 5,000+ |
| GitHub stars | github.com/versuzdev/versuz | 500+ |
| GitHub watchers | same | 50+ |
| npm `versuz` downloads | npmjs.com/package/versuz | 1,000+/mois |
| npm `@versuz/mcp` downloads | same | 500+/mois |
| Submissions CLI uniques | DB `cli_submissions` count distinct github_user_id | 50+ users |
| Twitter followers | manual | +500 |
| Discord/Bluesky DMs entrants | manual | 20+ |

### Hebdomadaire

| Métrique | Cible |
|---|---|
| Skills indexed (croissance) | +50 / sem |
| Quality-judged (croissance) | +100 / sem |
| Bench cycles run | 1+ / jour |
| Premium listings | 5+ / mois |
| Premium sales | 1+ / mois (V0.5) |

### Indicateurs de succès "wow"

- [ ] HN top 10 daily
- [ ] PH top 5 daily
- [ ] Anthropic team member retweet
- [ ] 1k+ GitHub stars
- [ ] 10k+ npm downloads cumulés CLI
- [ ] 1 article tier-1 (TechCrunch, The Verge, Ars) — long shot, mais ambitieux

---

## Budget pub payée

**Recommandation v0 → v1 : ZÉRO.**

Ton produit est gratuit + open. Ton audience cible (Claude devs, AI builders) trouve via organic (Twitter, Discord, HN). Paid ads ne convertit pas pour ce stage.

**Quand envisager du paid ?**
- Quand tu monétises sérieusement les premium listings (V1.5 deja shippée mais besoin de volume)
- Quand tu as un cycle de bench solide qui produit du contenu hebdomadaire shareable
- Quand tu as un YouTube channel actif

**Premier test paid (V1, ~Q3)** :
- Twitter promoted tweet : 50€ sur audience "AI tools / dev / Claude / Cursor" → 2-3k impressions ciblées
- Mesurer CTR + signup → si > 2%, scaler à 200€/mois

**À éviter** :
- Google Ads (CPC trop élevé pour notre niche)
- LinkedIn Ads (mauvais ROI sur dev/indie hackers)
- Reddit Ads (mieux organic posts)

---

## Crisis playbook

### Si HN flop (< 50 points)
- Pas de panique. Repost dans 1-2 mois avec angle différent (e.g. "Lessons from 6 months running an LLM benchmark in public").
- Le 1er Show HN est rarement le bon — Linear, Stripe, Vercel ont tous re-submitted.

### Si bench cycle bug en public
- Post mortem transparent sur Twitter : "We just shipped a broken cycle, here's what happened, here's the fix". Authenticity > pretense.

### Si abus de submit
- Le rate limit + ownership check devrait bloquer 99%. Si bot bypass :
  - Lower rate limit (5→3/h)
  - Add captcha sur web submit
  - Banlist GitHub IDs via `cli_submissions.github_user_id`

### Si claude.ai/anthropic ship un compétiteur
- Vu leur business model B2B, c'est complémentaire. On reste l'agrégateur indépendant.
- Annoncer un partenariat / cross-link si possible.
- Si ils kill Versuz : focus shift vers Codex / Cursor / autres SKILL.md ecosystems.

---

## Calendrier idéal (semaine de launch)

| Jour | Heure CET | Action |
|---|---|---|
| Lundi | 9h | Twitter thread (10 tweets) |
| Lundi | 10h | Bluesky thread (5 posts) |
| Lundi | 13h | Show HN submit |
| Lundi | 14h | Anthropic Discord post |
| Lundi | toute la journée | Reply HN comments + DMs |
| Mardi | 10h | r/ClaudeAI post |
| Mardi | 17h | Indie hackers post |
| Mercredi | 9h | r/LocalLLaMA post |
| Mercredi | 18h | Reply roundup tweet |
| Jeudi | 9h | r/programming long-form |
| Jeudi | 12h | Product Hunt launch (11:30 PT submit) |
| Vendredi | 11h | r/SideProject post |
| Vendredi | 14h | First Weekly Digest tweet |
| Samedi | — | Repos, monitor |
| Dimanche | 15h | Recap tweet : "What worked, what didn't" |

---

## Post-launch (semaines 2-12)

Maintenir cadence :
- 1 thread Twitter / semaine sur un angle technique
- 1 weekly digest le vendredi
- 1 TikTok/Reel par semaine
- 1 long-form blog par mois
- 1 update du leaderboard quand un cycle change le top 10

Mesurer le drop-off après week 1 (normal : ~70% du trafic). Pivoter content vers ce qui marche le plus.

À 3 mois : si > 500 GitHub stars + > 2k npm downloads/mois, on est sur la bonne voie pour V1 monetization.

---

*Made with ember by [FlukX Studio](https://flukxstudio.fr).*
