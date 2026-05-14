# Versuz — Social Content Plan

> 4 semaines de content social organic, multi-format. Solo dev, $0 ad budget. ElevenLabs voice + phone screen capture + ads existantes.

---

## Stack production

| Outil | Usage | Coût |
|---|---|---|
| **ElevenLabs** | Voiceover anglais (voix "Adam" ou "Brian Hewitt") | $5/mo Starter (30k chars) |
| **iPhone Screen Recording** | Filmer écran + voice mémo | $0 |
| **CapCut** ou **DaVinci Resolve** | Montage final | $0 |
| **Suno AI** ou **Pixabay Music** | Background music | $0-10/mo |
| **Submagic** ou captions natives | Subtitles auto | $0-15/mo |
| **OBS Studio** | Screen recording sur PC (alternative iPhone) | $0 |

**Budget total** : $20/mo max. Tout est organic, pas de paid ads.

---

## Voix ElevenLabs recommandées

Pour la cohérence brand (calme, premium, légère autorité) :

- **Brian Hewitt** (homme, US, posé, autorité bienveillante) — défaut, voix Versuz officielle
- **Charlotte** (femme, UK, intelligente, neutre) — pour variation, deep-dives
- **Adam** (homme, US, plus énergique) — pour les hook punchy 5s

**Settings** : Stability 60-70%, Similarity boost 75%, Style 30% (pour de l'expressivité sans devenir robotique).

---

## 5 piliers de contenu

| Pilier | Objectif | Format type |
|---|---|---|
| **Manifesto** | Hook + brand "Skills go in. Only one wins." | Ads existantes (anthem/reel) |
| **Demo** | Montrer le produit en action | Screen recording 15-30s |
| **Insights/data** | Stats surprenantes du registre | Cards animées 10-20s |
| **Build in public** | Coulisses, decisions, struggles | Vlog phone 30-60s |
| **Community** | Featured skills, créateurs | Reaction + showcase 20s |

**Mix recommandé par semaine** : 2 demo, 1 manifesto, 1 insight, 1 build-in-public, 1 community = 6 vidéos/sem (~1/jour).

---

## 4 semaines · contenu jour par jour

### Semaine 1 — Launch wave (visibilité brute)

| Jour | Pilier | Format | Plateformes |
|---|---|---|---|
| J1 (lundi) | Manifesto | **anthem.mp4** + voiceover + music | LinkedIn (launch post) + Insta Reel + TikTok |
| J2 | Demo | Screen recording iPhone : `npx versuz install nextjs-skill` (15s) | TikTok + Insta Reel + Twitter |
| J3 | Insight | Card animée : "We benchmarked 100,000 AI skills. Here's what we found" | LinkedIn (carousel) + Twitter thread |
| J4 | Build-in-public | Vlog phone : "Day 4 of launching Versuz, here's what's working" | LinkedIn + Twitter |
| J5 | Demo MCP | Screen rec : Claude Code utilisant le MCP Versuz pour load un skill | TikTok + Insta + LinkedIn |
| J6 | Manifesto | **reel.mp4** + son trending TikTok | TikTok + Insta |
| J7 | Recap | Carousel "Week 1 numbers: X skills, Y bench cycles, Z signups" | LinkedIn + Twitter |

### Semaine 2 — Engagement (depth + interaction)

| Jour | Pilier | Format | Plateformes |
|---|---|---|---|
| J8 | Demo | Tutorial : "How to find the best SKILL.md for React" (45s) | YouTube Shorts + TikTok |
| J9 | Insight | "Top 5 most-downloaded skills this week" | LinkedIn (carousel) + Insta |
| J10 | Community | Skill spotlight : feature 1 author + interview clip | LinkedIn + Twitter |
| J11 | Build-in-public | "Why I picked Haiku 4.5 over Sonnet for judging" (tech) | LinkedIn long-form + Twitter |
| J12 | Demo CLI | iPhone film écran PC : terminal montrant install + run d'un skill | TikTok + Insta |
| J13 | Manifesto | **judgesLinkedIn.mp4** | LinkedIn |
| J14 | Recap | "Week 2 wins + lessons" | LinkedIn + Twitter |

### Semaine 3 — Educational (long-form, SEO)

| Jour | Pilier | Format | Plateformes |
|---|---|---|---|
| J15 | Insight | Blog post 1500 mots : "Our benchmark methodology" | LinkedIn article + dev.to + Twitter |
| J16 | Demo | "How to monetize your SKILL.md on Versuz" (45s) | TikTok + Insta + LinkedIn |
| J17 | Community | Featured creator interview (vlog 90s) | LinkedIn + Insta IGTV |
| J18 | Build-in-public | "The 3 bugs that almost killed our launch" | Twitter thread + LinkedIn |
| J19 | Demo MCP | Detailed walkthrough : MCP setup in Claude Code (60s) | YouTube Shorts + TikTok |
| J20 | Manifesto | **logoReveal.mp4** with cinematic music | Insta + TikTok |
| J21 | Recap | Numbers + roadmap teaser | LinkedIn |

### Semaine 4 — Scale + community (sustaining)

| Jour | Pilier | Format | Plateformes |
|---|---|---|---|
| J22 | Insight | "Which AI agent has the best skills?" (comparison) | LinkedIn carousel + Twitter |
| J23 | Demo | Speed-run : install + use a skill in 30s | TikTok + Insta |
| J24 | Community | UGC : repost users qui ont tag Versuz | All |
| J25 | Build-in-public | "What's next : V2 features sneak peek" | LinkedIn + Twitter |
| J26 | Demo Vercel | "How $0/mo infra runs a 100k-item AI benchmark" | dev.to + Twitter + LinkedIn |
| J27 | Manifesto | **anthem.mp4** v2 (re-edit with new music + caption) | Insta + TikTok |
| J28 | Recap | Month 1 retrospective | LinkedIn long post + Twitter |

---

## Détail des formats clés — shot lists précises

> Pour chaque vidéo : **ce que tu films** + **comment** + **timing** + **voiceover** + **caption**.
> Sigle 📱 = filmer avec téléphone | 🖥️ = screen record PC | 🎬 = ad existante mp4

### Format A — Screen recording iPhone (CLI demo) 🖥️📱

**2 options de capture** :

**A1 — Le plus simple : OBS Studio sur PC (free, Windows)**
- Download : https://obsproject.com
- Source : Display Capture → ton écran PC
- Output : MP4 1080×1920 (vertical) ou 1920×1080 (horizontal)
- Bonus : enregistre directement la voix mic en même temps

**A2 — iPhone face à l'écran (avec trépied)**
- iPhone caméra arrière, 4K 30fps, mode portrait vidéo (1080×1920)
- Distance 60cm, face à l'écran, pas d'angle
- Lumière naturelle sur l'écran (pas de reflet)
- App : Caméra native iOS, pas de filtre

**Setup terminal Windows recommandé** :
- **Windows Terminal** (pas cmd) → Settings → Color scheme : "Tango Dark" ou theme custom Versuz
- Font : `JetBrains Mono` ou `Cascadia Code` taille **22pt** (lisible mobile)
- Background : `#0a0908` (ink Versuz)
- Texte : `#f2eee6` (bone)
- Cursor : ember `#c2410c`
- Window size : 800×1200 portrait, centré écran
- Avant de filmer : `clear` + zoom navigateur 100%

---

## 🎬 SHOT LIST — Vidéo par vidéo, semaine 1

### J1 — Launch anthem 🎬 (LinkedIn + Insta + TikTok)

**Source** : `.ads/exports/anthem/anthem.mp4` (existante, 25-30s)

**Action** :
1. Ouvre CapCut, importe `anthem.mp4`
2. Ajoute audio piste : voiceover ElevenLabs (script ci-dessous) à -3dB
3. Ajoute audio piste 2 : music Pixabay "minimal-tech" à -18dB
4. Caption "Skills go in. Only one wins." en text overlay aux dernières 5s
5. Export 1080×1920 (vertical pour Reels/TikTok) et 1920×1080 (LinkedIn)

**Voiceover ElevenLabs (Brian Hewitt, 30s)** :
```
Every AI agent needs skills.
SKILL.md. CLAUDE.md. Instructions that shape behavior.
Today, thousands of these files sit scattered across GitHub.
Most are average. A few are exceptional.
Versuz is the open public benchmark that ranks them all.
Three judges. Five axes. Transparent methodology.
Skills go in. Only one wins.
versuz.dev.
```

---

### J2 — CLI quick install 🖥️ (TikTok + Insta + Twitter)

**Cible** : "Install a skill in 5 seconds"

**Ce que tu films** : Windows Terminal en plein écran via OBS Studio

**Shot list (15s)** :
```
[0-2s]   Texte écran overlay  : "Need a Next.js SKILL.md?"
         (caption noir sur ember, font display 60pt, fade-in)
[2-3s]   Terminal vide, cursor pulse
[3-6s]   Tape : npx versuz search nextjs
         → résultats s'affichent (5 lignes max visibles)
[6-9s]   Tape : npx versuz install nextjs-app-router-expert
         → barre de progression → "✓ installed"
[9-12s]  Tape : cat ~/.claude/skills/nextjs-app-router-expert/SKILL.md | head -10
         → SKILL.md affiché, premier paragraphe visible
[12-15s] Logo Versuz fade-in centre écran + tagline
         "Skills go in. Only one wins."
         versuz.dev URL en bas
```

**Voiceover (12s)** :
```
Need a SKILL.md for Next.js?
With Versuz, find the top-ranked one and install it in 5 seconds.
Free CLI, free MCP, open data.
versuz.dev.
```

**Music** : Pixabay "tech-pulse" ou "minimal-electronic" à -18dB

---

### J3 — Insight carousel 🖼️ (LinkedIn + Twitter thread)

**Format** : 10 slides Figma/Canva 1080×1350 portrait

**Ce que tu screenshot** :
1. Slide 1 — Hook : "We benchmarked 100,000 AI skills." (gros chiffre + background bone)
2. Slide 2 — Source data : `/admin` overview screenshot (le hero "Coverage funnel" est parfait)
3. Slide 3 — Top categories chart (capture du `/marketplace` filtres avec counts)
4. Slide 4 — Best skill of the week (screenshot d'une skill page top-ranked)
5. Slide 5 — Most contested category (le screenshot du leaderboard pour `code`)
6. Slide 6 — Quote d'un user / auteur si possible
7. Slide 7 — Methodology preview (extrait `/methodology`)
8. Slide 8 — Cost stat : "$25/month to run this"
9. Slide 9 — CTA : "Browse free at versuz.dev"
10. Slide 10 — Tagline + signature

**Outil** : Canva (template "LinkedIn carousel" gratuit) ou Figma.

**Pages à screenshot** (avec **Cmd+Shift+5** Mac ou **Win+Shift+S** Windows) :
- `https://versuz.dev/admin` → la section "Coverage funnel"
- `https://versuz.dev/marketplace` → filter par category
- `https://versuz.dev/leaderboard` → top entries
- `https://versuz.dev/methodology` → la section judges
- `https://versuz.dev/admin/automation` → "30-day spend" $25 cap

---

### J4 — Build in public Day 4 📱 (LinkedIn + Twitter)

**Format** : Selfie phone face-cam, 60-90s

**Setup tournage** :
- iPhone à hauteur d'yeux, mode portrait vidéo (1080×1920)
- Lumière naturelle derrière la caméra (fenêtre face à toi)
- Fond : ton bureau visible (authentique, pas de green screen)
- Mic : EarPods filaires ou AirPods (mic intégré téléphone OK si silence dans la pièce)
- Tenue : casual, pas de costard

**Shot list (75s)** :
```
[0-3s]   Hook face-cam : "Day 4 of launching Versuz, here's what surprised me."
[3-15s]  Insight 1 : ex "12 users found a bug in the bench engine within 12h.
         Open source community works."
[15-30s] Insight 2 : ex "$25/month total infra cost. People didn't believe me."
[30-45s] Insight 3 : ex "First premium skill sold today. $0.99. Felt huge."
[45-60s] Lesson : "What I'd do differently — [un truc concret]"
[60-75s] CTA : "Follow for daily updates. versuz.dev if you build with AI agents."
```

**Voiceover** : tu parles directement, pas d'ElevenLabs. Accent FR léger = bonus authenticité.

---

### J5 — MCP demo 🖥️ (LinkedIn + TikTok + Insta)

**Cible** : "Your AI agent can now discover and install skills automatically"

**Ce que tu films** : VS Code avec Claude Code + MCP versuz configuré

**Prérequis** :
1. Install MCP : `claude mcp add versuz npx -y @versuz/mcp`
2. Vérifie qu'il marche : tape une question dans Claude qui force l'usage du MCP

**Shot list (45s)** :
```
[0-3s]   Texte overlay : "Watch Claude Code install the best skill for you"
[3-6s]   VS Code en plein écran, panneau Claude Code visible à droite
[6-12s]  Tape dans Claude : "Find me a skill to help test Stripe payments"
[12-25s] Claude répond, tu vois en background le MCP appelé (notification subtle)
         "🔍 Searching Versuz benchmark..."
         "✓ Found 'stripe-payment-tester' — ranked #2 in payments category"
         "Installing..."
         "✓ Installed. Want me to use it?"
[25-35s] Tu valides "yes", Claude utilise le skill et résout la tâche
[35-40s] Zoom sur le résultat final
[40-45s] Logo + tagline + versuz.dev
```

**Voiceover (35s)** :
```
Claude Code can now find and install the best AI agent skills for any task.
This is the Versuz MCP server.
Three judges score every skill on five axes.
Top results win, ready to install.
No more copying random SKILL.md files from GitHub.
Skills go in. Only one wins.
versuz.dev.
```

---

### J6 — Reel snappy 🎬 (TikTok + Insta)

**Source** : `.ads/exports/reel/reel.mp4`

**Action** : re-upload natif sur TikTok avec un trending sound (cherche dans "Sounds" de TikTok : `aesthetic`, `tech build-up`, `corporate cinematic`)

**Caption courte (TikTok)** :
```
skills go in. only one wins 🥊

versuz.dev — free for devs

#ai #claudecode #cursor #devtools #aitools
```

---

### J7 — Week 1 numbers carousel 🖼️ (LinkedIn + Twitter)

**Format** : 6 slides Canva 1080×1350

**Ce que tu screenshot** :
1. Slide 1 — Title "Versuz · Week 1"
2. Slide 2 — Screenshot `/admin` overview (le KPI strip Skills + CLAUDE.md + tasks)
3. Slide 3 — Stat traffic : Vercel Analytics → "X visitors" (capture le chart)
4. Slide 4 — Stat npm : `npm install versuz` count via https://npm-stat.com/charts.html?package=versuz
5. Slide 5 — Best moment / quote / DM screenshot
6. Slide 6 — "Week 2 incoming : [teaser feature]"

---

## 🎬 SHOT LIST — Vidéo par vidéo, semaines 2-4

### J8 — Tutorial "How to find the best SKILL.md for React" 🖥️ (YouTube Shorts + TikTok)

**Ce que tu films** : Navigateur sur `versuz.dev/marketplace`, OBS plein écran

**Shot list (45s)** :
```
[0-3s]   Texte overlay : "Finding the best React skill in 30 seconds"
[3-6s]   Browser ouvert sur versuz.dev/marketplace
[6-10s]  Click sur filter "React" → grid filtre instant
[10-15s] Scroll les top 3 results (highlight top one ember stripe)
[15-22s] Click sur le premier skill → detail page
         → highlight "Bench score", "Verification", "License"
[22-30s] Click "Install" button → modal montre `npx versuz install <slug>`
[30-38s] Cut au terminal → tu run la commande → ✓ installed
[38-42s] Back to claude code, le skill est dispo
[42-45s] Logo + versuz.dev
```

---

### J9 — Top 5 most-downloaded skills cette semaine 🖼️ (LinkedIn carousel)

**Ce que tu screenshot** : 5 detail pages skills + page leaderboard

**6 slides** :
1. Title : "Top 5 Claude Code skills · Week 2"
2-6. Une slide par skill : screenshot detail page + ton court commentaire

---

### J10 — Skill spotlight + featured author 📱 (LinkedIn + Twitter)

**Format** : Vlog 60s

**Setup** :
- DM un auteur d'un skill populaire (ex : top featured)
- Demande-lui 2-3 phrases : pourquoi il a créé ce skill, comment il l'utilise
- Tu fais une vidéo selfie qui présente le skill + lit ses phrases en quote

---

### J11 — Why Haiku 4.5 over Sonnet (tech post) 🖼️ (LinkedIn long-form + Twitter)

**Format** : Texte long LinkedIn + thread Twitter

**Ce que tu screenshot pour illustrer** :
- Capture d'un `judge_disagreement` page (`/skills/<slug>`)
- Capture des coûts dans `/admin/automation` "30-day spend"
- Capture du tableau methodology comparatif

---

### J12 — Terminal CLI day-in-the-life 🖥️📱 (TikTok + Insta)

**Ce que tu films** : iPhone face à ton écran PC (trépied), terminal en plein écran

**Shot list (30s)** :
```
[0-5s]   You're at your desk, coffee, code on the screen, lo-fi music
         (filmed phone wide shot)
[5-10s]  Zoom sur l'écran : tu run `npx versuz top --category=react`
[10-15s] Le terminal affiche le top 10
[15-25s] Tu install le top 1, tu l'utilises dans VS Code (cut entre les 2)
[25-30s] Logo + tagline + versuz.dev
```

---

### J13 — Judges showcase 🎬 (LinkedIn)

**Source** : `.ads/exports/judgesLinkedIn/judgesLinkedIn.mp4`

**Action** : ajoute voiceover ElevenLabs explicating les 3 judges + leur cost

**Voiceover (20s)** :
```
We picked three judges: Anthropic Haiku 4.5, DeepSeek V4, and OpenAI GPT-5 mini.
Together, they cost less than two dollars per cycle.
With Opus or GPT-5 full, that number would be ten times higher.
We picked the cheapest models that still agree with Opus over 85 percent of the time.
Open methodology, open data.
versuz.dev.
```

---

### J15 — Blog methodology deep-dive 📝 (LinkedIn article + dev.to)

**Format** : 1500 mots écrits, publié sur dev.to + LinkedIn article + ajouté à `/blog/methodology` sur le site

**Sections** :
1. Why benchmark AI agent skills (the problem)
2. Our 5-axis scoring (with formula)
3. Why 3 judges (and why these 3)
4. How we keep cost under $25/month
5. Why open data matters

**Screenshots à intégrer** : automation page (cost chart), methodology page actuelle, judge disagreement page.

---

### J16 — Monetize your SKILL.md (45s) 🖥️ (TikTok + Insta + LinkedIn)

**Ce que tu films** : navigateur sur `versuz.dev/submit` puis `versuz.dev/profile/earnings`

**Shot list** :
```
[0-3s]   Hook : "You can sell your SKILL.md on Versuz"
[3-12s]  Browser /submit, tu remplis le form en speed (skill name, file, $4.99 price)
[12-18s] Submit confirmation
[18-25s] Cut to /profile/earnings → mock or real earnings page
[25-30s] Stripe payout screenshot
[30-40s] Text overlay : "70/30 split. You keep 70%. Versuz takes 30%."
[40-45s] CTA : "submit your skill at versuz.dev/submit"
```

---

### J17 — Featured creator interview 📱 (LinkedIn + Insta)

**Format** : Vlog 90s, tu présentes un créateur featured

**Setup** :
- Si possible : appel Zoom avec le créateur, screenshot ou enregistre 30s de leur réponse
- Ou : tu lis leur quote face-cam si pas dispo

---

### J19 — MCP walkthrough 60s 🖥️ (YouTube Shorts + TikTok)

**Setup terminal** : Claude Code dans VS Code, MCP versuz activé

**Shot list (60s)** :
```
[0-5s]   "Setup MCP Versuz in Claude Code in 60 seconds"
[5-15s]  Tape : claude mcp add versuz npx -y @versuz/mcp
[15-20s] Confirmation MCP added
[20-30s] Restart Claude (cmd palette)
[30-40s] First query: "What skills are available for Python?"
[40-50s] Claude lists 5 top skills from Versuz benchmark
[50-55s] You ask : "Install the top one"
[55-60s] Done + versuz.dev
```

---

### J20 — Logo reveal 🎬 (Insta + TikTok)

**Source** : `.ads/exports/logoReveal/logoReveal.mp4`

**Action** : re-upload sur TikTok avec son trending "cinematic build-up"

---

### J22 — Comparison "Best skills per agent" 🖼️ (LinkedIn carousel + Twitter)

**Format** : 8 slides

**Ce que tu screenshot** :
- `/marketplace` filter Claude Code → top 3
- `/marketplace` filter Cursor → top 3
- `/marketplace` filter Codex → top 3
- Conclusion : "Each agent has skills it's uniquely good at"

---

### J23 — Speed-run 30s 📱🖥️ (TikTok + Insta)

**Shot list (30s)** :
```
[0-2s]   "Find + install + use the best AI skill in 30 seconds. Start."
[2-8s]   Open versuz.dev → marketplace
[8-14s]  Pick top React skill → click Install
[14-22s] Cut to terminal → npx versuz install <slug> → ✓
[22-28s] Cut to Claude Code → ask a React question → skill kicks in
[28-30s] "Done. versuz.dev."
```

---

### J25 — V2 sneak peek 📱 (LinkedIn + Twitter)

**Format** : Selfie 60s

**Contenu** : Annonce 2-3 features V2 (ex : team workspaces, custom skill packs, MCP discovery)

---

### J26 — How we run a 100k benchmark for $0/mo infra 🖼️ (dev.to + Twitter + LinkedIn)

**Format** : Article 1200 mots + screenshots :
- `/admin/automation` (the $25 cap)
- GH Actions free tier usage
- Supabase Free downgrade
- Vercel Hobby plan

---

### J27 — Anthem v2 🎬 (Insta + TikTok)

**Source** : `.ads/exports/anthem/anthem.mp4` mais re-edit avec :
- Nouveau voiceover ElevenLabs (femme cette fois, voice "Charlotte" UK pour variation)
- Music différente (Suno custom track si possible)
- Caption rotative ("Skills go in. Only one wins. → 100,000+ ranked → versuz.dev")

---

### J28 — Month 1 retrospective 📱🖼️ (LinkedIn long post + Twitter thread)

**Format** : Selfie 90s + carousel 10 slides

**Ce que tu screenshot** :
- Admin overview après 1 mois
- Vercel analytics monthly
- npm stats
- Best/worst moments

---

## 📋 Récap par type de capture

### Filmer ton écran PC (OBS Studio)
- J2 (CLI install)
- J5 (MCP demo Claude Code)
- J8 (Browser marketplace tutorial)
- J16 (Submit + earnings)
- J19 (MCP setup walkthrough)

### Filmer avec iPhone face écran PC (trépied)
- J12 (Day-in-the-life mix wide shot + zoom)
- J23 (Speed-run multi-cut)

### Filmer selfie iPhone (face-cam)
- J4 (Build in public day 4)
- J10 (Skill spotlight)
- J17 (Featured creator)
- J25 (V2 sneak peek)
- J28 (Month 1 retro)

### Ads existantes (.ads/exports/)
- J1 anthem (LinkedIn launch)
- J6 reel (TikTok snack)
- J13 judgesLinkedIn (LinkedIn deep)
- J20 logoReveal (Insta aesthetic)
- J27 anthem v2 (re-edit)

### Carousels / screenshots (Canva ou Figma)
- J3 insights carousel
- J7 week 1 numbers
- J9 top 5 skills
- J22 comparison per agent
- J28 retrospective

---

## Format D — Carousel insights LinkedIn (template)

10 slides max, format **1080×1350 portrait** (LinkedIn préfère portrait).

**Structure type** :
1. Hook slide (gros chiffre + question)
2-8. Data points, 1 par slide, minimal design
9. Insight / takeaway
10. CTA : versuz.dev + follow @Thomas

**Outils** : Canva (templates "LinkedIn carousel") gratuit, ou Figma.

**Conseils** :
- Police : Instrument Serif pour les titres, Inter ou JetBrains Mono pour le texte
- Palette : `#f2eee6` bg, `#14120e` text, `#c2410c` accents
- 1 idée par slide, max 12 mots

---

## Scripts ElevenLabs par format (à copier-coller)

### Anthem voiceover (30s)

```
Every AI agent needs skills.
SKILL.md. CLAUDE.md. Instructions that shape behavior.
Today, thousands of these files sit scattered across GitHub.
Most are average. A few are exceptional.
Versuz is the open public benchmark that ranks them all.
Three judges. Five axes. Transparent methodology.
Skills go in. Only one wins.
versuz.dev.
```

### Demo CLI voiceover (15s)

```
Want the best SKILL.md for any task?
npx versuz search [keyword] · pick the top result · install in seconds.
Free CLI, MCP server, open data.
versuz.dev.
```

### MCP demo voiceover (30s)

```
Your AI agent can now discover and install the best skills automatically.
The Versuz MCP server lets Claude Code, Cursor, and any agent search 
our benchmark, install the top-ranked skill for any task, and apply it instantly.
No more copy-paste from random GitHub repos. 
Verified, ranked, ready.
versuz.dev.
```

### Build-in-public — Day 1 (45s)

```
Day one of launching Versuz.
For the past four months, I've been building an open benchmark for AI agent skills.
A hundred thousand SKILL.md and CLAUDE.md files, scraped from public GitHub.
Three judges rate each one. The best ones rise to the top.
Today, it's live. Free CLI. Free MCP. Self-funded, no VC, indie all the way.
Skills go in. Only one wins. 
If you build with Claude Code, Cursor, or any AI agent: versuz.dev.
```

---

## Captions templates par plateforme

### TikTok caption (sous la vidéo)

```
Skills go in. Only one wins 🥊

versuz.dev — free CLI + MCP for AI agent skills

#AI #ClaudeCode #Cursor #DevTools #AItools
```

### Instagram Reel caption

```
We just launched Versuz — the open public benchmark for AI agent skills.

Skills go in. Only one wins.

100,000+ SKILL.md and CLAUDE.md files scraped, judged, and ranked transparently. Free CLI: npx versuz install <slug>. Free MCP server. Open data.

→ versuz.dev

#AI #AItools #ClaudeCode #Cursor #DevTools #LLM #Coding #BuildInPublic #IndieHacker #AIagents #PromptEngineering #OpenSource #TechStartup #Programmer #SoftwareDevelopment
```

### LinkedIn caption

```
We just launched Versuz.

Skills go in. Only one wins.

For the past four months, I've been building an open public benchmark for the SKILL.md and CLAUDE.md files that power Claude Code, Cursor, Codex, and every modern AI coding agent.

What's inside:
↳ ~100,000 SKILL.md + CLAUDE.md scraped from public GitHub
↳ 3-judge LMArena-style scoring (Haiku 4.5 + DeepSeek V4 + GPT-5 mini)
↳ Transparent ranking with full bench history
↳ Free CLI: npx versuz install <slug>
↳ Free MCP server for agents that want to load skills programmatically
↳ Open data, open methodology

Self-funded. No VC. No lock-in.

→ versuz.dev

#AIagents #DevTools #ClaudeCode
```

### Twitter/X caption

```
launched Versuz today

100,000+ AI agent skills scraped, ranked, and free to install

skills go in. only one wins.

versuz.dev
```

---

## Tools & links rapides

- **ElevenLabs** : https://elevenlabs.io — voiceovers
- **Submagic** : https://submagic.co — subtitles auto AI
- **CapCut** : https://capcut.com — montage gratuit
- **Pixabay Music** : https://pixabay.com/music — music libre commercial
- **Suno** : https://suno.ai — AI music custom
- **Canva** : https://canva.com — carousels LinkedIn
- **Figma** : https://figma.com — design assets

---

## Métriques à tracker (sem 1-4)

| Métrique | Source | Target sem 4 |
|---|---|---|
| Visiteurs versuz.dev | Vercel Analytics | 5,000 |
| `npm install versuz` | npm stats | 200 |
| Submit form completions | Supabase | 30 |
| LinkedIn followers @Thomas | LinkedIn | 500 |
| TikTok views totales | TikTok dashboard | 50k |
| Insta followers @versuz | Insta | 200 |
| Twitter followers | X dashboard | 300 |
| Premium sales | Stripe | 5 |

Si tu pars de 0 sur les socials, ces targets sont ambitieux mais atteignables avec content quotidien + engagement (commenter sur les comptes ciblés du briefing précédent).

---

## Prochain step immédiat

1. **Inscris-toi à ElevenLabs Starter** ($5/mo) — génère les voiceovers ci-dessus dans la voix Brian Hewitt
2. **Télécharge 3-4 tracks music** depuis Pixabay (cherche : "minimal tech", "cinematic build-up", "corporate ambient")
3. **Lance CapCut** sur les 7 mp4 existants → ajoute la voiceover + music + caption "Skills go in. Only one wins."
4. **Post J1 dimanche soir** (meilleur jour pour LinkedIn) : anthem + caption LinkedIn du template
5. **Post J2 lundi midi** : screen rec CLI demo + caption TikTok

Tu fais ces 5 étapes ce weekend, tu lances officiellement lundi.
