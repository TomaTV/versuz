/**
 * Cron — auto-complete cycles where all jobs are done but status est encore
 * "running". Sécurité contre les scripts bench qui crash entre la fin du
 * judging et le `setCycleStatus(completed)` — le cycle reste affiché RUNNING
 * éternellement.
 *
 * Logique :
 *   - Pour chaque cycle status='running' depuis >5 min
 *   - Si jobs queued=0 ET jobs error=0 ET completed>0 → flip à 'completed'
 *   - Refresh rankings ensuite pour matérialiser
 *
 * Schedule (cf. vercel.json) : toutes les 5 min, en complément de
 * /api/cron/refresh-rankings.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "DB unavailable" }, { status: 503 });

  // Pull running cycles older than 5 min
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: cycles, error: cyclesErr } = await sb
    .from("cycles")
    .select("id, scope, started_at, status")
    .eq("status", "running")
    .lt("started_at", fiveMinAgo);
  if (cyclesErr) return Response.json({ error: cyclesErr.message }, { status: 500 });

  const completed = [];
  for (const c of cycles || []) {
    // Pour chaque cycle, check le breakdown des jobs
    const [q, e, d] = await Promise.all([
      sb.from("run_jobs").select("id", { count: "exact", head: true }).eq("cycle_id", c.id).eq("status", "queued"),
      sb.from("run_jobs").select("id", { count: "exact", head: true }).eq("cycle_id", c.id).eq("status", "error"),
      sb.from("run_jobs").select("id", { count: "exact", head: true }).eq("cycle_id", c.id).in("status", ["completed", "cached"]),
    ]);
    const queuedCount = q.count || 0;
    const errorCount = e.count || 0;
    const doneCount = d.count || 0;

    // Auto-complete uniquement si : 0 queued, 0 errored, au moins 1 done
    if (queuedCount === 0 && errorCount === 0 && doneCount > 0) {
      const { error: updErr } = await sb
        .from("cycles")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", c.id);
      if (!updErr) completed.push({ id: c.id, scope: c.scope, doneCount });
    }
  }

  // Refresh rankings si on a flippé au moins un cycle
  if (completed.length > 0) {
    try { await sb.rpc("refresh_rankings"); } catch {}
  }

  return Response.json({
    ok: true,
    checked: (cycles || []).length,
    completed: completed.length,
    cycles: completed,
  });
}
