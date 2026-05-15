/**
 * Cron sweep — flips run_jobs that have been `queued` more than N hours back
 * to `error` so the next bench run skips them and the cycle can complete.
 *
 * Why this matters : if `npm run bench` crashes mid-cycle (provider 429 storm,
 * dev kill, network drop), some jobs stay claimed/queued indefinitely. The
 * cycle can't transition to `completed` and a new cycle on the same scope
 * may conflict on subject×task uniqueness.
 *
 * Triggered by Vercel Cron every 6h (see vercel.json). Manual trigger via
 * GET /api/cron/sweep-stuck-jobs?secret=<CRON_SECRET>&hours=24.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  const sb = createSupabaseAdminClient();
  if (!sb) {
    return Response.json({ error: "DB unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const hours = parseInt(url.searchParams.get("hours") || "24", 10);
  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    return Response.json({ error: "hours must be 1-720" }, { status: 400 });
  }
  const cutoffIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Pull the rows that will be swept first so we can return a useful summary
  // (count + cycles affected).
  const { data: targets, error: e1 } = await sb
    .from("run_jobs")
    .select("id, cycle_id")
    .eq("status", "queued")
    .lt("queued_at", cutoffIso);
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  if (!targets || targets.length === 0) {
    return Response.json({ ok: true, swept: 0, hours });
  }

  const cyclesAffected = Array.from(new Set(targets.map((t) => t.cycle_id))).sort();

  const { error: e2, count } = await sb
    .from("run_jobs")
    .update(
      {
        status: "error",
        error_message: `swept by cron: queued > ${hours}h`,
      },
      { count: "exact" }
    )
    .eq("status", "queued")
    .lt("queued_at", cutoffIso);
  if (e2) return Response.json({ error: e2.message }, { status: 500 });

  // Best-effort: try to mark cycles completed if all their jobs are
  // now done/cached/error. Idempotent — RPC-style approach via a single
  // PostgREST call would be cleaner but this is fine for low-volume crons.
  const completed = [];
  for (const cycleId of cyclesAffected) {
    const { count: pending } = await sb
      .from("run_jobs")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .not("status", "in", "(completed,cached,error)");
    if ((pending || 0) === 0) {
      const { error: cErr } = await sb
        .from("cycles")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", cycleId)
        .neq("status", "completed");
      if (!cErr) completed.push(cycleId);
    }
  }

  return Response.json({
    ok: true,
    swept: count || targets.length,
    hours,
    cyclesAffected,
    cyclesMarkedCompleted: completed,
  });
}
