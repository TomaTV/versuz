/**
 * Runner — execute a subject (skill or CLAUDE.md) on a task.
 *
 *   • skill      → SKILL.md is folded into the agent prompt as an operating
 *                  manual; the task input becomes the user request.
 *   • claude_md  → CLAUDE.md is folded as project context.
 *
 * Optimisations:
 *   • Output dedup by inputHash. If we already have an output row for the
 *     same hash, we don't re-run — we link the existing output to the job.
 *   • Cost tracked per call into run_outputs.cost_usd.
 *
 * The actual model call lives in `agent.mjs`. Default agent is Gemini 2.5
 * Flash (free tier). Override via BENCH_AGENT_PROVIDER / BENCH_AGENT_MODEL.
 */

import { inputHash } from "./cache.mjs";
import { runAgent, DEFAULT_MODEL } from "./agent.mjs";

/**
 * @returns {Promise<{ outputId: string, cached: boolean }>}
 */
export async function runJob(
  sb,
  job,
  {
    subjectContent,
    taskInput,
    taskTitle,
    taskDescription,
    subjectKind,
    model,
  } = {}
) {
  const hash = inputHash({ subjectContent: subjectContent || "", taskInput: taskInput ?? "" });

  // 1. Try cache.
  const existing = await sb
    .from("run_outputs")
    .select("id")
    .eq("output_hash", hash)
    .maybeSingle();
  if (existing.data) {
    return { outputId: existing.data.id, cached: true };
  }

  // 2. Run the agent.
  const started = Date.now();
  const kind = subjectKind || job.subject_kind;
  const output = await runAgent({
    subjectKind: kind,
    subjectContent: subjectContent || "",
    taskInput,
    taskTitle,
    taskDescription,
    model,
  });
  const duration = Date.now() - started;

  // 3. Persist the output. Use upsert with onConflict on output_hash to
  // tolerate concurrent worker races (multiple jobs with same input hash
  // checking the cache simultaneously, both miss, both insert → unique
  // constraint violation on the slower one). Upsert returns the winning row.
  const { data, error } = await sb
    .from("run_outputs")
    .upsert(
      {
        output_hash: hash,
        output: { text: output.text, provider: output.provider },
        cost_usd: output.cost_usd,
        duration_ms: duration,
        model_used: output.model || model || DEFAULT_MODEL,
      },
      { onConflict: "output_hash" }
    )
    .select("id")
    .single();
  if (error) throw error;

  return { outputId: data.id, cached: false, text: output.text };
}
