# Versuz — checklist "j'ai le domaine, je passe en prod"

À faire dans l'ordre quand tu reçois `versuz.dev` (ou autre). Chaque
section liste : **où c'est configuré**, **ce qu'il faut changer**, et
**comment vérifier**. Les emojis dans les titres sont volontaires (faciles
à scanner) — pas dans le code.

---

## 1. DNS + déploiement Vercel

### 1.1 Pointer le domaine sur Vercel

- Vercel Dashboard → projet `versuz` → **Settings → Domains** → "Add"
  - Tape `versuz.dev` (apex) → Vercel donne 1 record A `76.76.21.21`
  - Tape `www.versuz.dev` → Vercel donne 1 record CNAME vers `cname.vercel-dns.com`
- Va chez ton registrar (OVH / Gandi / Cloudflare / Namecheap) → DNS records →
  ajoute les 2 (A + CNAME). TTL 3600.
- Coche `www → versuz.dev` redirect dans Vercel (option built-in).
- Attends propagation (~5-30 min). `dig versuz.dev` doit rendre le bon IP.

### 1.2 Force HTTPS

Vercel le fait par défaut, mais vérifie que :
- "Redirect HTTP to HTTPS" est ON dans Settings → Domains
- Le SSL cert (Let's Encrypt) est `Active` (pas `Pending`)

### 1.3 Vercel env vars (Production scope)

Settings → Environment Variables → ajouter pour scope **Production** :

```
NEXT_PUBLIC_SITE_URL=https://versuz.dev
NEXT_PUBLIC_SUPABASE_URL=https://kbtiblzfbtvoepfgeiue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copie depuis Supabase Dashboard → API>
SUPABASE_SERVICE_ROLE_KEY=<copie depuis Supabase Dashboard → API → service_role>

# Stripe LIVE (pas test) — voir section 3
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # de l'endpoint live, voir 3.3
STRIPE_PLATFORM_FEE_BPS=3000
STRIPE_DEFAULT_COUNTRY=FR

# Bench (selon mode choisi)
BENCH_MODE=or-v1
OPENROUTER_API_KEY=sk-or-v1-...
BENCH_BUDGET_USD=20

# Cron auth (sécuriser /api/cron/*)
CRON_SECRET=<générer une string random 32 chars : openssl rand -hex 32>

# Admin allowlist (toi seulement par défaut)
ADMIN_GITHUB_LOGINS=TomaTV
ADMIN_GITHUB_IDS=<ton ID GitHub numérique, visible via api.github.com/users/TomaTV>

# Seed/scrape (PAT GitHub)
GITHUB_TOKEN=ghp_...

# Optionnel : si tu actives email subscribe ou autres
# RESEND_API_KEY=re_... (pour newsletter, V1+)
```

⚠ **NE COPIE PAS** les valeurs depuis ton `.env.local` qui contient des
clés `sk_test_` — recopie depuis le **dashboard Stripe en mode LIVE**.

---

## 2. Supabase — promouvoir le projet en prod

Le projet Supabase actuel (`kbtiblzfbtvoepfgeiue.supabase.co`) reste le
même. Ce qui change : sécurité + monitoring.

### 2.1 Settings → Auth

- **Site URL** : passe de `http://localhost:3000` à `https://versuz.dev`
- **Redirect URLs** : ajoute `https://versuz.dev/auth/callback` ET garde
  `http://localhost:3000/auth/callback` pour ton dev local
- **GitHub OAuth provider** :
  - GitHub → Settings → Developer settings → OAuth Apps → édite l'app
  - Authorization callback URL : `https://kbtiblzfbtvoepfgeiue.supabase.co/auth/v1/callback`
    (cette URL ne change pas — Supabase est l'intermédiaire)
  - Homepage URL : `https://versuz.dev`
  - Client ID + secret : déjà dans Supabase Auth → Providers → GitHub

### 2.2 Settings → API

- Note ton **service-role key** quelque part de safe (1Password). Tu l'auras
  besoin pour Vercel env vars.
- L'**anon key** est dans `NEXT_PUBLIC_SUPABASE_ANON_KEY` — sûre publique.
- **PostgREST URL** : ne change pas.

### 2.3 RLS audit

Connecte-toi avec un compte non-admin et vérifie que tu ne peux pas :
- Lire `purchases` qui ne sont pas à toi
- Update `skills.tier` à 'premium' sans bypass admin
- Voir un autre user dans `profiles` autre que public fields

Run dans SQL editor :
```sql
-- Liste les policies qui pourraient être trop laxistes
select schemaname, tablename, policyname, permissive, cmd, qual
from pg_policies
where schemaname='public'
order by tablename, cmd;
```

### 2.4 Storage bucket `premium-content`

- Vérifie qu'il est bien **private** (Settings → Storage → premium-content → public=false)
- Pas de policy permissive en SELECT — seul service-role accède via
  `signPremiumDownloadUrl()`.

### 2.5 Backups

- Free tier Supabase = **pas de backup automatique**.
- Pour la prod, upgrade à Pro ($25/mo) qui donne :
  - Daily backups 7 jours
  - PITR (point-in-time recovery)
- Sinon : cron qui dump via `pg_dump` → S3 (coût ~0$ via supabase CLI +
  Cloudflare R2).

---

## 3. Stripe — passer en LIVE mode

⛔ **Ne fais pas le switch tant que la checklist [docs/stripe-go-live.md](./stripe-go-live.md)
n'est pas tout vert (refund test, 2-user split, branding, customer emails).**

### 3.1 Activer le compte Versuz pour le live

- Stripe Dashboard (compte Versuz) → toggle **Live mode** (haut-droite)
- Settings → Account → "Activate your account" → fournir :
  - SIRET / numéro fiscal France (ou autre selon ton pays)
  - IBAN du compte qui recevra les payouts plateforme
  - Date de naissance, adresse
  - Description de l'activité ("Marketplace de skills d'agents IA")
  - Site URL : `https://versuz.dev`
- Stripe peut demander des docs (carte d'identité, justif de domicile) →
  fournis-les, validation = 1 à 5 jours.

### 3.2 Activer Connect en LIVE

- Settings → Connect → "Get started" en live mode aussi
- Choisir **Marketplace** + **Express** (mêmes choix qu'en sandbox)
- Stripe te demande de valider le platform business model + accepter
  les Connect ToS

### 3.3 Webhook persistant LIVE

- Developers → Webhooks → **Add endpoint**
- URL : `https://versuz.dev/api/webhooks/stripe`
- Events à écouter (tous ceux que notre handler gère) :
  ```
  checkout.session.completed
  account.updated
  payment_intent.payment_failed
  charge.refunded
  charge.dispute.created
  charge.dispute.closed
  ```
- API version : `latest` (laisse défaut)
- Save → clique sur l'endpoint → "Reveal signing secret" → copie le
  `whsec_...` → met dans Vercel env `STRIPE_WEBHOOK_SECRET` (scope Production)
- Vercel redeploy

### 3.4 API keys LIVE

- Developers → API keys → "Reveal live key"
- `sk_live_...` → `STRIPE_SECRET_KEY` Vercel
- `pk_live_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` Vercel

### 3.5 Branding

- Settings → Branding (en LIVE, c'est séparé de Sandbox) :
  - Logo + icon : upload `logo-typo-black.svg` ou export PNG
  - Couleur d'accent : `#C2410C` (ember)
  - Le checkout Stripe affichera ces couleurs aux acheteurs

### 3.6 Customer emails

- Settings → Customer emails → enable :
  - Successful payments → reçu auto envoyé au buyer
  - Refunds → notif auto
  - Receipts language : English (ou auto-detect)

### 3.7 Stripe Tax (si volume EU)

- Settings → Tax → "Get started"
- Activer pour les pays où tu vends (auto-detect via Stripe)
- Coût : payant à partir de 50 transactions/mois (pas urgent au début)

### 3.8 Garder le sandbox pour dev

- Stripe Sandbox reste actif en parallèle (tu peux switch à tout moment via
  le dropdown haut-gauche). Garde tes clés `sk_test_` dans `.env.local`
  pour le dev quotidien.

---

## 4. OAuth GitHub App

L'OAuth app GitHub que tu utilises pour Supabase Auth doit pointer sur
le bon callback :

- GitHub → Settings → Developer settings → **OAuth Apps**
- Édite l'app Versuz :
  - **Homepage URL** : `https://versuz.dev`
  - **Authorization callback URL** : `https://kbtiblzfbtvoepfgeiue.supabase.co/auth/v1/callback`
    (URL Supabase, pas Versuz — Supabase est le middleware OAuth)
- Ne touche PAS le Client ID. Le secret reste dans Supabase Auth → Providers.

---

## 5. SEO + observabilité au lancement

### 5.1 Sitemap + robots

Déjà servi via `/sitemap.xml` et `/robots.txt` (dynamiques). Vérifie que
`https://versuz.dev/sitemap.xml` rend du XML valide après déploiement.

### 5.2 Search Console

- https://search.google.com/search-console → "Add property" → `https://versuz.dev`
- Vérification via DNS TXT (Vercel le simplifie) ou file upload
- Submit le sitemap

### 5.3 Analytics

Pas en V0 (PostHog reste désinstallé). Pour le tracking acquisition au
lancement :
- Plausible (€9/mo) ou Umami (self-host gratuit) sont les plus simples
- Vercel Analytics built-in (gratuit jusqu'à 2.5k events/mois)

### 5.4 Sentry (errors)

Recommandé dès la prod. Free tier suffisant en dessous de 5k events/mois.
- npm install `@sentry/nextjs`
- `npx @sentry/wizard@latest -i nextjs`
- DSN dans Vercel env

### 5.5 Status page

`/status` est déjà publique et reflète l'état des envs. Si tu veux pousser
plus loin : statuspage.io ou un cron Vercel qui ping `/status` et alerte
si > 1 KO consécutif.

---

## 6. Email pour notifs Versuz

Pour les receipts Stripe, c'est Stripe qui envoie depuis leur SMTP.
Mais pour :
- Newsletter signup (footer)
- "Your skill was ranked top 3" notifs (V1.5)
- Forgot password (Supabase peut l'envoyer mais avec son SMTP par défaut, pas
  brandé Versuz)

Tu vas vouloir un sender propre. Options par ordre de simplicité/coût :
- **Resend** (gratuit jusqu'à 3k mails/mois, brandé domain custom)
  → 1h pour configurer domain auth (DKIM + SPF + DMARC)
- **Postmark** ($15/mo, deliverability premium)
- **Mailgun** (gratuit pour 1 mois, ensuite à l'usage)

Configurer Resend :
1. https://resend.com/domains → Add `versuz.dev`
2. Suivre les instructions DNS (3 records SPF/DKIM/DMARC chez ton registrar)
3. RESEND_API_KEY dans Vercel
4. Configurer Supabase Auth → Email → SMTP custom (host smtp.resend.com)

---

## 7. Crons Vercel

Déjà déclarés dans `vercel.json` :
- `/api/cron/bench?scope=skills.document` daily 04:00 UTC
- `/api/cron/refresh-rankings` toutes les 15 min

Vérifier après deploy :
- Vercel → projet → **Crons** → les 2 jobs apparaissent
- `CRON_SECRET` env var matche celle dans le code (sinon les jobs renvoient 401)

À ajouter (à coder en V1.5) :
- `/api/cron/sweep-stuck-jobs` — purge les run_jobs queued > 24h
- `/api/cron/refresh-stripe-accounts` — backup au cas où le webhook
  `account.updated` rate

---

## 8. Migrations Supabase à appliquer en prod

Si tu repars d'un projet Supabase neuf en prod (pas le cas si tu garde
`kbtiblzfbtvoepfgeiue`), applique dans l'ordre :

```
0001_init.sql
0002_claude_md_and_bench.sql
0003_marketplace.sql
0004_widen_skills_category.sql
0005_rls_public_read.sql
0006_task_proposals.sql
0007_submit_rls.sql
0008_skills_github_url_drop_unique.sql
0009_widen_judge_models.sql
0010_subscribers.sql
0011_widen_judge_models_groq.sql
0012_widen_judge_models_openrouter.sql
0013_profiles.sql
0014_purchases_rls.sql
0015_premium_downloads.sql
```

Pour appliquer en bulk via Supabase CLI :
```bash
supabase link --project-ref <REF>
supabase db push
```

---

## 9. Code à modifier en pratique (recap minimal)

Si tu veux juste un grep des chemins :

| Fichier | Change |
|---|---|
| `.env.local` (dev) | rien — garde `sk_test_` + `localhost:3000` |
| Vercel env vars (prod) | tout, voir 1.3 + 3.4 |
| Stripe Dashboard | webhook endpoint LIVE, branding LIVE, customer emails |
| Supabase Dashboard | Site URL + Redirect URLs + RLS audit |
| GitHub OAuth app | Homepage URL = versuz.dev |
| `vercel.json` | rien (crons déjà déclarés) |
| `src/lib/stripe/server.js` | rien (lit env vars) |
| `src/lib/auth/server.js` | rien (lit env vars) |
| `next.config.mjs` | check que `experimental.serverActions.bodySizeLimit` est OK pour les uploads premium (10 MB par défaut côté action) |

Aucun code à toucher pour le switch test → live. Tout est en env vars
ou config externe.

---

## 10. J0 — jour du lancement

1. Vercel deploy `main` (ou `production` si tu protèges main) → succès
2. Smoke test :
   - https://versuz.dev → landing OK
   - /marketplace → items affichés
   - /login → flow GitHub fonctionne, callback rentre bien
   - /profile → tu te vois
   - Stripe Dashboard → un test charge depuis ta vraie carte sur un skill à $0.50 → tu te rembourses immédiatement
3. Active le webhook live → trigger un `checkout.session.completed` test depuis Dashboard
4. Vérifie `purchases` table en DB
5. Tweet / annonce — tu rentres en mode "users réels"
6. Surveille `/api/cron/bench` les 24-48h après — les premiers vrais cycles
   tournent

---

## 11. Reverse — repasser en sandbox / dev

Si tu veux re-tester en local :
- Garde `.env.local` avec `sk_test_`, `http://localhost:3000`
- Stripe CLI `stripe listen` rebrande
- DB Supabase identique (test mode Stripe vs Live mode = clés séparées,
  même DB Supabase OK)

Note : les `purchases` rows en DB sont les mêmes que tu sois sur sandbox
ou live → si tu veux séparer, ajoute un champ `livemode` boolean (Stripe
le retourne sur chaque event).
