"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profiles/server";
import {
  getStripe,
  isStripeConfigured,
  platformFeeCents,
  siteUrl,
} from "@/lib/stripe/server";

/**
 * Look up a buyable subject (skill or claude_md) by slug, ensuring it's
 * priced and the seller is fully onboarded. Returns shape used by /buy page.
 */
export async function loadBuyableSubject({ kind, slug }) {
  const sb = await createSupabaseServerClient();
  if (!sb) return { error: "supabase_unconfigured" };
  const table = kind === "claude_md" ? "claude_md_files" : "skills";

  const sel =
    kind === "claude_md"
      ? "id, slug, description, project_category, tier, price_usd, verification_level, is_official, author_user_id, github_url, github_stars, metadata"
      : "id, slug, name, description, category, tier, price_usd, verification_level, is_official, author_user_id, github_url, github_stars, metadata";

  const { data: subject, error } = await sb
    .from(table)
    .select(sel)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !subject) return { error: "not_found" };
  if (subject.tier === "free" || !subject.price_usd) {
    return { error: "not_for_sale", subject };
  }
  if (!subject.author_user_id) {
    return { error: "no_seller", subject };
  }
  const seller = await getProfile(subject.author_user_id);
  if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
    return { error: "seller_not_payable", subject, seller };
  }
  return { subject, seller };
}

/**
 * Create a Stripe Checkout session and redirect the buyer to Stripe-hosted
 * payment. Uses Connect destination charges → 70% to seller, 30% to Versuz,
 * automatic split, no manual transfers needed.
 *
 * Form action — called from /buy/[kind]/[slug] page form.
 */
export async function createCheckoutAction(formData) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }
  const kind = String(formData.get("kind") || "");
  const slug = String(formData.get("slug") || "");
  if (!kind || !slug) throw new Error("Missing kind or slug");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/buy/${kind}/${slug}`)}`);
  }

  const { subject, seller, error } = await loadBuyableSubject({ kind, slug });
  if (error) redirect(`/buy/${kind}/${slug}?err=${error}`);

  const stripe = getStripe();
  const base = siteUrl();
  const amountCents = Math.round(Number(subject.price_usd) * 100);
  const feeCents = platformFeeCents(subject.price_usd);

  const productName =
    kind === "claude_md"
      ? `CLAUDE.md · ${subject.metadata?.author || ""}/${subject.metadata?.repo || subject.slug}`
      : subject.name || subject.slug;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: (subject.description || "").slice(0, 500) || undefined,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: seller.stripe_account_id },
      metadata: {
        versuz_subject_kind: kind,
        versuz_subject_id: String(subject.id),
        versuz_subject_slug: subject.slug,
        versuz_buyer_user_id: user.id,
        versuz_seller_user_id: subject.author_user_id,
      },
    },
    success_url: `${base}/buy/${kind}/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/buy/${kind}/${slug}`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}
