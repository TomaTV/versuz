---
name: vz-stripe-connect
description: Wire Stripe Connect Express + destination charges + webhooks into a Next.js + Supabase app, with all the gotchas (raw body parsing, signature verification, idempotency keys, RLS on purchases, refund + dispute handling). Replaces the 4 hours of trial-and-error reading Stripe docs.
tools: ["bash", "read", "write"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-stripe-connect

Stripe Connect Express is the right primitive for marketplaces : sellers
keep 70%, you (platform) keep 30%, payouts are automatic. But the docs
are scattered across 6 pages and the gotchas (raw body, signature, idempotency)
all bite during the first integration. This skill ships the full chain.

## When to use

- Building a marketplace where third-party sellers receive payments
- Need automatic split (no manual payouts)
- Next.js 14+ / 16 backend with Supabase / Postgres + RLS

## When NOT to use

- Single-seller checkout (just regular Stripe Checkout, no Connect needed)
- Subscription billing (different primitive, Stripe Billing)
- High-touch invoicing — use Stripe Invoicing instead

## Architecture

```
Buyer                  Versuz (Next.js)              Stripe                Supabase
  |                          |                         |                       |
  |-- Click "Buy $10" ------>|                         |                       |
  |                          |-- create checkout ----->|                       |
  |                          |   { application_fee_amount: 300,                |
  |                          |     transfer_data: { destination: "acct_X" } }  |
  |                          |<------ session.url -----|                       |
  |<-- redirect to Stripe --|                         |                       |
  |-- pay via card --------------------------------->| (Stripe charges card)
  |                          |<-- webhook ------------|                       |
  |                          |   checkout.session.completed                    |
  |                          |   $10 split : $7 to seller, $3 to platform     |
  |                          |--- insert purchase row ----------------------->|
  |                          |--- send branded receipt via email              |
```

## Required env

```bash
STRIPE_SECRET_KEY=sk_test_...                  # platform key
STRIPE_WEBHOOK_SECRET=whsec_...                # from `stripe listen` or dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PLATFORM_FEE_BPS=3000                   # 30% in basis points
NEXT_PUBLIC_SITE_URL=https://yourapp.com       # MUST be https in prod
```

## Step 1 — Server singleton (cold start safety)

```js
// src/lib/stripe/server.js
import Stripe from "stripe";
let _stripe = null;
export function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",   // pin it
  });
  return _stripe;
}
export const PLATFORM_FEE_BPS = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || "3000", 10);
export function siteUrl() {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url.replace(/\/$/, "");
}
```

## Step 2 — Seller onboarding (one-time per seller)

```js
// server action
"use server";
import { getStripe, siteUrl } from "@/lib/stripe/server";

export async function startStripeOnboarding() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not signed in");

  let acctId = profile.stripe_account_id;
  if (!acctId) {
    const acct = await getStripe().accounts.create({
      type: "express",
      country: profile.country || "FR",
      email: profile.email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    acctId = acct.id;
    await sb.from("profiles").update({ stripe_account_id: acctId }).eq("id", profile.id);
  }

  const link = await getStripe().accountLinks.create({
    account: acctId,
    refresh_url: `${siteUrl()}/profile/settings`,
    return_url: `${siteUrl()}/profile/settings?onboarded=1`,
    type: "account_onboarding",
  });
  redirect(link.url);
}
```

**Gotcha** : `siteUrl()` MUST be https in prod. Stripe rejects http for live mode.

## Step 3 — Buy flow (destination charges, 70/30 split)

```js
"use server";
export async function createCheckoutAction({ kind, slug }) {
  const subject = await loadBuyableSubject(kind, slug);
  const seller = await getSellerProfile(subject.author_user_id);
  if (!seller?.stripe_charges_enabled) {
    throw new Error("Seller not onboarded yet");
  }
  const buyer = await getCurrentUser();
  const amountCents = Math.round(subject.price_usd * 100);
  const feeCents = Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: subject.title, description: subject.summary?.slice(0, 500) },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: seller.stripe_account_id },
      metadata: {
        subject_kind: kind,
        subject_id: subject.id,
        buyer_user_id: buyer.id,
      },
    },
    success_url: `${siteUrl()}/buy/${kind}/${slug}/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/buy/${kind}/${slug}`,
    client_reference_id: buyer.id,
  });
  redirect(session.url);
}
```

## Step 4 — Webhook (the part everyone gets wrong)

```js
// src/app/api/webhooks/stripe/route.js
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";   // CRITICAL — no caching

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  // Next App Router : you MUST use .text() to get the raw body. .json() corrupts the signature.
  const rawBody = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Idempotency : Stripe retries failed webhooks. Use event.id as dedup key.
  const sb = createSupabaseAdminClient();
  const { data: seen } = await sb.from("processed_webhooks").select("event_id").eq("event_id", event.id).maybeSingle();
  if (seen) return new Response("ok (already processed)", { status: 200 });

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      await sb.from("purchases").insert({
        stripe_session_id: s.id,
        stripe_payment_intent_id: s.payment_intent,
        amount_usd: s.amount_total / 100,
        commission_usd: (s.payment_intent_data?.application_fee_amount || 0) / 100,
        buyer_user_id: s.client_reference_id,
        subject_kind: s.metadata?.subject_kind,
        skill_id: s.metadata?.subject_kind === "skill" ? s.metadata?.subject_id : null,
        claude_md_id: s.metadata?.subject_kind === "claude_md" ? s.metadata?.subject_id : null,
        status: "paid",
      });
      break;
    }
    case "account.updated": {
      const acct = event.data.object;
      await sb.from("profiles").update({
        stripe_charges_enabled: acct.charges_enabled,
        stripe_payouts_enabled: acct.payouts_enabled,
        stripe_onboarding_complete: acct.details_submitted,
      }).eq("stripe_account_id", acct.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      await sb.from("purchases").update({ status: "refunded" }).eq("stripe_payment_intent_id", charge.payment_intent);
      break;
    }
    case "charge.dispute.created":
      // Send Slack alert, mark purchase as disputed
      break;
    default:
      // Bail-early on events you don't care about (balance.available, etc.)
      break;
  }

  await sb.from("processed_webhooks").insert({ event_id: event.id });
  return new Response("ok", { status: 200 });
}
```

## RLS on purchases

```sql
alter table purchases enable row level security;
-- Buyer can read their own purchases
create policy "purchases_buyer_read" on purchases for select using (auth.uid() = buyer_user_id);
-- Seller can read purchases of their items
create policy "purchases_seller_read" on purchases for select using (
  (subject_kind='skill' and exists (select 1 from skills where id=skill_id and author_user_id=auth.uid()))
  or
  (subject_kind='claude_md' and exists (select 1 from claude_md_files where id=claude_md_id and author_user_id=auth.uid()))
);
-- Writes happen via service-role only (webhook handler)
```

## Local dev (test mode)

```bash
# Terminal 1 : forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... it prints → STRIPE_WEBHOOK_SECRET in .env.local
# Restart `npm run dev`

# Terminal 2 : trigger a refund on a real test PI
stripe payment_intents list --limit 5
stripe refunds create --payment-intent=pi_xxx
# Verify in DB : select status from purchases where stripe_payment_intent_id='pi_xxx'
# Should be 'refunded'
```

## Going live checklist

- [ ] Domain bought + DNS pointing to your host
- [ ] `STRIPE_SECRET_KEY=sk_live_...` in prod env
- [ ] Webhook endpoint added in Stripe Dashboard (not just `stripe listen`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` (https, no trailing slash)
- [ ] Test refund + dispute on a real $0.50 charge before launch
- [ ] Stripe Tax enabled if EU sellers (Settings → Tax)
- [ ] Customer email receipts enabled (Settings → Customer emails)

## Common pitfalls

1. **Using `request.json()` in webhook** → signature breaks. ALWAYS `request.text()`.
2. **Trusting `account.updated` to fire reliably** → add a backup cron that polls `accounts.retrieve` every 6h for drift detection.
3. **Forgetting `application_fee_amount`** → Stripe still works but you take 0%.
4. **Hard-coding `country: "US"`** → blocks EU sellers. Default to user's actual country.
5. **No idempotency on webhook insert** → Stripe retries = duplicate purchase rows.
