#!/usr/bin/env node
import "../_env.mjs";
/**
 * Bench engine — orchestrator.
 *
 * One run of this script = one cycle for one scope. Designed to run from
 * a 24h cron (or on-demand for dev).
 *
 *   npm run bench -- --scope=skills.document
 *   npm run bench -- --scope=claude-md.nextjs --max-jobs=200 --concurrency=8
 *   npm run bench -- --scope=skills.document --dry-run
 *
 * Pipeline:
 *
 *   1. Create a cycle (cycles row, status=running).
 *   2. Draw a 30-task split for this category (idempotent — re-uses set if
 *      the cycle already has one).
 *   3. Enqueue (subject × task) pairs into run_jobs.
 *   4. Run worker pool: claim jobs, fetch subject content + task input,
 *      execute, persist run_output, mark job completed.
 *   5. Submit one judge batch per judge model for all new outputs.
 *   6. Poll batches until all complete; persist judge_scores.
 *   7. Refresh `rankings` materialized view.
 *   8. Mark cycle completed.
 *
 * Crash-resilient: each step is idempotent. Re-running picks up where it
 * left off via job/batch status fields.
 *
 * V0 stub: many steps are stubbed. The optimised structure is in place
 * (cache, batch judges, queue, dedup). The actual model calls go in once
 * `ANTHROPIC_API_KEY` and friends are configured.
 */

import { makeSupabase, createCycle, setCycleStatus, claimJobs, markJobRunning, markJobCompleted, markJobError } from "./queue.mjs";
import { runJob } from "./runner.mjs";
import { loadSubject, loadTask } from "./load.mjs";
import { pendingScoreRequests, runJudgesForOutput } from "./judge.mjs";
import { ALL_FREE, JUDGE_MODE } from "../../src/lib/judges.js";

function assertCostGuardrail() {
  if (ALL_FREE) return;
  const budget = Number(process.env.BENCH_BUDGET_USD || 0);
  if (budget > 0) return;
  console.error(
    `[bench] refuse to run mode=${JUDGE_MODE} (paid judges) without BENCH_BUDGET_USD set.\n` +
    `        Set BENCH_BUDGET_USD=5 to cap at $5, or use BENCH_MODE=dev for free judges.`
  );
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    scope: null,
    maxJobs: 0,
    // Free-tier providers cap at 15-30 RPM. Concurrency=2 keeps the burst
    // rate under the floor; bump only if you have a paid quota.
    concurrency: 2,
    dryRun: false,
    cycleId: null,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--scope=")) out.scope = arg.slice(8);
    else if (arg.startsWith("--max-jobs=")) out.maxJobs = Number(arg.slice(11)) || 0;
    else if (arg.startsWith("--concurrency=")) out.concurrency = Number(arg.slice(14)) || 4;
    else if (arg.startsWith("--cycle-id=")) out.cycleId = Number(arg.slice(11));
  }
  // --scope est optionnel : si pas fourni, on auto-pick le premier cycle
  // queued (FIFO). Utile pour les workflows GitHub Actions qui drain la
  // queue sans connaître la catégorie spécifique en avance.
  return out;
}

async function main() {
  assertCostGuardrail();
  const args = parseArgs(process.argv);
  console.log(`[bench] starting · mode=${JUDGE_MODE} · ${JSON.stringify(args)}`);

  const sb = makeSupabase();
  if (!sb) {
    console.log("[bench] Supabase env missing — V0 stub mode, no DB writes.");
    return;
  }

  // 1. Cycle — pick up existing queued/running cycle for this scope, or
  //    create a new one. Avoids the gotcha where running `bench:enqueue`
  //    creates cycle #N then `bench` creates cycle #N+1 with zero jobs.
  let cycle = null;
  if (args.cycleId) {
    const { data, error } = await sb
      .from("cycles")
      .select("*")
      .eq("id", args.cycleId)
      .maybeSingle();
    if (error || !data) throw new Error(`cycle ${args.cycleId} not found`);
    cycle = data;
    console.log(`[bench] using explicit cycle #${cycle.id} (${cycle.status})`);
  } else {
    // Find the oldest cycle (FIFO) that still has queued jobs.
    // - Si args.scope est défini : scope-filtered (current behavior)
    // - Sinon : tous scopes confondus → utile pour GitHub Actions runner
    //   qui draine la queue globale sans connaître la catégorie en avance.
    let q = sb
      .from("cycles")
      .select("*")
      .in("status", ["queued", "running"])
      .order("started_at", { ascending: true });
    if (args.scope) q = q.eq("scope", args.scope);
    const { data: existing } = await q;

    let chosen = null;
    for (const c of existing || []) {
      // A cycle is resumable if EITHER :
      //   - has queued run_jobs (agent phase incomplete), OR
      //   - has run_jobs with output_id but missing judge_scores (judge phase incomplete)
      const { count: queuedCount } = await sb
        .from("run_jobs")
        .select("id", { count: "exact", head: true })
        .eq("cycle_id", c.id)
        .eq("status", "queued");
      if ((queuedCount || 0) > 0) {
        chosen = c;
        break;
      }
      // Check judging phase : outputs without 3 scores
      const { data: outputs } = await sb
        .from("run_jobs")
        .select("output_id")
        .eq("cycle_id", c.id)
        .not("output_id", "is", null);
      const outputIds = [...new Set((outputs || []).map((r) => r.output_id))];
      if (outputIds.length === 0) continue;
      const { data: scoresByOutput } = await sb
        .from("judge_scores")
        .select("output_id")
        .in("output_id", outputIds);
      const judgesPer = new Map();
      for (const r of scoresByOutput || []) {
        judgesPer.set(r.output_id, (judgesPer.get(r.output_id) || 0) + 1);
      }
      const hasUnjudged = outputIds.some((oid) => (judgesPer.get(oid) || 0) < 3);
      if (hasUnjudged) {
        chosen = c;
        break;
      }
    }

    if (chosen) {
      cycle = chosen;
      args.scope = chosen.scope; // backfill pour les logs aval
      console.log(
        `[bench] resuming cycle #${cycle.id} (${cycle.status}) for ${cycle.scope}`
      );
    } else if (args.scope) {
      cycle = await createCycle(sb, { scope: args.scope });
      console.log(`[bench] cycle #${cycle.id} created for ${args.scope}`);
    } else {
      console.log(`[bench] no queued cycle found — nothing to do, exiting.`);
      return;
    }
  }

  try {
    await setCycleStatus(sb, cycle.id, "running");

    // 2. Draw task set + 3. Enqueue jobs (left to caller — depends on scope).
    //    See README for the SQL helpers `draw_task_set(scope)` and
    //    `enqueue_pairs_for_cycle(cycle_id)`.

    // 4. Worker pool — claim + run jobs in parallel.
    let processed = 0;
    while (true) {
      const claimed = await claimJobs(sb, { cycleId: cycle.id, limit: args.concurrency });
      if (!claimed.length) break;
      await Promise.all(
        claimed.map(async (job) => {
          try {
            await markJobRunning(sb, job.id);
            const [subject, task] = await Promise.all([
              loadSubject(sb, job),
              loadTask(sb, job.task_id),
            ]);
            if (!subject) throw new Error(`subject not found for job ${job.id}`);
            if (!task) throw new Error(`task ${job.task_id} not found`);
            const { outputId, cached } = await runJob(sb, job, {
              subjectKind: job.subject_kind,
              subjectContent: subject.content,
              taskInput: task.input_data,
              taskTitle: task.title,
              taskDescription: task.description,
            });
            await markJobCompleted(sb, job.id, outputId, cached ? "cached" : "completed");
            processed += 1;
          } catch (err) {
            await markJobError(sb, job.id, err.message);
            console.warn(`[bench] job ${job.id} errored: ${err.message}`);
          }
        })
      );
      if (args.maxJobs && processed >= args.maxJobs) break;
    }
    console.log(`[bench] processed ${processed} jobs`);

    // 5. Judges — synchronous calls per output (dev/prod free providers).
    //    Group pending pairs by output_id so we judge each output once with
    //    every judge in a single pass.
    const pending = await pendingScoreRequests(sb, cycle.id);
    const byOutput = new Map();
    for (const p of pending) {
      if (!byOutput.has(p.output_id)) byOutput.set(p.output_id, true);
    }
    if (byOutput.size) {
      console.log(`[bench] judging ${byOutput.size} unique outputs…`);
    }
    let totalJudged = 0;
    let totalCostUsd = 0;
    let totalCacheRead = 0;
    let totalCacheCreate = 0;
    let totalInputTokens = 0;
    let sinceLastRefresh = 0;
    const budgetUsd = Number(process.env.BENCH_BUDGET_USD || 0);
    // Refresh rankings every N judged outputs so items appear on the leaderboard
    // progressively instead of waiting 14h for the full cycle. Default 25 outputs
    // ≈ refresh every ~2-3 min on a normal run. Set to 0 to disable.
    const refreshEvery = Number(process.env.BENCH_REFRESH_EVERY || 25);
    let budgetExhausted = false;
    for (const outputId of byOutput.keys()) {
      // Mid-run guardrail : halt before issuing more judge calls if cumulative
      // cost crosses the configured budget. Persists what's been done so far,
      // marks the cycle 'partial' so /admin/cycles surfaces the state.
      if (budgetUsd > 0 && totalCostUsd >= budgetUsd) {
        console.warn(
          `[bench] BUDGET EXHAUSTED — spent $${totalCostUsd.toFixed(4)} ≥ cap $${budgetUsd}. Stopping mid-run.`
        );
        budgetExhausted = true;
        break;
      }
      const ctx = await loadJudgeContext(sb, outputId);
      if (!ctx) continue;
      const r = await runJudgesForOutput(sb, outputId, ctx);
      totalJudged += r.judged;
      totalCostUsd += Number(r.costUsd || 0);
      totalCacheRead += Number(r.cacheRead || 0);
      totalCacheCreate += Number(r.cacheCreate || 0);
      totalInputTokens += Number(r.inputTokens || 0);
      sinceLastRefresh += r.judged;

      // Progressive publishing — refresh matview as soon as a batch is judged.
      // Items become visible on /leaderboard within minutes, not hours.
      if (refreshEvery > 0 && sinceLastRefresh >= refreshEvery) {
        try {
          const { error: refErr } = await sb.rpc("refresh_rankings");
          if (!refErr) {
            console.log(`[bench] live refresh : +${sinceLastRefresh} scores published`);
            sinceLastRefresh = 0;
          }
        } catch (e) {
          // Non-fatal — keep judging, retry at the next interval.
          console.warn(`[bench] live refresh skipped : ${e.message}`);
        }
      }
    }
    console.log(
      `[bench] persisted ${totalJudged} judge scores · spent $${totalCostUsd.toFixed(4)}${budgetUsd > 0 ? ` of $${budgetUsd}` : ""}`
    );
    if (totalInputTokens > 0) {
      const hitRate = ((totalCacheRead / totalInputTokens) * 100).toFixed(1);
      // Estimate what we WOULD have paid without cache.
      // Cache discount factors per provider (approximate) :
      //   - Anthropic Haiku 4.5 : cache reads cost 0.1× full price → 90% saving on cached tokens
      //   - OpenAI GPT-5 mini   : implicit cache → 50% saving on cached tokens
      //   - DeepSeek V3         : ~50% saving on cached prefix
      // We don't track per-provider here, use weighted avg 70% saving on cached tokens.
      const CACHE_AVG_DISCOUNT = 0.7;
      // What we actually paid:    cost = (full_tokens × $rate) + (cached_tokens × $rate × (1 - discount))
      // What we'd have paid:       cost_no_cache = (full_tokens + cached_tokens) × $rate
      // Implied savings ratio = cached × discount / total
      const savedRatio = (totalCacheRead * CACHE_AVG_DISCOUNT) / totalInputTokens;
      const costWithoutCache = totalCostUsd / (1 - savedRatio);
      const saved = costWithoutCache - totalCostUsd;
      console.log("");
      console.log("══════════════════════ COST RECAP ══════════════════════");
      console.log(`  Input tokens total       : ${totalInputTokens.toLocaleString()}`);
      console.log(`  Of which cached (read)   : ${totalCacheRead.toLocaleString()} (${hitRate}%)`);
      console.log(`  Cache writes (creation)  : ${totalCacheCreate.toLocaleString()}`);
      console.log(`  Actual cost paid         : $${totalCostUsd.toFixed(4)}`);
      console.log(`  Estimated without cache  : $${costWithoutCache.toFixed(4)}`);
      console.log(`  Savings from cache       : $${saved.toFixed(4)}  (${(savedRatio * 100).toFixed(1)}%)`);
      // totalJudged = total judge_scores persisted = outputs × judges_per_output
      // outputs = totalJudged / 3 (3 judges per output)
      // skills = outputs / tasks_per_skill (but we don't know tasks_per_skill here, infer from cycle if possible)
      const outputs = Math.max(1, totalJudged / 3);
      console.log(`  Cost per output (task)   : $${(totalCostUsd / outputs).toFixed(5)}`);
      console.log(`  Cost per judge score     : $${(totalCostUsd / Math.max(1, totalJudged)).toFixed(5)}`);
      console.log("════════════════════════════════════════════════════════");
    }

    // 7. Clear bench_pending flag on all subjects from this cycle that now
    // have at least one judge_score. Best-effort, ignore errors.
    try {
      const { data: cycleSubjects } = await sb
        .from("run_jobs")
        .select("skill_id, claude_md_id, subject_kind")
        .eq("cycle_id", cycle.id)
        .not("output_id", "is", null);
      const skillIds = [
        ...new Set((cycleSubjects || []).filter((r) => r.subject_kind === "skill" && r.skill_id).map((r) => r.skill_id)),
      ];
      const claudeMdIds = [
        ...new Set((cycleSubjects || []).filter((r) => r.subject_kind === "claude_md" && r.claude_md_id).map((r) => r.claude_md_id)),
      ];
      if (skillIds.length) {
        await sb.from("skills").update({ bench_pending: false }).in("id", skillIds);
      }
      if (claudeMdIds.length) {
        await sb.from("claude_md_files").update({ bench_pending: false }).in("id", claudeMdIds);
      }
      if (skillIds.length || claudeMdIds.length) {
        console.log(`[bench] cleared bench_pending : ${skillIds.length} skills + ${claudeMdIds.length} claude_md`);
      }
    } catch (e) {
      console.warn(`[bench] bench_pending sweep failed (non-fatal): ${e.message}`);
    }

    // 8. Refresh rankings. The materialized view uses REFRESH CONCURRENTLY
    // which Postgres rejects if another refresh is already in progress
    // ("cannot refresh materialized view concurrently"). With 2 bench-runs
    // overlapping (manual + scheduled, or 2 manual triggers), this happens
    // routinely. The next run's refresh always succeeds, so we downgrade
    // this specific error to a calm log instead of warn (it's not actionable
    // and clutters the workflow output).
    try {
      const { error: refreshErr } = await sb.rpc("refresh_rankings");
      if (refreshErr) {
        const isConcurrent = /cannot refresh materialized view (?:"[^"]+" )?concurrently/i.test(refreshErr.message);
        if (isConcurrent) {
          console.log(`[bench] refresh_rankings skipped: another refresh in progress (next run will pick up)`);
        } else {
          console.warn(`[bench] refresh_rankings rpc failed: ${refreshErr.message}`);
        }
      }
    } catch (e) {
      console.warn(`[bench] refresh_rankings threw: ${e.message}`);
    }

    if (budgetExhausted) {
      await setCycleStatus(sb, cycle.id, "partial", {
        actual_cost_usd: Math.round(totalCostUsd * 10000) / 10000,
        metadata: { reason: "budget_exhausted", spent_usd: totalCostUsd, budget_usd: budgetUsd },
      });
      console.log(`[bench] cycle #${cycle.id} marked PARTIAL — re-run with higher BENCH_BUDGET_USD to continue`);
    } else {
      await setCycleStatus(sb, cycle.id, "completed", {
        actual_cost_usd: Math.round(totalCostUsd * 10000) / 10000,
      });
      console.log(`[bench] cycle #${cycle.id} complete · cost $${totalCostUsd.toFixed(4)}`);
    }
  } catch (err) {
    await setCycleStatus(sb, cycle.id, "failed", { metadata: { error: err.message } });
    throw err;
  }
}

/**
 * Pull everything a judge needs to score one output: the run_jobs that point
 * to it (we just take one — they all share the same task), then load the
 * subject + task content so the rubric prompt has the full context.
 */
async function loadJudgeContext(sb, outputId) {
  const { data: jobs, error } = await sb
    .from("run_jobs")
    .select("subject_kind, skill_id, claude_md_id, task_id, output_id")
    .eq("output_id", outputId)
    .limit(1);
  if (error || !jobs || !jobs.length) return null;
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

main().catch((err) => {
  console.error(`[bench] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
