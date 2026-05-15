/**
 * Stripe webhook receiver.
 *
 * IMPORTANT — Next.js 16 App Router:
 *   We need the raw body string for `stripe.webhooks.constructEvent` to verify
 *   the signature. Reading via `request.text()` does that exactly. Do NOT
 *   `request.json()` (Stripe's signature is computed against raw bytes).
 *
 * Local testing:
 *   Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and
 *   set the printed `whsec_…` as STRIPE_WEBHOOK_SECRET in `.env.local`.
 *
 * Events handled:
 *   - checkout.session.completed   → insert `purchases` row (status=paid)
 *   - account.updated              → snapshot stripe_*_enabled into profiles
 *   - payment_intent.payment_failed → audit row (status=failed)
 */

import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signPremiumDownloadUrl } from "@/lib/premium/storage";
import { PROMOTE_MAX_ACTIVE_DAYS } from "@/lib/stripe/promote-config";
import { sendEmail, isResendConfigured } from "@/lib/resend";
import { brandedEmail } from "@/lib/emails/template";
import { siteUrl } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_unconfigured" }, { status: 500 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook_secret_missing" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no_signature" }, { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.warn(`[stripe-webhook] signature verify failed: ${err.message}`);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Only the events we actually persist need the DB client. Stripe forwards
  // many noisy events (balance.available, charge.updated, etc.) — bail early
  // so a missing service-role key doesn't 500 every irrelevant event.
  const HANDLED = new Set([
    "checkout.session.completed",
    "account.updated",
    "payment_intent.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.closed",
  ]);
  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const sb = createSupabaseAdminClient();
  if (!sb) {
    return NextResponse.json({ error: "db_unconfigured" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, sb, event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdated(sb, event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(sb, event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(sb, event.data.object);
        break;

      case "charge.dispute.created":
        await handleDisputeOpened(sb, event.data.object);
        break;

      case "charge.dispute.closed":
        await handleDisputeClosed(sb, event.data.object);
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler ${event.type} failed: ${err.message}`);
    // Return 500 so Stripe retries (idempotent inserts handle the retry safely).
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(stripe, sb, session) {
  // Need payment_intent for application_fee_amount / metadata. If the session
  // is in async_payment_succeeded vs sync, payment_intent is the same id.
  const pi = session.payment_intent
    ? await stripe.paymentIntents.retrieve(session.payment_intent)
    : null;
  const meta = pi?.metadata || session.metadata || {};

  // Promote (boost) checkout takes a different code path — different table,
  // no Connect split, and writes a `promoted_until` window on the subject.
  if (meta.versuz_action === "promote") {
    return await handlePromoteCheckout(sb, session, pi, meta);
  }

  const subjectKind = meta.versuz_subject_kind;
  const subjectId = meta.versuz_subject_id;
  const buyerUserId = meta.versuz_buyer_user_id || session.client_reference_id;

  if (!subjectKind || !subjectId || !buyerUserId) {
    console.warn(
      `[stripe-webhook] checkout.session.completed missing metadata: ${JSON.stringify(meta)}`
    );
    return;
  }

  const amountUsd = (session.amount_total || 0) / 100;
  const feeCents = pi?.application_fee_amount || 0;
  const commissionUsd = feeCents / 100;

  const row = {
    buyer_user_id: buyerUserId,
    subject_kind: subjectKind,
    skill_id: subjectKind === "skill" ? subjectId : null,
    claude_md_id: subjectKind === "claude_md" ? subjectId : null,
    amount_usd: amountUsd,
    commission_usd: commissionUsd,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent || null,
    status: session.payment_status === "paid" ? "paid" : "pending",
    paid_at: session.payment_status === "paid" ? new Date().toISOString() : null,
  };

  // If the subject has a private payload, mint a signed URL the buyer can
  // hit immediately from the success page / receipt. The detail page also
  // signs a fresh URL on render, so an expired cached URL never blocks the
  // buyer — this is just a "warm" cache for the immediate post-checkout UX.
  if (row.status === "paid") {
    const table = subjectKind === "skill" ? "skills" : "claude_md_files";
    const { data: subjectRow } = await sb
      .from(table)
      .select("private_storage_path")
      .eq("id", subjectId)
      .maybeSingle();
    if (subjectRow?.private_storage_path) {
      const signed = await signPremiumDownloadUrl(subjectRow.private_storage_path);
      if (signed.url) {
        row.download_url = signed.url;
        row.download_url_expires_at = signed.expiresAt;
      } else {
        // Don't block the purchase row insert — a missing URL just means the
        // buyer's detail page will mint one on render. Log loudly though.
        console.warn(`[stripe-webhook] sign download_url failed: ${signed.error}`);
      }
    }
  }

  // Upsert by stripe_session_id (unique). Stripe replays this event under
  // various conditions (eventual consistency, manual replay) — idempotent.
  const { error } = await sb
    .from("purchases")
    .upsert(row, { onConflict: "stripe_session_id" });
  if (error) throw new Error(`purchases upsert: ${error.message}`);

  // Best-effort branded receipt email to the buyer with the download link.
  // Failure is logged but doesn't 500 the webhook (Stripe will retry which
  // would just re-send the email — bad UX). Resend skipped silently if env
  // var unset.
  if (row.status === "paid" && isResendConfigured()) {
    try {
      const buyerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        meta.versuz_buyer_email;
      if (buyerEmail) {
        await sendPurchaseReceiptEmail({
          to: buyerEmail,
          subjectKind,
          subjectId,
          downloadUrl: row.download_url,
          amountUsd,
          sessionId: session.id,
          sb,
        });
      }
    } catch (emailErr) {
      console.warn(`[stripe-webhook] receipt email failed: ${emailErr.message}`);
    }
  }
}

async function sendPurchaseReceiptEmail({ to, subjectKind, subjectId, downloadUrl, amountUsd, sessionId, sb }) {
  const table = subjectKind === "skill" ? "skills" : "claude_md_files";
  const sel =
    subjectKind === "skill"
      ? "slug, name, github_url"
      : "slug, project_category, github_url, metadata";
  const { data: subject } = await sb.from(table).select(sel).eq("id", subjectId).maybeSingle();
  if (!subject) return;

  const itemName =
    subjectKind === "skill"
      ? subject.name || subject.slug
      : subject.metadata?.author && subject.metadata?.repo
        ? `${subject.metadata.author}/${subject.metadata.repo}`
        : subject.slug;

  const detailUrl =
    subjectKind === "skill"
      ? `${siteUrl()}/skills/${subject.slug}`
      : `${siteUrl()}/claude-md/${subject.project_category || "generic"}/${subject.slug}`;

  const downloadBlock = downloadUrl
    ? `
      <p style="margin:16px 0 8px"><strong>Your download is ready</strong> (link valid 7 days):</p>
      <p style="margin:0 0 12px">
        <a href="${downloadUrl}" style="word-break:break-all;color:#c2410c">${downloadUrl.slice(0, 80)}${downloadUrl.length > 80 ? "…" : ""}</a>
      </p>
      <p style="margin:0;color:#6b6557;font-size:14px">Refresh the link from your <a href="${detailUrl}" style="color:#c2410c">item page</a> if it expires.</p>
      `
    : `
      <p style="margin:0;color:#6b6557;font-size:14px">This item is badge-only — no exclusive download. The author has been notified of your support.</p>
      `;

  const body = `
    <p style="margin:0 0 16px">Payment of <strong>$${amountUsd.toFixed(2)}</strong> confirmed.</p>
    <p style="margin:0 0 16px;color:#6b6557;font-size:14px">Stripe sent 70% to the author and 30% to Versuz. A separate receipt has been emailed by Stripe.</p>
    ${downloadBlock}
    <p style="margin:24px 0 0;color:#6b6557;font-size:13px">Session · ${sessionId.slice(0, 32)}…</p>
  `;

  const html = brandedEmail({
    title: `Thanks for <em style="color:#c2410c;font-style:italic">${itemName}</em>.`,
    preheader: `Receipt + ${downloadUrl ? "download link" : "confirmation"}`,
    body,
    cta: { label: "View the listing", href: detailUrl },
  });

  await sendEmail({
    to,
    subject: `Your Versuz purchase — ${itemName}`,
    html,
  });
}

/**
 * Boost / promote checkout. Writes a row into `promotions` and bumps the
 * subject's `promoted_until` window. Idempotent on stripe_session_id;
 * rerunning the same event is a no-op.
 *
 * Stacking rule : if the subject already has an active boost, the new
 * window is appended (`max(now, current_until) + N days`). Past expirations
 * are ignored — buying after expiry just resets from now.
 */
async function handlePromoteCheckout(sb, session, pi, meta) {
  const subjectKind = meta.versuz_promote_kind;
  const subjectId = meta.versuz_promote_id;
  const buyerUserId = meta.versuz_buyer_user_id || session.client_reference_id;
  const days = parseInt(meta.versuz_promote_days || "30", 10);

  if (!subjectKind || !subjectId || !buyerUserId || !Number.isFinite(days) || days <= 0) {
    console.warn(
      `[stripe-webhook] promote checkout missing/invalid metadata: ${JSON.stringify(meta)}`
    );
    return;
  }

  // 1. Upsert the promotion ledger row (idempotent).
  const isPaid = session.payment_status === "paid";
  const promotionRow = {
    buyer_user_id: buyerUserId,
    subject_kind: subjectKind,
    skill_id: subjectKind === "skill" ? subjectId : null,
    claude_md_id: subjectKind === "claude_md" ? subjectId : null,
    amount_usd: (session.amount_total || 0) / 100,
    duration_days: days,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent || null,
    status: isPaid ? "paid" : "pending",
    paid_at: isPaid ? new Date().toISOString() : null,
  };

  if (isPaid) {
    promotionRow.activated_at = new Date().toISOString();
  }

  const { error: insErr } = await sb
    .from("promotions")
    .upsert(promotionRow, { onConflict: "stripe_session_id" });
  if (insErr) throw new Error(`promotions upsert: ${insErr.message}`);

  if (!isPaid) return;

  // 2. Compute and apply the new promoted_until on the subject.
  const table = subjectKind === "skill" ? "skills" : "claude_md_files";
  const { data: subjectRow, error: readErr } = await sb
    .from(table)
    .select("promoted_until")
    .eq("id", subjectId)
    .maybeSingle();
  if (readErr) throw new Error(`subject read: ${readErr.message}`);

  const now = Date.now();
  const currentUntil = subjectRow?.promoted_until
    ? new Date(subjectRow.promoted_until).getTime()
    : 0;
  const baseMs = Math.max(now, currentUntil);
  // Clamp to PROMOTE_MAX_ACTIVE_DAYS from now — defense in depth even if the
  // checkout-action cap was bypassed (race / direct API call / future env tweak).
  const requestedMs = baseMs + days * 24 * 60 * 60 * 1000;
  const maxMs = now + PROMOTE_MAX_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const newUntil = new Date(Math.min(requestedMs, maxMs)).toISOString();

  // Boost is paid, bump bench_pending=true so the next bench cycle judges
  // this item in priority (boost gives visibility on the marketplace, but
  // also fast-tracks the bench so the score is fresh by the time the
  // increased traffic discovers it). Same rationale for premium / featured.
  const { error: updErr } = await sb
    .from(table)
    .update({ promoted_until: newUntil, bench_pending: true })
    .eq("id", subjectId);
  if (updErr) throw new Error(`subject promoted_until update: ${updErr.message}`);

  // 3. Stamp expires_at on the promotion row (= newUntil).
  await sb
    .from("promotions")
    .update({ expires_at: newUntil })
    .eq("stripe_session_id", session.id);
}

async function handleAccountUpdated(sb, account) {
  const { error } = await sb
    .from("profiles")
    .update({
      stripe_charges_enabled: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_onboarding_complete:
        !!account.details_submitted && !!account.charges_enabled,
    })
    .eq("stripe_account_id", account.id);
  if (error) throw new Error(`profiles update: ${error.message}`);
}

async function handlePaymentFailed(sb, paymentIntent) {
  const meta = paymentIntent.metadata || {};
  if (!meta.versuz_subject_kind) return;

  await sb
    .from("purchases")
    .upsert(
      {
        buyer_user_id: meta.versuz_buyer_user_id,
        subject_kind: meta.versuz_subject_kind,
        skill_id: meta.versuz_subject_kind === "skill" ? meta.versuz_subject_id : null,
        claude_md_id:
          meta.versuz_subject_kind === "claude_md" ? meta.versuz_subject_id : null,
        amount_usd: (paymentIntent.amount || 0) / 100,
        commission_usd: 0,
        stripe_payment_intent_id: paymentIntent.id,
        status: "failed",
      },
      { onConflict: "stripe_payment_intent_id" }
    );
}

/**
 * `charge.refunded` fires when a charge gets a full or partial refund. Stripe
 * sends this for both initial-side refunds AND when our app calls
 * `stripe.refunds.create`. We only flip the purchase row if the charge is
 * fully refunded (`amount_refunded === amount`); partial refunds keep status
 * "paid" but get a `refunded_amount_usd` annotation in metadata for audit.
 */
async function handleChargeRefunded(sb, charge) {
  if (!charge.payment_intent) return;
  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const patch = fullyRefunded
    ? { status: "refunded" }
    : { status: "paid" }; // keep paid; partial refund handled by Stripe directly
  const { error } = await sb
    .from("purchases")
    .update(patch)
    .eq("stripe_payment_intent_id", charge.payment_intent);
  if (error) throw new Error(`refund update: ${error.message}`);
}

/**
 * `charge.dispute.created` fires when a buyer files a chargeback. Mark the
 * purchase as disputed so the seller's earnings page reflects it (we do NOT
 * remove the row — chargebacks can be won, in which case `dispute.closed`
 * will flip it back).
 */
async function handleDisputeOpened(sb, dispute) {
  if (!dispute.payment_intent) return;
  const { error } = await sb
    .from("purchases")
    .update({ status: "disputed" })
    .eq("stripe_payment_intent_id", dispute.payment_intent);
  if (error) throw new Error(`dispute open update: ${error.message}`);
}

/**
 * `charge.dispute.closed` fires when the dispute is resolved either way.
 *   - status='won'  → seller wins, flip back to 'paid'
 *   - status='lost' → buyer wins, flip to 'refunded' (Stripe already pulled funds)
 *   - status='warning_closed' / others → leave as 'disputed' (manual review)
 */
async function handleDisputeClosed(sb, dispute) {
  if (!dispute.payment_intent) return;
  let newStatus = null;
  if (dispute.status === "won") newStatus = "paid";
  else if (dispute.status === "lost") newStatus = "refunded";
  if (!newStatus) return;
  const { error } = await sb
    .from("purchases")
    .update({ status: newStatus })
    .eq("stripe_payment_intent_id", dispute.payment_intent);
  if (error) throw new Error(`dispute close update: ${error.message}`);
}
