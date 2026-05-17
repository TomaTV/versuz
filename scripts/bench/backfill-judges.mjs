#!/usr/bin/env node
import "../_env.mjs";
/**
 * Backfill missing judge scores on outputs benched in previous cycles.
 *
 * Why: the bench pipeline's `pendingScoreRequests` (judge.mjs) only checks
 * outputs from the CURRENT cycle. If a judge hits 5 consecutive parse-failures
 * (circuit breaker) or a 429, it's blacklisted for the rest of that run —
 * outputs that come AFTER the trip get fewer judges than the active ensemble.
 * Those orphans never get re-judged on subsequent cycles, leaving the UI
 * showing 1 or 2 judges instead of 3.
 *
 *   node scripts/bench/backfill-judges.mjs             # dry-run, lists counts
 *   node scripts/bench/backfill-judges.mjs --apply     # actually re-judge
 *   node scripts/bench/backfill-judges.mjs --apply --limit=50
 *   node scripts/bench/backfill-judges.mjs --apply --subject-id=<uuid>
 *
 * Reuses `runJudgesForOutput` from judge.mjs which already skips per-judge
 * pairs that exist. Cost is bounded by BENCH_BUDGET_USD like the main bench.
 */
import { createClient } from "@supabase/supabase-js";
import { JUDGES, JUDGE_MODE } from "../../src/lib/judges.js";
import { runJudgesForOutput } from "./judge.mjs";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const LIMIT = (() => {
  for (const a of args) {
    if (a.startsWith("--limit=")) return Number(a.slice(8)) || 0;
  }
  return 0;
})();
const SUBJECT_ID = (() => {
  for (const a of args) {
    if (a.startsWith("--subject-id=")) return a.slice(13);
  }
  return null;
})();

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[backfill] Supabase env missing (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadJudgeContext(sb, outputId) {
  const { data: jobs } = await sb
    .from("run_jobs")
    .select("subject_kind, skill_id, claude_md_id, task_id, output_id")
    .eq("output_id", outputId)
    .limit(1);
  if (!jobs?.length) return null;
  const job = jobs[0];

  const { data: out } = await sb
    .from("run_outputs")
    .select("output")
    .eq("id", outputId)
    .maybeSingle();

  let subjectName = null;
  if (job.subject_kind === "skill" && job.skill_id) {
    const { data } = await sb.from("skills").select("name, slug").eq("id", job.skill_id).maybeSingle();
    subjectName = data?.name || data?.slug || null;
  } else if (job.subject_kind === "claude_md" && job.claude_md_id) {
    const { data } = await sb
      .from("claude_md_files")
      .select("slug, metadata")
      .eq("id", job.claude_md_id)
      .maybeSingle();
    if (data) {
      const m = data.metadata || {};
      subjectName = m.author && m.repo ? `${m.author}/${m.repo}` : data.slug;
    }
  }

  const { data: task } = await sb
    .from("tasks")
    .select("title, description, rubric")
    .eq("id", job.task_id)
    .maybeSingle();

  return {
    subjectKind: job.subject_kind,
    subjectName,
    taskTitle: task?.title || null,
    taskDescription: task?.description || null,
    expectedSignal: task?.rubric?.signal || null,
    outputText: out?.output?.text || "",
  };
}

async function findIncompleteOutputs(sb) {
  // Get all judge_scores grouped by output_id, filter those with < N judges.
  // We paginate by output_id range because Supabase REST caps each request
  // at ~1000 rows.
  const targetModelIds = JUDGES.map((j) => j.modelId);
  const N = targetModelIds.length;

  let from = 0;
  const PAGE = 1000;
  const byOutput = new Map();
  while (true) {
    const { data, error } = await sb
      .from("judge_scores")
      .select("output_id, judge_model")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      const set = byOutput.get(r.output_id) || new Set();
      set.add(r.judge_model);
      byOutput.set(r.output_id, set);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const incomplete = [];
  for (const [outputId, judgeSet] of byOutput) {
    const missing = targetModelIds.filter((m) => !judgeSet.has(m));
    if (missing.length > 0) {
      incomplete.push({ outputId, have: [...judgeSet], missing });
    }
  }
  return incomplete;
}

async function filterBySubject(sb, incomplete, subjectId) {
  // Subject filter : keep only outputs whose run_jobs have skill_id or
  // claude_md_id matching `subjectId`. Useful for re-benching one item.
  const outputIds = incomplete.map((r) => r.outputId);
  const { data: jobs } = await sb
    .from("run_jobs")
    .select("output_id, skill_id, claude_md_id")
    .in("output_id", outputIds);
  const matched = new Set(
    (jobs || [])
      .filter((j) => j.skill_id === subjectId || j.claude_md_id === subjectId)
      .map((j) => j.output_id)
  );
  return incomplete.filter((r) => matched.has(r.outputId));
}

async function main() {
  console.log(`[backfill] mode=${JUDGE_MODE} · target judges=[${JUDGES.map((j) => j.shortLabel).join(", ")}]`);
  if (!APPLY) {
    console.log("[backfill] DRY-RUN — pass --apply to actually re-judge");
  }

  const sb = makeSupabase();
  let incomplete = await findIncompleteOutputs(sb);

  if (SUBJECT_ID) {
    incomplete = await filterBySubject(sb, incomplete, SUBJECT_ID);
    console.log(`[backfill] filtered to subject_id=${SUBJECT_ID} → ${incomplete.length} outputs`);
  }

  // Bucketize for the audit log.
  const buckets = new Map();
  for (const r of incomplete) {
    const key = r.missing.join(",");
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  console.log(`[backfill] ${incomplete.length} outputs incomplete :`);
  for (const [missing, n] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - missing [${missing}] → ${n} outputs`);
  }

  if (!APPLY || !incomplete.length) {
    console.log(`[backfill] ${APPLY ? "nothing to do" : "exiting (dry-run)"}`);
    return;
  }

  const queue = LIMIT > 0 ? incomplete.slice(0, LIMIT) : incomplete;
  console.log(`[backfill] re-judging ${queue.length} outputs…`);

  const budgetUsd = Number(process.env.BENCH_BUDGET_USD || 0);
  let totalJudged = 0;
  let totalCostUsd = 0;
  let processed = 0;
  for (const { outputId } of queue) {
    if (budgetUsd > 0 && totalCostUsd >= budgetUsd) {
      console.warn(`[backfill] BUDGET EXHAUSTED at $${totalCostUsd.toFixed(4)} ≥ cap $${budgetUsd} — stopping`);
      break;
    }
    const ctx = await loadJudgeContext(sb, outputId);
    if (!ctx) {
      console.warn(`[backfill] no context for output ${outputId} — skipping`);
      continue;
    }
    const r = await runJudgesForOutput(sb, outputId, ctx);
    totalJudged += r.judged;
    totalCostUsd += Number(r.costUsd || 0);
    processed += 1;
    if (processed % 10 === 0) {
      console.log(`[backfill] ${processed}/${queue.length} done · +${totalJudged} scores · $${totalCostUsd.toFixed(4)}`);
    }
  }

  console.log("");
  console.log("══════════════════════ BACKFILL RECAP ══════════════════════");
  console.log(`  Outputs processed       : ${processed}/${queue.length}`);
  console.log(`  Judge scores persisted  : ${totalJudged}`);
  console.log(`  Cost                    : $${totalCostUsd.toFixed(4)}${budgetUsd > 0 ? ` of $${budgetUsd}` : ""}`);
  console.log("════════════════════════════════════════════════════════════");

  // Refresh rankings so the new scores show up on the leaderboard immediately.
  try {
    const { error } = await sb.rpc("refresh_rankings");
    if (error) console.warn(`[backfill] refresh_rankings: ${error.message}`);
    else console.log(`[backfill] rankings refreshed`);
  } catch (e) {
    console.warn(`[backfill] refresh_rankings threw: ${e.message}`);
  }
}

main().catch((err) => {
  console.error(`[backfill] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
