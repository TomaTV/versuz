"use server";

/**
 * Pro Author checkout — server action.
 *
 * Creates a Stripe Checkout Session in subscription mode for the
 * currently-logged-in user. Reuses or creates a Stripe Customer, caches
 * the customer id back on profiles so we don't make duplicate Customers
 * on every checkout attempt.
 *
 * Idempotent : if the user already has an active subscription
 * (is_pro_author=true), the action returns the manage URL instead of a
 * new checkout. If they have a pending checkout from earlier (within
 * 30min), we return a fresh session anyway — Stripe handles that fine.
 */

import { redirect } from "next/navigation";
import { getStripe, isStripeConfigured, siteUrl } from "@/lib/stripe/server";
import { isProAuthorAvailable, getProAuthorPriceId, getProAuthorIntroCoupon } from "@/lib/pro-author";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/server";

export async function createProAuthorCheckoutAction() {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }
  if (!isProAuthorAvailable()) {
    return {
      error:
        "Pro Author tier is not live yet — join the waitlist instead. (STRIPE_PRO_AUTHOR_PRICE_ID env var unset.)",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/pricing%23pro-author");
  }

  const sb = createSupabaseAdminClient();
  if (!sb) {
    return { error: "Service-role Supabase client not configured." };
  }

  // Pull profile to check for existing subscription / cached customer id.
  const { data: profile } = await sb
    .from("profiles")
    .select(
      "id, is_pro_author, stripe_customer_id, pro_author_subscription_id, github_login"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Already subscribed → send them to the customer portal instead of a
  // new checkout. The portal lets them update payment, cancel, view
  // invoices.
  if (profile?.is_pro_author && profile?.stripe_customer_id) {
    const portal = await openCustomerPortal(profile.stripe_customer_id).catch(
      () => null
    );
    if (portal?.url) {
      redirect(portal.url);
    }
    return { error: "Already subscribed. Couldn't open the customer portal." };
  }

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id || null;

  // Create a Stripe Customer on first checkout. Cache the id on
  // profiles so subsequent flows reuse it (and the webhook can match
  // events back to the user).
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        versuz_user_id: user.id,
        versuz_github_login: profile?.github_login || "",
      },
    });
    customerId = customer.id;
    await sb
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // Build the checkout session in subscription mode. The customer is
  // attached so the resulting subscription lands on a known
  // stripe_customer_id (which the webhook uses to find the profile).
  const priceId = getProAuthorPriceId();
  const introCoupon = getProAuthorIntroCoupon();
  const base = siteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/profile/settings?subscribed=pro-author`,
    cancel_url: `${base}/pricing#pro-author`,
    metadata: {
      versuz_action: "pro-author-subscribe",
      versuz_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        versuz_action: "pro-author-subscribe",
        versuz_user_id: user.id,
      },
    },
    ...(introCoupon
      ? { discounts: [{ coupon: introCoupon }] }
      : { allow_promotion_codes: true }),
  });

  if (!session.url) {
    return { error: "Stripe did not return a checkout URL." };
  }
  redirect(session.url);
}

async function openCustomerPortal(customerId) {
  const stripe = getStripe();
  const base = siteUrl();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/profile/settings`,
  });
}
