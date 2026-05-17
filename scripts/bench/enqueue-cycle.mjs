#!/usr/bin/env node
import "../_env.mjs";
/**
 * Enqueue a fresh bench cycle: pick N subjects + M tasks for a given scope,
 * cartesian-product them into run_jobs.
 *
 * Usage:
 *   npm run bench:enqueue -- --scope=skills.document --subjects=5 --tasks=5
 *   npm run bench:enqueue -- --scope=claude-md.nextjs --subjects=3 --tasks=4
 *   npm run bench:enqueue -- --scope=skills.document --subjects=5 --tasks=5 --dry-run
 *
 * Subject selection: top-N by `prior` proxy (verification level + stars).
 * Task selection: top-M by `id` order (stable). Pass `--tasks=all` to enqueue every task in the category.
 *
 * Idempotent thanks to the unique constraint on (cycle_id, skill_id, task_id) /
 * (cycle_id, claude_md_id, task_id). Re-running with the same scope creates a
 * NEW cycle — pass `--cycle-id=<n>` to append to an existing cycle instead.
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const out = {
    scope: null,
    // Defaults sized for a real cycle — 5 subjects × 5 tasks = 25 jobs.
    // ~25 agent + 75 judge calls = 100 LLM calls. Stays under free Groq
    // quota (3000 RPD); costs ~$0.13/cycle on `or-v1` (3 paid judges).
    subjects: 5,
    tasks: 5,
    cycleId: null,
    dryRun: false,
  };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--scope=")) out.scope = a.slice(8);
    else if (a.startsWith("--subjects=")) out.subjects = a.slice(11) === "all" ? "all" : Number(a.slice(11));
    else if (a.startsWith("--tasks=")) out.tasks = a.slice(8) === "all" ? "all" : Number(a.slice(8));
    else if (a.startsWith("--cycle-id=")) out.cycleId = Number(a.slice(11));
  }
  if (!out.scope) {
    console.error(
      "[enqueue-cycle] --scope=<kind>.<category> required (e.g. skills.document, claude-md.nextjs)"
    );
    process.exit(1);
  }
  return out;
}

function parseScope(scope) {
  const i = scope.indexOf(".");
  if (i < 0) throw new Error(`Bad scope ${scope}`);
  const kindRaw = scope.slice(0, i);
  const category = scope.slice(i + 1);
  const kind = kindRaw === "claude-md" || kindRaw === "claude_md" ? "claude_md" : "skill";
  return { kind, category };
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[enqueue-cycle] Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadSubjects(sb, kind, category, limit) {
  // bench_pending=true first — user submissions get judged at the next cycle
  // instead of waiting their turn behind the verified inventory.
  if (kind === "skill") {
    let q = sb
      .from("skills")
      .select("id, slug")
      .eq("category", category)
      .order("bench_pending", { ascending: false, nullsFirst: false })
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false });
    if (limit !== "all") q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  let q = sb
    .from("claude_md_files")
    .select("id, slug")
    .eq("project_category", category)
    .order("bench_pending", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false });
  if (limit !== "all") q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function loadTasks(sb, category, limit) {
  let q = sb.from("tasks").select("id, slug").eq("category", category).order("slug", { ascending: true });
  if (limit !== "all") q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function getOrCreateCycle(sb, scope, cycleIdOverride) {
  if (cycleIdOverride) {
    const { data, error } = await sb.from("cycles").select("*").eq("id", cycleIdOverride).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`cycle ${cycleIdOverride} not found`);
    return data;
  }
  const { data, error } = await sb
    .from("cycles")
    .insert({ scope, status: "queued" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const args = parseArgs(process.argv);
  const { kind, category } = parseScope(args.scope);
  const sb = args.dryRun ? null : makeSupabase();

  console.log(
    `[enqueue-cycle] scope=${args.scope} kind=${kind} category=${category} subjects=${args.subjects} tasks=${args.tasks}`
  );

  if (args.dryRun) {
    console.log("[enqueue-cycle] --dry-run: skipping DB lookups + writes");
    return;
  }

  const [subjects, tasks] = await Promise.all([
    loadSubjects(sb, kind, category, args.subjects),
    loadTasks(sb, category, args.tasks),
  ]);

  if (!subjects.length) {
    console.error(`[enqueue-cycle] no ${kind} subjects in category ${category}.`);
    process.exit(1);
  }
  if (!tasks.length) {
    console.error(
      `[enqueue-cycle] no tasks in category ${category}. Run \`npm run bench:seed-tasks\` first.`
    );
    process.exit(1);
  }

  const cycle = await getOrCreateCycle(sb, args.scope, args.cycleId);
  console.log(`[enqueue-cycle] cycle #${cycle.id} (${cycle.status})`);

  const pairs = [];
  for (const s of subjects) {
    for (const t of tasks) {
      pairs.push({
        cycle_id: cycle.id,
        subject_kind: kind,
        skill_id: kind === "skill" ? s.id : null,
        claude_md_id: kind === "claude_md" ? s.id : null,
        task_id: t.id,
        status: "queued",
      });
    }
  }
  console.log(`[enqueue-cycle] inserting ${pairs.length} pairs (${subjects.length} subjects × ${tasks.length} tasks)`);

  // Insert one chunk; the unique constraint dedupes idempotent re-enqueues.
  const { error } = await sb.from("run_jobs").insert(pairs);
  if (error && !/duplicate key/.test(error.message)) {
    console.error(`[enqueue-cycle] insert failed: ${error.message}`);
    process.exit(1);
  }

  // Count what's actually queued for this cycle (handles re-enqueues / partial dups).
  const { count } = await sb
    .from("run_jobs")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", cycle.id)
    .eq("status", "queued");

  console.log(
    `[enqueue-cycle] cycle #${cycle.id} now has ${count} queued jobs. Run \`npm run bench -- --scope=${args.scope}\` to start.`
  );
}

main().catch((err) => {
  console.error(`[enqueue-cycle] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
