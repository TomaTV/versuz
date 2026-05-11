"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getProfile, updateProfileAsAdmin } from "@/lib/profiles/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured, siteUrl } from "@/lib/stripe/server";

/**
 * Create or resume a Stripe Connect Express account for the current user.
 * Returns nothing — redirects to Stripe-hosted onboarding URL.
 *
 * Idempotent: if an account already exists, we just generate a fresh
 * accountLink (which invalidates the previous one and is required since
 * accountLinks are single-use, short-lived).
 */
export async function startStripeOnboarding() {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/settings");

  const profile = await getProfile(user.id);
  const stripe = getStripe();
  const base = siteUrl();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: process.env.STRIPE_DEFAULT_COUNTRY || "FR",
      email: user.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { versuz_user_id: user.id },
    });
    accountId = account.id;
    await updateProfileAsAdmin(user.id, { stripe_account_id: accountId });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/profile/settings?stripe=refresh`,
    return_url: `${base}/profile/settings?stripe=return`,
    type: "account_onboarding",
  });

  redirect(link.url);
}

/**
 * Re-fetch the seller's account from Stripe and snapshot the capability flags
 * into our profiles table. Called when the user lands on
 * /profile/settings?stripe=return (after onboarding).
 *
 * Webhook `account.updated` is the source of truth in production, but a
 * synchronous refresh on return gives the user instant visual feedback.
 */
export async function refreshStripeAccountStatus() {
  if (!isStripeConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  // Bypass React.cache (getProfile) so the read here doesn't stale-bind the
  // page render that called us. Read just the stripe_account_id from admin.
  const adminSb = createSupabaseAdminClient();
  if (!adminSb) return null;
  const { data: row } = await adminSb
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!row?.stripe_account_id) return null;

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(row.stripe_account_id);

  const patch = {
    stripe_charges_enabled: !!account.charges_enabled,
    stripe_payouts_enabled: !!account.payouts_enabled,
    stripe_onboarding_complete:
      !!account.details_submitted && !!account.charges_enabled,
  };
  await updateProfileAsAdmin(user.id, patch);
  // No revalidatePath — this runs during the page render that triggered us;
  // the caller overlays this patch on top of getCurrentProfile manually.
  return patch;
}

/**
 * Generate a one-time login link to the Stripe Express dashboard so sellers
 * can manage payouts, view transactions, update banking info, etc.
 */
export async function openStripeDashboard() {
  if (!isStripeConfigured()) return;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/settings");

  const profile = await getProfile(user.id);
  if (!profile?.stripe_account_id) {
    redirect("/profile/settings");
  }

  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
  redirect(link.url);
}

/**
 * Same one-time login link, but with a dispute-specific deep-link path so
 * the seller lands directly on the disputes view inside their Express
 * dashboard. They can submit evidence from there in a few clicks.
 *
 * Stripe Connect Express limits where you can deep-link, but `/disputes`
 * works on Express dashboards.
 */
export async function openStripeDisputes() {
  if (!isStripeConfigured()) return;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/earnings");

  const profile = await getProfile(user.id);
  if (!profile?.stripe_account_id) {
    redirect("/profile/settings");
  }

  const stripe = getStripe();
  // `accountLinks` (used for onboarding) doesn't accept a deep path, but
  // `loginLinks` accepts redirect_url. We pass the disputes page on the
  // Express dashboard. Fallback to the generic dashboard if Stripe rejects.
  try {
    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id, {
      redirect_url: "https://dashboard.stripe.com/express/disputes",
    });
    redirect(link.url);
  } catch {
    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
    redirect(link.url);
  }
}
