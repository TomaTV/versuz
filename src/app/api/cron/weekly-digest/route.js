/**
 * Cron — weekly digest email to all newsletter subscribers.
 *
 * Sends one email per subscriber (not unsubscribed) summarising :
 *   - top 5 ranked skills of the week (avg_score desc)
 *   - top 5 ranked CLAUDE.md
 *   - count of new items submitted this week
 *
 * Skipped silently if RESEND_API_KEY is unset. Idempotent : a re-run of the
 * cron in the same week resends the email (no dedup column today, V1.5
 * could add `last_digest_sent_at` to subscribers).
 *
 * Schedule : `0 9 * * 5` (Fridays 9am UTC = ~10am CET).
 *
 * Manual trigger :
 *   GET /api/cron/weekly-digest?secret=<CRON_SECRET>&dry-run=1
 *   → dry-run renders the email but doesn't send, returns subscriber count.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/resend";

export const maxDuration = 300;

function authorized(request) {
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (isVercelCron) return true;
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected || querySecret === expected;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

function renderDigestHtml({ topSkills, topClaudeMds, newCount }) {
  const li = (it, kind) => {
    const href =
      kind === "skill"
        ? `${SITE}/skills/${it.subject_slug}`
        : `${SITE}/claude-md/${it.category}/${it.subject_slug}`;
    return `
      <li style="margin:0 0 8px;padding:8px 0;border-bottom:1px solid #e6e1d6">
        <a href="${href}" style="color:#14120e;text-decoration:none;font-family:Georgia,serif;font-size:18px;letter-spacing:-0.01em">
          ${escape(it.subject_name || it.subject_slug)}
        </a>
        <span style="font-family:'SF Mono',monospace;font-size:11px;color:#6b6557;letter-spacing:0.04em;margin-left:8px">
          ${it.category} · ${Number(it.avg_score).toFixed(1)}
        </span>
      </li>`;
  };

  const skillsBlock =
    topSkills.length > 0
      ? `
      <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:32px 0 12px">
        Top <em style="color:#c2410c">skills</em> this week
      </h2>
      <ul style="margin:0;padding:0;list-style:none">
        ${topSkills.map((s) => li(s, "skill")).join("")}
      </ul>`
      : "";

  const claudeBlock =
    topClaudeMds.length > 0
      ? `
      <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:32px 0 12px">
        Top <em style="color:#c2410c">CLAUDE.md</em> this week
      </h2>
      <ul style="margin:0;padding:0;list-style:none">
        ${topClaudeMds.map((c) => li(c, "claude_md")).join("")}
      </ul>`
      : "";

  return `
    <div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#14120e;max-width:560px;margin:0 auto;padding:32px 24px">
      <p style="font-family:'SF Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#6b6557;text-transform:uppercase;margin:0 0 24px">VERSUZ · weekly digest</p>
      <h1 style="font-family:Georgia,serif;font-size:36px;font-weight:400;letter-spacing:-0.02em;line-height:1.05;margin:0 0 16px">
        This week in <em style="color:#c2410c">Versuz</em>.
      </h1>
      <p style="margin:0 0 12px">
        ${newCount > 0 ? `<strong>${newCount} new item${newCount > 1 ? "s" : ""}</strong> joined the registry. ` : ""}
        Here's what's ranking.
      </p>
      ${skillsBlock || `<p style="font-family:'SF Mono',monospace;font-size:12px;color:#6b6557;margin:24px 0 0">No skills ranked yet — bench engine warming up.</p>`}
      ${claudeBlock}
      <p style="margin-top:48px;color:#6b6557;font-size:13px">
        See the full <a href="${SITE}/leaderboard" style="color:#c2410c">leaderboard</a> ·
        <a href="${SITE}/marketplace" style="color:#c2410c">marketplace</a> ·
        Reply to unsubscribe.
      </p>
    </div>
  `;
}

function escape(s) {
  return String(s || "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]);
}

export async function GET(request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isResendConfigured()) {
    return Response.json({ ok: false, reason: "resend_unconfigured" });
  }
  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "DB unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const dryRun = url.searchParams.has("dry-run");

  // Top items.
  const [{ data: topSkills }, { data: topClaudeMds }] = await Promise.all([
    sb.from("rankings")
      .select("subject_slug, subject_name, category, avg_score")
      .eq("subject_kind", "skill")
      .not("avg_score", "is", null)
      .order("avg_score", { ascending: false })
      .limit(5),
    sb.from("rankings")
      .select("subject_slug, subject_name, category, avg_score")
      .eq("subject_kind", "claude_md")
      .not("avg_score", "is", null)
      .order("avg_score", { ascending: false })
      .limit(5),
  ]);

  // New items this week (across both kinds).
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: newSkills }, { count: newClaudeMds }] = await Promise.all([
    sb.from("skills").select("*", { count: "exact", head: true }).gte("scraped_at", weekAgoIso),
    sb.from("claude_md_files").select("*", { count: "exact", head: true }).gte("scraped_at", weekAgoIso),
  ]);
  const newCount = (newSkills || 0) + (newClaudeMds || 0);

  const html = renderDigestHtml({
    topSkills: topSkills || [],
    topClaudeMds: topClaudeMds || [],
    newCount,
  });

  // Subscribers.
  const { data: subs, error: subsErr } = await sb
    .from("subscribers")
    .select("email")
    .is("unsubscribed_at", null);
  if (subsErr) return Response.json({ error: subsErr.message }, { status: 500 });

  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      subscribersCount: subs?.length || 0,
      previewHtml: html.slice(0, 4000),
    });
  }

  // Send. Sequential to stay under Resend's rate limit (10 req/s on free tier).
  const sent = [];
  const failed = [];
  for (const s of subs || []) {
    const r = await sendEmail({
      to: s.email,
      subject: "Versuz · this week's digest",
      html,
    });
    if (r.ok) sent.push(s.email);
    else failed.push({ email: s.email, error: r.error });
    // Small delay to respect 10 req/s.
    await new Promise((res) => setTimeout(res, 120));
  }

  return Response.json({
    ok: true,
    subscribers: subs?.length || 0,
    sent: sent.length,
    failed: failed.length,
    failedList: failed.slice(0, 10),
  });
}
