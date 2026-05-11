#!/usr/bin/env node
import "../_env.mjs";

/**
 * Tiered bench — 3-phase cost-optimized benchmark.
 *
 * Phase 0 (SCREEN)  : ALL subjects × 1 task × 1 judge (GPT-5 mini)     · $$
 * Phase 1 (VALIDATE): top 10% × 3 tasks × 2 judges (Haiku + mini)      · $$$
 * Phase 2 (CHAMPION): top 2%  × 5 tasks × 3 judges (Haiku + DS + mini) · $$$$
 *
 * Cumulé pour 5,000 skills : ~$22 (vs $145 en flat or-v1).
 *
 * Usage :
 *   node scripts/bench/tiered.mjs --scope=skills.document
 *   node scripts/bench/tiered.mjs --scope=skills.document --tier0-pct=20 --tier1-pct=5
 *   node scripts/bench/tiered.mjs --scope=skills.document --dry-run
 *
 * Marketing : seul le tier 2 (les top 2% du registry) affiche "3 frontier
 * judges" sur la landing. Les autres sont marqués comme "preliminary".
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const out = {
    scope: null,
    all: false,
    tier0Pct: 100,   // tier 0 = tous (par défaut, 100% du source)
    tier1Pct: 10,    // tier 1 = top 10% par score tier 0
    tier2Pct: 2,     // tier 2 = top 2% par score tier 1
    tier0Tasks: 1,
    tier1Tasks: 3,
    tier2Tasks: 5,
    concurrency: 6,
    dryRun: false,
    skipTier: null,  // skip un tier spécifique : 0, 1 ou 2
  };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--all") out.all = true;
    else if (a.startsWith("--scope=")) out.scope = a.slice(8);
    else if (a.startsWith("--tier0-pct=")) out.tier0Pct = Number(a.slice(12));
    else if (a.startsWith("--tier1-pct=")) out.tier1Pct = Number(a.slice(12));
    else if (a.startsWith("--tier2-pct=")) out.tier2Pct = Number(a.slice(12));
    else if (a.startsWith("--tier0-tasks=")) out.tier0Tasks = Number(a.slice(14));
    else if (a.startsWith("--tier1-tasks=")) out.tier1Tasks = Number(a.slice(14));
    else if (a.startsWith("--tier2-tasks=")) out.tier2Tasks = Number(a.slice(14));
    else if (a.startsWith("--concurrency=")) out.concurrency = Number(a.slice(14));
    else if (a.startsWith("--skip-tier=")) out.skipTier = Number(a.slice(12));
  }
  if (!out.scope && !out.all) {
    console.error("[tiered] --scope=<kind>.<category> OR --all required");
    process.exit(1);
  }
  return out;
}

// Les 14 scopes officiels (cf. ALLOWED_SCOPES dans /api/cron/bench/route.js)
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
    console.error("[tiered] missing Supabase env vars");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadSubjects(sb, kind, category, limit) {
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const col = kind === "skill" ? "category" : "project_category";
  // Order par stars desc → biggest first. Pour que le leaderboard se peuple
  // avec les noms reconnus d'abord (anthropics, vercel, etc.) au lieu de
  // skills inconnus.
  const q = sb
    .from(table)
    .select("id, slug, github_stars")
    .eq(col, category)
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  const { data, error } = limit ? await q.limit(limit) : await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function loadTopByRanking(sb, kind, category, limit) {
  const { data, error } = await sb
    .from("rankings")
    .select("subject_slug, skill_id, claude_md_id, avg_score")
    .eq("subject_kind", kind)
    .eq("category", category)
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({
    id: kind === "skill" ? r.skill_id : r.claude_md_id,
    slug: r.subject_slug,
    score: r.avg_score,
  }));
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
  const { data: cycle, error: cycleErr } = await sb
    .from("cycles")
    .insert({ scope, status: "queued" })
    .select()
    .single();
  if (cycleErr) throw new Error(`cycle insert: ${cycleErr.message}`);

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

  // Insert in batches de 1000 pour ne pas exploser la query
  for (let i = 0; i < pairs.length; i += 1000) {
    const slice = pairs.slice(i, i + 1000);
    const { error: jobsErr } = await sb.from("run_jobs").insert(slice);
    if (jobsErr) throw new Error(`run_jobs insert: ${jobsErr.message}`);
  }
  return { cycleId: cycle.id, jobs: pairs.length };
}

function runBench({ scope, mode, judgeCount, concurrency, dryRun }) {
  if (dryRun) {
    console.log(`  [dry-run] would spawn: node scripts/bench/index.mjs --scope=${scope} --concurrency=${concurrency} (BENCH_MODE=${mode} BENCH_JUDGE_COUNT=${judgeCount})`);
    return { code: 0 };
  }
  const res = spawnSync(
    "node",
    ["scripts/bench/index.mjs", `--scope=${scope}`, `--concurrency=${concurrency}`],
    {
      env: {
        ...process.env,
        BENCH_MODE: mode,
        BENCH_JUDGE_COUNT: String(judgeCount),
      },
      stdio: "inherit",
    }
  );
  return { code: res.status };
}

async function tagBenchTier(sb, kind, subjectIds, tier, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] would tag ${subjectIds.length} ${kind}(s) with bench_tier=${tier}`);
    return;
  }
  if (subjectIds.length === 0) return;
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const { error } = await sb.from(table).update({ bench_tier: tier }).in("id", subjectIds);
  if (error) console.warn(`  warn: tag bench_tier failed: ${error.message}`);
}

async function refreshRankings(sb, dryRun) {
  if (dryRun) {
    console.log("  [dry-run] would call refresh_rankings()");
    return;
  }
  const { error } = await sb.rpc("refresh_rankings");
  if (error) console.warn(`  warn: refresh_rankings failed: ${error.message}`);
  else console.log("  rankings refreshed");
}

async function runOneScope(sb, scope, args) {
  const { kind, category } = parseScope(scope);
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  SCOPE : ${scope.padEnd(52)} ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Construit un sub-args pour ce scope (sinon les loops partagent l'objet)
  const localArgs = { ...args, scope };
  await runScopeTiers(sb, localArgs, kind, category);
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
      console.error(`[tiered] scope ${scope} failed : ${e.message}`);
      console.error(`[tiered] continuing with next scope...`);
    }
  }

  const elapsed = ((Date.now() - tStart) / 1000 / 60).toFixed(1);
  console.log("");
  console.log(`[tiered] ✓ ${scopes.length} scope(s) done in ${elapsed} min`);
  console.log(`[tiered] check /admin/cycles for status + OpenRouter dashboard for $$$`);
}

// Logic d'un seul scope (anciennement le main()), extrait pour réutilisation
async function runScopeTiers(sb, args, kind, category) {

  // ============================================================
  // TIER 0 — Screen (1 task × 1 judge sur tout le scope)
  // ============================================================
  if (args.skipTier !== 0) {
    console.log("");
    console.log("════ TIER 0 — SCREEN (or-screen, 1 judge, 1 task) ════");

    const allSubjects = await loadSubjects(sb, kind, category);
    const sampleSize = Math.ceil(allSubjects.length * args.tier0Pct / 100);
    const tier0Subjects = allSubjects.slice(0, sampleSize);
    const tier0Tasks = await loadTasks(sb, category, args.tier0Tasks);
    console.log(`  ${tier0Subjects.length} subjects × ${tier0Tasks.length} task(s) = ${tier0Subjects.length * tier0Tasks.length} jobs`);

    if (!args.dryRun) {
      const { cycleId, jobs } = await enqueue(sb, {
        scope: `${args.scope}.tier0`,
        kind,
        subjects: tier0Subjects,
        tasks: tier0Tasks,
      });
      console.log(`  enqueued cycle #${cycleId} with ${jobs} jobs`);
      const r = runBench({
        scope: `${args.scope}.tier0`,
        mode: "or-screen",
        judgeCount: 1,
        concurrency: args.concurrency,
        dryRun: false,
      });
      if (r.code !== 0) {
        console.error(`  bench failed (exit ${r.code}), aborting`);
        process.exit(1);
      }
      await tagBenchTier(sb, kind, tier0Subjects.map((s) => s.id), 0, false);
      await refreshRankings(sb, false);
    } else {
      runBench({ scope: `${args.scope}.tier0`, mode: "or-screen", judgeCount: 1, concurrency: args.concurrency, dryRun: true });
    }
  }

  // ============================================================
  // TIER 1 — Validate (top N% × 3 tasks × 2 judges)
  // ============================================================
  if (args.skipTier !== 1) {
    console.log("");
    console.log("════ TIER 1 — VALIDATE (or-v1 with 2 judges, 3 tasks) ════");

    const tier1Limit = Math.ceil((await loadSubjects(sb, kind, category)).length * args.tier1Pct / 100);
    const tier1Subjects = await loadTopByRanking(sb, kind, category, tier1Limit);
    const tier1Tasks = await loadTasks(sb, category, args.tier1Tasks);
    console.log(`  top ${args.tier1Pct}% (${tier1Subjects.length} subjects) × ${tier1Tasks.length} task(s) = ${tier1Subjects.length * tier1Tasks.length} jobs`);

    if (tier1Subjects.length === 0) {
      console.log("  no tier 0 scores yet, skipping tier 1");
    } else if (!args.dryRun) {
      const { cycleId, jobs } = await enqueue(sb, {
        scope: `${args.scope}.tier1`,
        kind,
        subjects: tier1Subjects,
        tasks: tier1Tasks,
      });
      console.log(`  enqueued cycle #${cycleId} with ${jobs} jobs`);
      const r = runBench({
        scope: `${args.scope}.tier1`,
        mode: "or-v1",
        judgeCount: 2,
        concurrency: args.concurrency,
        dryRun: false,
      });
      if (r.code !== 0) {
        console.error(`  bench failed (exit ${r.code}), aborting`);
        process.exit(1);
      }
      await tagBenchTier(sb, kind, tier1Subjects.map((s) => s.id), 1, false);
      await refreshRankings(sb, false);
    } else {
      runBench({ scope: `${args.scope}.tier1`, mode: "or-v1", judgeCount: 2, concurrency: args.concurrency, dryRun: true });
    }
  }

  // ============================================================
  // TIER 2 — Championship (top M% × 5 tasks × 3 judges)
  // ============================================================
  if (args.skipTier !== 2) {
    console.log("");
    console.log("════ TIER 2 — CHAMPIONSHIP (or-v1, 3 judges, 5 tasks) ════");

    const tier2Limit = Math.ceil((await loadSubjects(sb, kind, category)).length * args.tier2Pct / 100);
    const tier2Subjects = await loadTopByRanking(sb, kind, category, tier2Limit);
    const tier2Tasks = await loadTasks(sb, category, args.tier2Tasks);
    console.log(`  top ${args.tier2Pct}% (${tier2Subjects.length} subjects) × ${tier2Tasks.length} task(s) = ${tier2Subjects.length * tier2Tasks.length} jobs`);

    if (tier2Subjects.length === 0) {
      console.log("  no tier 1 scores yet, skipping tier 2");
    } else if (!args.dryRun) {
      const { cycleId, jobs } = await enqueue(sb, {
        scope: `${args.scope}.tier2`,
        kind,
        subjects: tier2Subjects,
        tasks: tier2Tasks,
      });
      console.log(`  enqueued cycle #${cycleId} with ${jobs} jobs`);
      const r = runBench({
        scope: `${args.scope}.tier2`,
        mode: "or-v1",
        judgeCount: 3,
        concurrency: args.concurrency,
        dryRun: false,
      });
      if (r.code !== 0) {
        console.error(`  bench failed (exit ${r.code}), aborting`);
        process.exit(1);
      }
      await tagBenchTier(sb, kind, tier2Subjects.map((s) => s.id), 2, false);
      await refreshRankings(sb, false);
    } else {
      runBench({ scope: `${args.scope}.tier2`, mode: "or-v1", judgeCount: 3, concurrency: args.concurrency, dryRun: true });
    }
  }

  console.log("");
  console.log(`[tiered] ${args.scope} done.`);
}

main().catch((e) => {
  console.error("[tiered] fatal:", e.stack || e);
  process.exit(1);
});
