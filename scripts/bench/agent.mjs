/**
 * Agent execution for the bench engine.
 *
 * Replaces the old `executeAgentStub`. Default agent: Gemini 2.5 Flash via
 * Google AI Studio (free tier — 15 RPM, 1500 RPD, 1M tokens/day).
 *
 * Override via env:
 *   BENCH_AGENT_PROVIDER=anthropic  BENCH_AGENT_MODEL=claude-opus-4-7-20251001
 *   BENCH_AGENT_PROVIDER=groq       BENCH_AGENT_MODEL=llama-3.3-70b-versatile
 *
 * The agent is given the SKILL.md / CLAUDE.md as a system-style preamble and
 * the task input as the user prompt. Gemini's single-prompt API doesn't have
 * native role separation, so we fold them into a labeled string.
 */

import { callWithRotation } from "./rate-limit.mjs";

const DEFAULT_PROVIDER = process.env.BENCH_AGENT_PROVIDER || "google";
const DEFAULT_MODEL = process.env.BENCH_AGENT_MODEL || "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = Number(process.env.BENCH_AGENT_TEMPERATURE || 0.4);
const DEFAULT_MAX_TOKENS = Number(process.env.BENCH_AGENT_MAX_TOKENS || 1500);

// Fallback chain: if Gemini Flash hits its daily quota, try Groq Llama, then
// Mistral. All three are free-tier with separate quotas, so a single account
// running on fumes can still complete a cycle by rotating providers.
function buildProviderChain({ provider, model }) {
  const all = [
    { provider, modelId: model },
    { provider: "groq", modelId: "llama-3.3-70b-versatile" },
    { provider: "mistral", modelId: "mistral-large-latest" },
  ];
  // Dedup if the requested provider is already one of the fallbacks
  const seen = new Set();
  return all.filter((p) => {
    const k = `${p.provider}::${p.modelId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function stringifyTaskInput(taskInput) {
  if (taskInput == null) return "";
  if (typeof taskInput === "string") return taskInput;
  try {
    return JSON.stringify(taskInput, null, 2);
  } catch {
    return String(taskInput);
  }
}

function buildPrompt({ subjectKind, subjectContent, taskInput, taskTitle, taskDescription }) {
  const taskInputText = stringifyTaskInput(taskInput);
  const taskBlock = [
    taskTitle ? `Task title: ${taskTitle}` : null,
    taskDescription ? `Task description: ${taskDescription}` : null,
    taskInputText ? `Task input:\n${taskInputText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (subjectKind === "claude_md") {
    return [
      "You are an AI agent operating inside a project that has the following CLAUDE.md context. Apply this context to the task — do not summarise or restate it.",
      "===== CLAUDE.md =====",
      subjectContent || "(empty)",
      "===== END CLAUDE.md =====",
      taskBlock,
      "Respond with the final deliverable only — no preamble, no meta-commentary.",
    ].join("\n\n");
  }

  // skill default
  return [
    "You are an AI agent following the rules and tools described in the SKILL.md below. Use it as your operating manual for this task.",
    "===== SKILL.md =====",
    subjectContent || "(empty)",
    "===== END SKILL.md =====",
    taskBlock,
    "Respond with the final deliverable only — no preamble, no meta-commentary.",
  ].join("\n\n");
}

/**
 * Run an agent on a (subject, task) pair.
 *
 * @param {object} args
 * @param {"skill"|"claude_md"} args.subjectKind
 * @param {string} args.subjectContent — raw SKILL.md or CLAUDE.md text
 * @param {string|object} args.taskInput
 * @param {string} [args.taskTitle]
 * @param {string} [args.taskDescription]
 * @param {string} [args.provider]
 * @param {string} [args.model]
 * @returns {Promise<{ text: string, model: string, cost_usd: number, provider: string }>}
 */
export async function runAgent({
  subjectKind,
  subjectContent,
  taskInput,
  taskTitle,
  taskDescription,
  provider = DEFAULT_PROVIDER,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
}) {
  const prompt = buildPrompt({
    subjectKind,
    subjectContent,
    taskInput,
    taskTitle,
    taskDescription,
  });

  const chain = buildProviderChain({ provider, model });
  let lastErr;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    try {
      const result = await callWithRotation([p], { prompt, temperature, maxTokens, label: "agent" });
      return {
        text: String(result?.text || "").trim(),
        model: p.modelId,
        provider: p.provider,
        cost_usd: Number(result?.costUsd || 0),
      };
    } catch (err) {
      lastErr = err;
      const isQuota = /\b429\b/.test(err?.message || "");
      if (!isQuota || i === chain.length - 1) throw err;
      console.warn(
        `[agent] ${p.provider}/${p.modelId} quota exhausted — falling over to ${chain[i + 1].provider}/${chain[i + 1].modelId}`
      );
    }
  }
  throw lastErr;
}

export { DEFAULT_PROVIDER, DEFAULT_MODEL };
