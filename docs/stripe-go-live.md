# Stripe — pre-flight checklist avant le live mode

Tant que l'un des items n'est pas coché, on **reste en test mode**. Un seul
paiement live qui ne s'enregistre pas, c'est un refund manuel + un user
mécontent + ta réputation marketplace qui prend un coup.

## Côté code (validé une fois pour toutes)

- [x] Webhook handler endpoint `/api/webhooks/stripe`
- [x] Signature verification via `STRIPE_WEBHOOK_SECRET`
- [x] Idempotent insert (`onConflict: stripe_session_id`) — replay-safe
- [x] Events handled : `checkout.session.completed`, `account.updated`,
      `payment_intent.payment_failed`, `charge.refunded`,
      `charge.dispute.created`, `charge.dispute.closed`
- [x] RLS sur `purchases` : buyer + seller read, service-role write
- [x] Connect Express destination_charges (split 70/30 automatique)
- [x] "Owned" / "Yours" badges sur MarketplaceCard

## Côté validation (à faire en test mode)

Suis chaque item, coche au fur et à mesure.

### 1. Webhook delivery end-to-end

```powershell
# Terminal A
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → copie le whsec_ dans .env.local, restart npm run dev

# Terminal B — replay un event minimal
stripe trigger checkout.session.completed
# → Terminal A doit afficher [200] POST
# → Supabase: select count(*) from purchases doit > 0
```

- [x] `[200]` dans `stripe listen` pour `checkout.session.completed` ✓ 10/05/26
- [x] Row insérée dans `purchases` (id `8cac4a31...`, video-analytics, $1.99, status=paid)

### 2. Achat réel test (1 user)

```
1. /profile/settings → Connected ✓
2. /marketplace?tier=premium → "Buy now $1.99" sur 6 items
3. Click sur un item où tu n'es PAS author (sinon ça affiche "Yours")
   → si tous les items premium sont à toi, refais seed-premium avec un
     SEED_AUTHOR_USER_ID différent, OU crée un 2e compte
4. /buy/skill/<slug> → "Pay with Stripe →" → carte 4242 4242 4242 4242
5. Success page → "Thank you" + amount
6. /profile/earnings § 03 — Diagnostic doit montrer purchasesAsBuyer ≥ 1
```

- [x] Achat 1 user OK, purchase row paid status ✓ 10/05/26
- [x] Self-buy OK (buyer = seller fonctionne pour test, le destination_charge envoie quand même la part au stripe_account_id du seller)
- [x] MarketplaceCard switch — "Yours" (azure) si tu es l'author, "Owned" (sage) si owned mais pas author, "Buy" sinon
- [x] SkillDetail page CTA adapté : Open on GitHub (sage/azure) ou Buy CTA selon état

### 3. Achat avec 2 users (le vrai split test)

C'est le seul moyen de valider que le destination_charge fonctionne :

```
1. Logout, ouvre un browser incognito, login avec un 2e compte GitHub
2. Onboarde-le comme seller : /profile/settings → Become a seller
3. SQL : assigne 1 skill premium à ce 2e user :
   update skills set author_user_id = '<uuid_compte_2>'
   where slug = '<un_des_skills_seedés>';
4. Reviens sur ton compte 1, achète ce skill
5. Vérif :
   - /profile/earnings (compte 1) : 0 sale (logique, t'es buyer pas seller)
   - /profile/earnings (compte 2) : 1 sale, +$1.39 net
   - Stripe Dashboard (test mode) → Connect → connected accounts → compte 2
     doit montrer +€1.39 EUR (ou USD selon currency) en pending
```

- [ ] 2 comptes, 1 achat cross-user
- [ ] Earnings côté seller affiche la sale
- [ ] Le compte Connect du seller a bien reçu sa part dans Stripe Dashboard

### 4. Refund + dispute (ON THE REAL CHARGE — pas les fixtures CLI)

⚠ **`stripe trigger charge.refunded` ne marche PAS pour notre test** :
le trigger CLI génère des fixtures avec `metadata={}`, et notre handler
bail-early si `versuz_subject_kind` est absent. C'est attendu — ça évite
de polluer la table `purchases` avec des données de test sans contexte.

Pour tester réellement, il faut refund / disputer le **vrai** payment_intent
qui a la metadata Versuz :

```powershell
# A. Refund du paiement de $1.99 (video-analytics)
# Trouve son PI ID :
stripe payment_intents list --limit 5
# → copie celui qui a metadata.versuz_subject_kind=skill (ex pi_3TVc6DE0lpIeQ2gW1y7nsqRy)

# Refund :
stripe refunds create --payment-intent=pi_3TVc6DE0lpIeQ2gW1y7nsqRy

# Dans `stripe listen` tu verras :
#   --> charge.refunded [evt_xxx]
#   <-- [200] POST .../api/webhooks/stripe

# Vérif DB :
#   select status from purchases where stripe_payment_intent_id='pi_3TVc6...';
#   → 'refunded'

# B. Dispute (chargeback simulé) — depuis Stripe Dashboard
# Va sur Payments → trouve un paiement → "..." → "Refund or dispute"
# OU avec une carte test dispute-trigger : 4000000000000259
# (faire un nouvel achat avec cette carte → dispute auto à J+1 en sandbox)
```

- [ ] Refund du PI réel → `purchases.status='refunded'`
- [ ] Dispute via card 4000000000000259 ou Dashboard → `status='disputed'`

### 5. Branding Stripe checkout

Settings → Branding (sur le compte Versuz, en test mode) :

- [ ] Logo uploadé (`logo-typo-black.svg` ou un PNG dérivé)
- [ ] Couleur principale `#C2410C` (ember)
- [ ] Refais un achat test → la page Stripe Checkout doit montrer le logo
      et la couleur

### 6. Compte plateforme legal

- [ ] Settings → Account details → Business → adresse + SIRET / VAT renseignés
- [ ] Settings → Tax → TVA configurée si tu vends à des consommateurs EU
      (Stripe Tax recommandé pour la collecte automatique)
- [ ] Settings → Branding → favicon de ton compte plateforme aussi

### 7. Webhook persistant côté prod

`stripe listen` ne tourne qu'en local. En prod il te faut un endpoint stable :

```
Stripe Dashboard (Versuz, test mode) → Developers → Webhooks → Add endpoint
- URL : https://versuz.dev/api/webhooks/stripe
- Events :
    checkout.session.completed
    account.updated
    payment_intent.payment_failed
    charge.refunded
    charge.dispute.created
    charge.dispute.closed
- API version : laisse défaut (current)
```

- [ ] Webhook endpoint créé en test mode
- [ ] `whsec_` copié dans Vercel env vars (`STRIPE_WEBHOOK_SECRET`)
- [ ] Test depuis prod : `stripe trigger checkout.session.completed --api-key sk_test_...`
      doit déclencher un POST 200 vers `versuz.dev/api/webhooks/stripe`

## Le switch live

Quand TOUS les items au-dessus sont cochés :

1. Stripe Dashboard → toggle **Live mode** (haut-droite)
2. Settings → Connect → Get started (refais l'activation en live)
3. Developers → API keys → copie `sk_live_...` + `pk_live_...`
4. Developers → Webhooks → Add endpoint pour live (même URL, **whsec_ différent**)
5. Vercel env vars (Production scope) :
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (le live, pas le test)
   - `STRIPE_DEFAULT_COUNTRY=FR`
   - `NEXT_PUBLIC_SITE_URL=https://versuz.dev`
6. Redeploy Vercel
7. Achat test live avec ta vraie carte sur un skill à $0.50 — tu te rembourses
   après depuis le dashboard. Vérifie la chaîne complète sur prod.
8. Si tout OK → ouvert au public

## Ce qui n'est PAS encore prod-ready

À adresser avant un volume sérieux :

- **Pas de download gating** : un user qui achète peut juste lire le SKILL.md
  qui est déjà public sur GitHub. La "valeur" achetée = badge support + featured
  placement. Désormais explicité dans la copy de `/skills/[slug]` quand
  l'item est premium-not-owned (InstallSection v2). À gater pour de vrai
  en V1.5 : repo privé GitHub + access via auth token Versuz, ou storage
  Supabase avec signed URL.
- **Pas de TVA / sales tax** : Stripe Tax non activé. Pour B2C EU c'est
  obligatoire dès le 1er euro. Settings → Tax → "Get started with Stripe Tax".
  Tu pourras automatiser le calcul TVA, mais Stripe Tax est payant à partir
  de 50 transactions / mois → ok jusqu'à ce que tu scales.
- **Pas de receipts par email** : Settings → Customer emails →
  "Successful payments" pour activer le receipt automatique Stripe.
- **Pas de page seller dispute** : si le seller voit "Disputed" dans /earnings,
  il n'a aucun moyen d'agir depuis Versuz. V1.5 ajoute un lien direct
  "Submit evidence on Stripe ↗" qui passe par
  `stripe.accounts.createLoginLink()` puis redirige vers le dispute concerné.
- **Pas de cron pour cycles bench abandonnés** : si `npm run bench` crashe
  à mi-cycle, les jobs restent en `queued` indefiniment et le prochain
  cycle peut conflicter. Idéalement un `/api/cron/sweep-stuck-jobs`
  passe toutes les 6h marker abandoned.

## État actuel (10 mai 2026)

- ✅ Architecture Stripe Connect Express + destination_charges
- ✅ Webhook handler validé end-to-end (purchase row insérée)
- ✅ Earnings page fonctionnelle ($1.39 net affiché)
- ✅ Marketplace UI : "Buy / Owned / Yours" suivant l'état user
- ✅ SkillDetail page : CTA + InstallSection adaptés à l'état
- ✅ Migrations 0012, 0013, 0014 appliquées
- ✅ Bench cycle 3 (or-v1) a tourné, rankings refresh, 3 skills ranked
- ⏳ Refund réel (à tester avec stripe refunds create)
- ⏳ 2-user split test
- ⏳ Branding Stripe + receipt emails
- ⏳ Webhook persistant prod (à faire au déploiement Vercel)
- ⏳ Stripe Tax (à activer avant volume EU sérieux)
