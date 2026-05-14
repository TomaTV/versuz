# Versuz · SEO Setup

> Tout ce qu'il faut faire pour apparaître dans Google. 1h de boulot, gains massifs sur les 3-6 prochains mois.

---

## Déjà en place (côté code)

- ✅ `robots.txt` dynamique (`src/app/robots.js`)
- ✅ `sitemap.xml` dynamique avec skills + claude_md (`src/app/sitemap.js`)
- ✅ Meta `description`, `title`, `keywords` au root + `template` pour titres dérivés
- ✅ Open Graph image dynamique (`src/app/opengraph-image.js`) — nouvelle version V1.5
- ✅ JSON-LD structured data (Organization + WebSite + SearchAction) dans `layout.js`
- ✅ Canonical URLs (auto via Next 16 + `metadataBase`)
- ✅ Per-skill OG images (`src/app/skills/[slug]/opengraph-image.js`)
- ✅ Per-claude_md OG images
- ✅ RSS feeds `/feed/skills` et `/feed/claude-md` (signalés via `alternates`)
- ✅ `lang="en"` sur `<html>`

---

## À faire manuellement (toi, après deploy)

### 1. Google Search Console (15 min, critique)

1. Va sur https://search.google.com/search-console
2. **Add property** → "Domain" (préféré) ou "URL prefix" (fallback)
3. Si "Domain" choisi : Google te donne un enregistrement DNS TXT à ajouter chez Cloudflare → ajoute-le → valide
4. Si "URL prefix" : Google te donne un fichier HTML OU un meta tag → recommande le meta tag :
   - Tu reçois `<meta name="google-site-verification" content="ABC123..." />`
   - Copie la valeur `ABC123...` dans **Vercel → Env vars Production** :
     ```
     NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=ABC123...
     ```
   - Redeploy → Vercel injecte automatiquement le meta tag (déjà câblé dans `layout.js`)
   - Retour GSC → bouton **Verify** → vert
5. Une fois vérifié → menu gauche **Sitemaps** → ajoute `sitemap.xml` → submit
6. Menu **URL inspection** → teste `https://versuz.dev` → "Request indexing" pour forcer un crawl rapide
7. Répète "Request indexing" pour 5-10 URLs prioritaires :
   - `/marketplace`
   - `/leaderboard`
   - `/methodology`
   - `/about`
   - `/pricing`
   - `/skills/<top-skill-slug>`
   - `/claude-md/<category>/<top-slug>`

### 2. Bing Webmaster Tools (5 min)

Bing = 6% du marché desktop, et **DuckDuckGo + ChatGPT search** utilisent Bing.

1. https://www.bing.com/webmasters → Sign in
2. **Add a site** → `https://versuz.dev`
3. Tu peux **Import from Google Search Console** si déjà fait (zero effort)
4. Sinon : ajouter un meta tag de vérification — même pattern, env var `NEXT_PUBLIC_BING_SITE_VERIFICATION` (faudra l'ajouter dans `layout.js` aussi si tu veux)
5. Submit `sitemap.xml`

### 3. Google Business / Knowledge Panel (optionnel, perso)

Si tu veux que ton nom (Thomas Devulder / FlukX Studio) apparaisse à droite quand on tape "Versuz" :

- Crée un profil **Google Business** lié à FlukX Studio
- Lie-le à `versuz.dev` via Search Console

Pas critique pour V1.5, à faire dans 1-2 mois quand Versuz aura quelques mentions.

---

## SEO content strategy (4 semaines)

### Page-level optimisation

Chaque page principale doit avoir :

- **Titre unique** (`<title>` ≤ 60 chars, keyword au début)
- **Meta description unique** (≤ 160 chars, hook + valeur)
- **H1 unique** par page
- **Internal links** vers 2-3 pages connexes minimum

#### Audit rapide à faire

| Route | Title actuel | Action |
|---|---|---|
| `/` | ✅ "Versuz — AI agent skills leaderboard, judged by 3 frontier models" | OK |
| `/marketplace` | À vérifier | Ajouter `export const metadata = { title: "...", description: "..." }` |
| `/leaderboard` | À vérifier | Idem |
| `/methodology` | À vérifier | Idem |
| `/pricing` | À vérifier | Idem |
| `/skills/[slug]` | Auto via template ?, vérifier | Doit inclure le nom du skill + "skill for ..." |
| `/claude-md/[cat]/[slug]` | Auto | Idem |

### Keywords cibles (prioritaires)

Tier 1 (compétition forte mais traffic massif si on rank) :
- `claude code skills` (rank likely top 10 quickly, low competition)
- `cursor skills`
- `claude.md`
- `skill.md`
- `AI agent skills`
- `claude code marketplace`

Tier 2 (long-tail, easy wins) :
- `best skill for [task]` (e.g. `best skill for pdf extraction`, `best skill for stripe integration`)
- `claude.md for nextjs`
- `claude.md template`
- `mcp server registry`
- `cursor rules vs skills`

Stratégie : créer des landing pages SEO-friendly pour les top 20 use cases (pages détail skill + une category overview page) + 4-5 blog posts comparatifs.

### Blog posts à écrire (4 sem, 1/sem)

1. **"How we judge 100,000 AI agent skills for $25/month"** — methodology deep-dive, dev.to + LinkedIn article + site `/blog/methodology`
2. **"SKILL.md vs CLAUDE.md vs Cursor Rules — what's the difference?"** — comparatif, ranking-bait
3. **"The 5 most-downloaded Claude Code skills in [month]"** — newsjacking
4. **"How to write a SKILL.md that ranks #1 on Versuz"** — practical guide, attire les skill authors

Chaque post : 1500+ mots, 5+ internal links, 2-3 external authoritative links (Anthropic docs, Claude Code repo).

### Backlinks à chasser (sem 2-4)

- **awesome-claude-code** repos GitHub (PR pour ajouter Versuz dans la liste)
- **awesome-cursor**
- **awesome-mcp**
- **awesome-ai-agents**
- **Anthropic Discord** — section "show & tell"
- **Reddit** : r/ClaudeAI, r/cursor, r/LocalLLaMA (organic posts, pas spam)
- **Hacker News** : Show HN une fois (priorité sur jour de moindre activité, hier soir UTC = lundi/mardi matin US)
- **dev.to** : poste tes blog articles, c'est follow-friendly + DA 90+
- **Product Hunt** : launch officiel jour J+14 quand tu as déjà 200+ followers
- **Anthropic Community** forum
- **GitHub Discussions** sur les projets Claude/Cursor populaires : mentionne Versuz quand utile

---

## Verification setup commands

Une fois ton meta tag Google reçu :

```bash
# Sur Vercel — ajoute l'env var
# Project Settings → Environment Variables → Production
# Name : NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
# Value : ABC123def456... (juste la valeur, pas le tag entier)
# Puis redeploy
```

Test local avant deploy :
```bash
# Ajoute la même var à .env.local
echo "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=ABC123def456" >> .env.local
npm run dev
# Open https://localhost:3000 → view source → cherche "google-site-verification"
```

---

## Monitoring (post-deploy)

### Semaine 1

- [ ] GSC : crawl status → "Coverage" doit montrer 5-20 pages indexed
- [ ] GSC : Performance → 1-10 impressions/jour acceptable
- [ ] Vercel Analytics : 50-200 visiteurs/jour selon push social

### Mois 1

- [ ] GSC : 50+ pages indexed
- [ ] Top 10 sur "versuz" (brand keyword) — devrait être instantané
- [ ] Premières impressions sur `skill.md`, `claude.md`

### Mois 3

- [ ] 100-500 visiteurs/jour organic
- [ ] Top 20 sur 5+ keywords tier 2
- [ ] 5-10 backlinks domain authority 30+

### Mois 6

- [ ] 1000+ visiteurs/jour organic
- [ ] Top 5 sur `claude code skills`, `cursor skills`
- [ ] Knowledge panel Google avec logo Versuz

---

## Outils gratuits utiles

- **Google Search Console** — must-have
- **Bing Webmaster** — second must-have
- **Ahrefs Webmaster Tools** — gratuit, donne keyword data
- **Plausible Analytics** ou **Vercel Analytics** — déjà en place via Vercel
- **OpenGraph.xyz** — preview OG images
- **Schema.org Validator** — https://validator.schema.org — test ton JSON-LD
- **Lighthouse** (Chrome DevTools) — score SEO/perf/a11y
- **PageSpeed Insights** — https://pagespeed.web.dev

Test ton OG après deploy :
```
https://www.opengraph.xyz/url/https%3A%2F%2Fversuz.dev
```

Validation JSON-LD :
```
https://search.google.com/test/rich-results?url=https%3A%2F%2Fversuz.dev
```

---

## Quick wins immédiats (à faire dans l'heure)

1. ✅ Push le commit (dynamic OG + JSON-LD + verification slot)
2. Crée le compte GSC + Bing
3. Ajoute la var `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` dans Vercel
4. Submit le sitemap
5. Request indexing sur 10 URLs prioritaires
6. Test OG via OpenGraph.xyz
7. Test JSON-LD via Schema validator
