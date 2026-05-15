# Cloudflare R2 Setup — Versuz Content Storage Migration

Guide step-by-step pour configurer R2 et migrer les ~100k fichiers `.md`
depuis Supabase Storage. À la fin, Supabase Storage = vide → tu peux
downgrade Pro → Free.

---

## TL;DR — ordre d'exécution

1. ✅ Backup DB done (`.backup/2026-05-15T*/`)
2. ⏳ Backup Storage en cours (`.backup/storage/2026-05-15T*/`)
3. 🟦 **Tu fais** : créer bucket R2 + générer API token + custom domain
4. 🟦 **Tu fais** : ajouter 4 env vars dans `.env.local`
5. 🟢 Je lance : `npm run migrate:r2` (upload local backup → R2, ~30 min)
6. 🟢 Je lance : `npm run dev` + verify une page skill charge depuis R2
7. 🟢 Je lance : `npm run cleanup:supabase-storage` (wipe ancien bucket)
8. 🟦 **Tu fais** : downgrade Supabase Pro → Free dans dashboard

---

## Étape 3 — Côté Cloudflare (5 min)

### 3.1 Créer le bucket R2

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage**
2. Si premier usage de R2, accepte les conditions (zero coût jusqu'à 10 GB)
3. **Create bucket** :
   - Name : `versuz-content`
   - Location : Automatic
   - Default storage class : Standard
4. Une fois créé, va dans le bucket → onglet **Settings** → section **Public access** :
   - **Allow Access** (les .md sont public, comme actuellement sur Supabase)

### 3.2 Custom domain (optionnel mais recommandé)

Tu as déjà ton domaine chez Cloudflare. Set `cdn.versuz.dev` pour pointer
vers le bucket :

1. Dans le bucket → onglet **Settings** → section **Custom Domains**
2. **Connect Domain** → tape `cdn.versuz.dev` (ou autre, ex `content.versuz.dev`)
3. Cloudflare crée auto le CNAME → propagation 1-2 min
4. Une fois connecté, tu auras une URL type `https://cdn.versuz.dev/`

Sans custom domain, tu as l'URL générique `https://pub-<hash>.r2.dev/` —
fonctionne aussi mais moins propre pour le branding et les badges embed.

### 3.3 Générer l'API token (pour les writes)

Le bucket public permet de READ sans auth. Pour les WRITES (scrapers,
upload depuis dashboard admin), il faut un token.

1. Dans R2 → page d'accueil R2 → bouton **Manage R2 API Tokens** (top right)
2. **Create API Token** :
   - Token name : `versuz-content-rw`
   - Permissions : **Object Read & Write**
   - Specify bucket : `versuz-content` (scope minimal)
   - TTL : Forever
3. Clique **Create API Token**
4. Note tout de suite (affiché une seule fois) :
   - **Access Key ID** (~32 chars, hex)
   - **Secret Access Key** (~64 chars, hex)
   - **Endpoint** (déjà connu : `<account>.r2.cloudflarestorage.com`)
5. Note ton **Account ID** (visible en haut à droite du dashboard, ~32 chars hex)

---

## Étape 4 — Côté projet (1 min)

Ajoute ces 5 lignes à `.env.local` (à la fin du fichier) :

```ini
# Cloudflare R2 — content storage (replaces Supabase Storage)
R2_ACCOUNT_ID=your_cloudflare_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_BUCKET=versuz-content
R2_PUBLIC_URL=https://cdn.versuz.dev
```

⚠ Le `R2_PUBLIC_URL` doit être l'URL exacte du bucket public — soit ton
custom domain (`https://cdn.versuz.dev`), soit l'URL générique
(`https://pub-<hash>.r2.dev`). **Pas de slash final.**

⚠ Une fois `.env.local` édité, **ne lance PAS encore `npm run dev`** —
on veut d'abord migrer les fichiers vers R2. Si tu lance dev avant, les
pages skill verront `R2_PUBLIC_URL` set mais le bucket R2 vide → 404
sur tous les contents. C'est l'ordre dans la TL;DR ci-dessus.

---

## Étape 5-7 — Je m'en occupe

Quand tu m'auras dit "R2 prêt", je lance dans cet ordre :

```powershell
npm run migrate:r2          # 100k files → R2, ~30 min
npm run dev                 # verify reads
npm run cleanup:supabase-storage --i-know-what-im-doing
```

Puis je te demande de confirmer que tu vois bien les contents skills/claude-md
dans `/marketplace`, après quoi tu downgrade Supabase.

---

## Étape 8 — Downgrade Supabase

Une fois `cleanup:supabase-storage` terminé :

1. Vérif dashboard Supabase → Reports → Usage Summary :
   - Storage Size : devrait être ~0 MB
   - Database Size : ~150-200 MB (largement sous 500 MB Free)
2. Settings → **Billing** → **Change Plan** → Free
3. Confirme. Tu paies le prorata du mois Pro consommé (~$8-15 selon la date),
   et c'est fini.

---

## Architecture finale (rappel)

```
Cloudflare R2 (10 GB free)            Supabase Free (500 MB DB)
├── versuz-content/                   ├── DB
│   ├── skills/{slug}.md              │   ├── skills (metadata only)
│   └── claude-md/{slug}.md           │   ├── claude_md_files (metadata only)
│                                     │   ├── profiles + purchases + ...
└── (futur) archive/                  │   └── (active windows, 30-90j)
    └── bench_results/2026-05.jsonl.gz└── Auth (GitHub OAuth)

→ Connecté via :
  storage.js dispatch (R2_PUBLIC_URL env)
  CDN URLs : https://cdn.versuz.dev/skills/abc.md
```

Coût steady-state : **$0/mois** (R2 free tier + Supabase free tier).
Croissance soutenable indéfiniment grâce à l'archive policy pour les
tables `bench_results` / `rank_history` qui growent par cycle.
