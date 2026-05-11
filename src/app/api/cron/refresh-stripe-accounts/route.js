/**
 * Cron — refresh Stripe Connect account flags as a backup to the
 * `account.updated` webhook.
 *
 * Why : webhooks can drop (network glitch, Stripe queue backed up,
 * misconfigured endpoint). If a seller's `charges_enabled` flips to true
 * via Stripe but our webhook never delivered, they'd see "in progress"
 * forever in /profile/settings. This cron sweeps every 6h and rectifies.
 *
 * Strategy : fetch all profiles with stripe_account_id, ask Stripe for
 * their current capability flags, write back if differs. Idempotent.
 *
 * Schedule : every 6 hours (cron `0 0,6,12,18 * * *` in vercel.json).
 *
 * Manual trigger :
 *   GET /api/cron/refresh-stripe-accounts?secret=<CRON_SECRET>
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request) {
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (isVercelCron) return true;
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected || querySecret === expected;
}

export async function GET(request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isStripeConfigured()) {
    return Response.json({ ok: false, reason: "stripe_unconfigured" });
  }
  const sb = createSupabaseAdminClient();
  if (!sb) {
    return Response.json({ error: "DB unavailable" }, { status: 503 });
  }

  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_complete")
    .not("stripe_account_id", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const stripe = getStripe();
  const updated = [];
  const errors = [];

  // Throttle : Stripe API rate limit is 100 read req/s. We'd be way under
  // even with thousands of sellers, but iterate sequentially anyway to be
  // a good citizen.
  for (const p of profiles || []) {
    try {
      const account = await stripe.accounts.retrieve(p.stripe_account_id);
      const next = {
        stripe_charges_enabled: !!account.charges_enabled,
        stripe_payouts_enabled: !!account.payouts_enabled,
        stripe_onboarding_complete:
          !!account.details_submitted && !!account.charges_enabled,
      };
      const drift =
        next.stripe_charges_enabled !== !!p.stripe_charges_enabled ||
        next.stripe_payouts_enabled !== !!p.stripe_payouts_enabled ||
        next.stripe_onboarding_complete !== !!p.stripe_onboarding_complete;
      if (!drift) continue;
      const { error: updErr } = await sb.from("profiles").update(next).eq("id", p.id);
      if (updErr) errors.push({ profile: p.id, error: updErr.message });
      else updated.push({ profile: p.id, account: p.stripe_account_id, ...next });
    } catch (err) {
      errors.push({ profile: p.id, account: p.stripe_account_id, error: err.message });
    }
  }

  return Response.json({
    ok: true,
    checked: profiles?.length || 0,
    updated: updated.length,
    errors: errors.length,
    updates: updated,
    errorList: errors,
  });
}
