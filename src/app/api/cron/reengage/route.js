// GET /api/cron/reengage?secret=<CRON_SECRET>&limit=20&days=30
//
// Sends a re-engagement email to profiles that:
//   - have NOT been active for `days` (default 30) days
//   - have NEVER received a re-engagement email, OR last one was > 90 days ago
//
// Batched to `limit` per run to stay under Resend free-tier (100/day).
// Daily cron (vercel.json) means we cover ~600 users/month at limit=20.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { reengagementEmail } from "@/lib/emails/transactional";
import { unsubLink } from "@/lib/emails/unsubscribe-token";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

export async function GET(request) {
  const url = new URL(request.url);
  const qSecret = url.searchParams.get("secret") || "";
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected || (qSecret !== expected && headerSecret !== expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const days = Math.max(7, Number(url.searchParams.get("days") || 30));

  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "db unavailable" }, { status: 503 });

  const inactiveCutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const reengageCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  // Fetch candidates : inactive AND (never re-engaged OR last re-engagement was > 90d ago)
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, github_login, email_welcomed_at, last_active_at, reengage_sent_at")
    .lt("last_active_at", inactiveCutoff)
    .not("email_welcomed_at", "is", null) // only profiles that completed signup
    .or(`reengage_sent_at.is.null,reengage_sent_at.lt.${reengageCutoff}`)
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (!profiles || profiles.length === 0) {
    return Response.json({ ok: true, sent: 0, candidates: 0 });
  }

  // We need emails — they live in auth.users not profiles. Fetch in batch.
  const userIds = profiles.map((p) => p.id);
  const { data: users, error: authErr } = await sb.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authErr) return Response.json({ error: authErr.message }, { status: 500 });

  const emailById = new Map(
    (users?.users || [])
      .filter((u) => userIds.includes(u.id) && u.email)
      .map((u) => [u.id, u.email])
  );

  let sent = 0;
  const failures = [];
  for (const p of profiles) {
    const email = emailById.get(p.id);
    if (!email) continue;
    const daysInactive = p.last_active_at
      ? Math.floor((Date.now() - new Date(p.last_active_at).getTime()) / 86400000)
      : null;
    try {
      const { subject, html } = reengagementEmail({
        githubLogin: p.github_login,
        daysInactive,
        email,
      });
      const r = await sendEmail({
        to: email,
        subject,
        html,
        unsubscribeUrl: unsubLink(SITE, email),
      });
      if (r.ok) {
        sent++;
        await sb
          .from("profiles")
          .update({ reengage_sent_at: new Date().toISOString() })
          .eq("id", p.id);
      } else if (!r.skipped) {
        failures.push({ id: p.id, error: r.error });
      }
    } catch (e) {
      failures.push({ id: p.id, error: e.message });
    }
  }

  return Response.json({
    ok: true,
    candidates: profiles.length,
    sent,
    failures: failures.length,
  });
}
