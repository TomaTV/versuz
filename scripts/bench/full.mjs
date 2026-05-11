#!/usr/bin/env node
import "../_env.mjs";

/**
 * Bench full — single-phase, 3 judges, ordered by stars desc.
 *
 * Plus de tier system : on bench TOUS les subjects d'une catégorie en une
 * passe avec 3 judges (Haiku 4.5 + DeepSeek V3 + GPT-5 mini). Ordre :
 * biggest stars first → les noms reconnus apparaissent sur le leaderboard
 * en premier.
 *
 * Usage :
 *   node scripts/bench/full.mjs --scope=skills.document
 *   node scripts/bench/full.mjs --scope=skills.document --tasks=3
 *   node scripts/bench/full.mjs --all
 *   node scripts/bench/full.mjs --scope=skills.document --max-subjects=100
 *
 * Cost estimation (Versuz standard : 3 judges or-v1 × 5 tasks/subject) :
 *   ~$0.005 per (subject × task) = $0.025/subject (with prompt caching ~30%)
 *   200 subjects  = ~$5
 *   1000 subjects = ~$25
 *   2000 subjects = ~$50
 *   5000 subjects = ~$125 (full registry one-shot)
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const ALL_SCOPES = [
  "skills.document",
  "skills.sql",
  "skills.data",
  "skills.web",
  "skills.shell",
  "skills.code",
  "claude-md.nextjs",
  "claude-md.react",
  "claude-md.python-data",
  "claude-md.backend-api",
  "claude-md.mobile",
  "claude-md.devops",
  "claude-md.ml-training",
  "claude-md.generic",
];

function parseArgs(argv) {
  const out = {
    scope: null,
    all: false,
    tasks: 5, // Versuz standard (per Perplexity research, May 2026) :
              // - 3 judges + 5 tasks = 15 evals/item, sweet spot inter-judge × inter-task
              // - CI95 ~±6-7 pts per item, Spearman > 0.7 vs human gold expected
              // - Cost $0.025/item at or-v1 → 720 items per $18 budget
              // - Public ranking benchmark requires N ≥ 5 to avoid random re-run swaps
    maxSubjects: 0, // 0 = no limit
    concurrency: 6,
    dryRun: false,
  };
  for (const a of argv.slice(2)) {
    if (a === "--all") out.all = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--scope=")) out.scope = a.slice(8);
    else if (a.startsWith("--tasks=")) out.tasks = Number(a.slice(8));
    else if (a.startsWith("--max-subjects=")) out.maxSubjects = Number(a.slice(15));
    else if (a.startsWith("--concurrency=")) out.concurrency = Number(a.slice(14));
  }
  if (!out.scope && !out.all) {
    console.error("[full] --scope=<kind>.<category> OR --all required");
    process.exit(1);
  }
  return out;
}

function parseScope(scope) {
  const i = scope.indexOf(".");
  const kindRaw = scope.slice(0, i);
  const category = scope.slice(i + 1);
  const kind = kindRaw === "claude-md" || kindRaw === "claude_md" ? "claude_md" : "skill";
  return { kind, category };
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[full] missing Supabase env vars");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadSubjects(sb, kind, category, limit) {
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const col = kind === "skill" ? "category" : "project_category";
  // Priority order :
  //   1. bench_pending=true (user-submitted or fresh scrape, needs first pass)
  //   2. github_stars DESC (biggest first for organic batches)
  let q = sb
    .from(table)
    .select("id, slug, github_stars, bench_pending")
    .eq(col, category)
    .order("bench_pending", { ascending: false, nullsFirst: false })
    .order("github_stars", { ascending: false, nullsFirst: false });
  if (limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function loadTasks(sb, category, limit) {
  const { data, error } = await sb
    .from("tasks")
    .select("id, slug")
    .eq("category", category)
    .order("slug", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

async function enqueue(sb, { scope, kind, subjects, tasks }) {
  // Check if there's already a running/queued cycle for this scope.
  // Re-use it instead of creating an orphan that would never get picked up
  // (index.mjs FIFO picks the oldest non-completed cycle for the scope).
  const { data: existing } = await sb
    .from("cycles")
    .select("id, status, started_at")
    .eq("scope", scope)
    .in("status", ["queued", "running", "partial"])
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let cycle;
  if (existing) {
    console.log(`  ↺ reusing cycle #${existing.id} (status=${existing.status}) — skipping enqueue`);
    cycle = existing;
    // Don't re-insert run_jobs : either it's still running its original set,
    // or it has leftover queued jobs that index.mjs will pick up.
    return { cycleId: cycle.id, jobs: 0, reused: true };
  }
  const { data: created, error: cycleErr } = await sb
    .from("cycles")
    .insert({ scope, status: "queued" })
    .select()
    .single();
  if (cycleErr) throw new Error(`cycle insert: ${cycleErr.message}`);
  cycle = created;
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
  if (pairs.length === 0) return { cycleId: cycle.id, jobs: 0 };
  for (let i = 0; i < pairs.length; i += 1000) {
    const slice = pairs.slice(i, i + 1000);
    const { error: jobsErr } = await sb.from("run_jobs").insert(slice);
    if (jobsErr) throw new Error(`run_jobs insert: ${jobsErr.message}`);
  }
  return { cycleId: cycle.id, jobs: pairs.length };
}

function runBench({ scope, concurrency, dryRun }) {
  if (dryRun) {
    console.log(`  [dry-run] would spawn: node scripts/bench/index.mjs --scope=${scope} --concurrency=${concurrency}`);
    return { code: 0 };
  }
  const res = spawnSync(
    "node",
    ["scripts/bench/index.mjs", `--scope=${scope}`, `--concurrency=${concurrency}`],
    {
      env: { ...process.env, BENCH_MODE: "or-v1", BENCH_JUDGE_COUNT: "3" },
      stdio: "inherit",
    }
  );
  return { code: res.status };
}

async function refreshRankings(sb, dryRun) {
  if (dryRun) {
    console.log("  [dry-run] would call refresh_rankings()");
    return;
  }
  try {
    const { error } = await sb.rpc("refresh_rankings");
    if (error) console.warn(`  warn: refresh_rankings failed: ${error.message}`);
    else console.log("  rankings refreshed");
  } catch (e) {
    console.warn(`  refresh_rankings threw: ${e.message}`);
  }
}

async function runOneScope(sb, scope, args) {
  const { kind, category } = parseScope(scope);
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  SCOPE : ${scope.padEnd(52)} ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const subjects = await loadSubjects(sb, kind, category, args.maxSubjects);
  const tasks = await loadTasks(sb, category, args.tasks);
  console.log(`  ${subjects.length} subjects × ${tasks.length} task(s) × 3 judges = ${subjects.length * tasks.length * 3} LLM calls`);

  if (subjects.length === 0 || tasks.length === 0) {
    console.log("  skipped (no subjects or no tasks)");
    return;
  }

  if (args.dryRun) {
    runBench({ scope, concurrency: args.concurrency, dryRun: true });
    return;
  }

  const { cycleId, jobs } = await enqueue(sb, { scope, kind, subjects, tasks });
  console.log(`  enqueued cycle #${cycleId} with ${jobs} jobs`);

  const r = runBench({ scope, concurrency: args.concurrency, dryRun: false });
  if (r.code !== 0) {
    console.error(`  bench failed (exit ${r.code})`);
    return;
  }

  await refreshRankings(sb, false);
  console.log(`  ✓ ${scope} done`);
}

async function main() {
  const args = parseArgs(process.argv);
  const sb = makeSupabase();
  const scopes = args.all ? ALL_SCOPES : [args.scope];
  const tStart = Date.now();
  for (const scope of scopes) {
    try {
      await runOneScope(sb, scope, args);
    } catch (e) {
      console.error(`[full] scope ${scope} failed : ${e.message}`);
    }
  }
  const elapsed = ((Date.now() - tStart) / 1000 / 60).toFixed(1);
  console.log("");
  console.log(`[full] ✓ ${scopes.length} scope(s) done in ${elapsed} min`);
}

main().catch((e) => {
  console.error("[full] fatal:", e.stack || e);
  process.exit(1);
});
