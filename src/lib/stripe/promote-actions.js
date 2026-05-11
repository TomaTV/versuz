"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured, siteUrl } from "@/lib/stripe/server";
import {
  PROMOTE_PRICE_USD,
  PROMOTE_DAYS,
  PROMOTE_MAX_ACTIVE_DAYS,
  PROMOTE_RATE_LIMIT_HOURS,
} from "@/lib/stripe/promote-config";

/**
 * Look up a subject (skill or claude_md) and its already-active boost
 * window if any. Used by /promote page render + checkout guard.
 */
export async function loadPromotableSubject({ kind, slug }) {
  const sb = await createSupabaseServerClient();
  if (!sb) return { error: "supabase_unconfigured" };
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const sel =
    kind === "claude_md"
      ? "id, slug, project_category, description, tier, promoted_until, github_stars, metadata"
      : "id, slug, name, category, description, tier, promoted_until, github_stars, metadata";
  const { data: subject, error } = await sb
    .from(table)
    .select(sel)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !subject) return { error: "not_found" };
  return { subject };
}

/**
 * Server action — create Stripe Checkout for a boost. Form action.
 */
export async function createPromoteCheckoutAction(formData) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured.");
  const kind = String(formData.get("kind") || "");
  const slug = String(formData.get("slug") || "");
  if (!kind || !slug) throw new Error("Missing kind or slug");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/promote/${kind}/${slug}`)}`);
  }

  const { subject, error } = await loadPromotableSubject({ kind, slug });
  if (error) redirect(`/promote/${kind}/${slug}?err=${error}`);

  // Cap : if buying another 30d would push promoted_until past now+365d, refuse.
  const now = Date.now();
  const currentUntilMs = subject.promoted_until
    ? new Date(subject.promoted_until).getTime()
    : 0;
  const projectedUntilMs =
    Math.max(now, currentUntilMs) + PROMOTE_DAYS * 24 * 60 * 60 * 1000;
  const maxAllowedMs = now + PROMOTE_MAX_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  if (projectedUntilMs > maxAllowedMs) {
    redirect(`/promote/${kind}/${slug}?err=cap_reached`);
  }

  // Rate limit : refuse if a paid promotion was created < N hours ago for
  // this same item by this same buyer.
  const adminSb = createSupabaseAdminClient();
  if (adminSb) {
    const cutoffIso = new Date(
      now - PROMOTE_RATE_LIMIT_HOURS * 60 * 60 * 1000
    ).toISOString();
    const idColumn = kind === "claude_md" ? "claude_md_id" : "skill_id";
    const { count } = await adminSb
      .from("promotions")
      .select("*", { count: "exact", head: true })
      .eq("buyer_user_id", user.id)
      .eq(idColumn, subject.id)
      .eq("status", "paid")
      .gte("paid_at", cutoffIso);
    if ((count || 0) > 0) {
      redirect(`/promote/${kind}/${slug}?err=rate_limit`);
    }
  }

  const stripe = getStripe();
  const base = siteUrl();
  const amountCents = Math.round(PROMOTE_PRICE_USD * 100);

  const productLabel =
    kind === "claude_md"
      ? `Boost · ${subject.metadata?.author || ""}/${subject.metadata?.repo || subject.slug} (${PROMOTE_DAYS} days)`
      : `Boost · ${subject.name || subject.slug} (${PROMOTE_DAYS} days)`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productLabel,
            description: `Featured placement on Versuz marketplace for ${PROMOTE_DAYS} days.`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      // No transfer_data — promote fees stay 100% with Versuz.
      metadata: {
        versuz_action: "promote",
        versuz_promote_kind: kind,
        versuz_promote_id: String(subject.id),
        versuz_promote_slug: subject.slug,
        versuz_promote_days: String(PROMOTE_DAYS),
        versuz_buyer_user_id: user.id,
      },
    },
    success_url: `${base}/promote/${kind}/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/promote/${kind}/${slug}`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}
