/**
 * DB-backed job queue for the bench engine.
 *
 * Why DB-backed (not Redis): one less moving part, idempotent by row, free
 * crash-recovery. Postgres handles ~1k jobs/cycle easily — and that's the
 * expected scale for V0 (50–100 skills × 30 tasks = 1500–3000 jobs).
 *
 * Worker pattern: pull a small batch with `for update skip locked`, mark
 * them `running`, do the work, mark them `completed` / `error`. Many
 * workers can pull simultaneously without coordination.
 */

import { createClient } from "@supabase/supabase-js";

export function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Create a new cycle and enqueue every (subject × task) pair that hasn't
 * been run yet for the given task set.
 */
export async function createCycle(sb, { scope }) {
  const { data, error } = await sb
    .from("cycles")
    .insert({ scope, status: "queued" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Mark cycle as running / completed / failed.
 */
export async function setCycleStatus(sb, cycleId, status, extra = {}) {
  const patch = {
    status,
    ...(status === "completed" || status === "failed"
      ? { completed_at: new Date().toISOString() }
      : {}),
    ...extra,
  };
  const { error } = await sb.from("cycles").update(patch).eq("id", cycleId);
  if (error) throw error;
}

/**
 * Insert run_jobs for a fresh cycle. Idempotent via the unique constraint
 * `(cycle_id, skill_id, task_id)` / `(cycle_id, claude_md_id, task_id)`.
 *
 * @param {Array<{cycle_id, subject_kind, skill_id?, claude_md_id?, task_id}>}
 *   pairs
 */
export async function enqueuePairs(sb, pairs) {
  if (!pairs.length) return 0;
  const { error, count } = await sb.from("run_jobs").insert(pairs, { count: "exact" });
  if (error && !error.message.includes("duplicate key")) throw error;
  return count || pairs.length;
}

/**
 * Atomically claim up to `limit` queued jobs for a worker.
 * Uses Postgres `for update skip locked` via a CTE update.
 */
export async function claimJobs(sb, { cycleId, limit = 8 }) {
  // Supabase JS doesn't expose `for update skip locked` directly, so we
  // implement claim via an RPC. Define it server-side as `claim_run_jobs`.
  const { data, error } = await sb.rpc("claim_run_jobs", {
    p_cycle_id: cycleId,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function markJobRunning(sb, id) {
  const { error } = await sb
    .from("run_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: 1 })
    .eq("id", id);
  if (error) throw error;
}

export async function markJobCompleted(sb, id, outputId, statusOverride = "completed") {
  const { error } = await sb
    .from("run_jobs")
    .update({
      status: statusOverride,
      output_id: outputId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markJobError(sb, id, message) {
  const { error } = await sb
    .from("run_jobs")
    .update({
      status: "error",
      error_message: message?.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
