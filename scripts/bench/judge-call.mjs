/**
 * judgeOutput — score a single output with a single judge.
 *
 * Returns { score: 0..100, rationale, inputTokens, outputTokens, raw }.
 *
 * The judge is asked for strict JSON: `{ score: 0..100, rationale: "..." }`.
 * If it doesn't comply, we extract the first integer in [0, 100] as a fallback.
 */

import { callProvider } from "./providers/index.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Call a provider with retry on rate-limit (429) or transient 5xx.
 * Exponential backoff: 4s, 8s, 16s.
 */
async function callWithRetry(opts, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callProvider(opts);
    } catch (err) {
      const msg = err?.message || "";
      const isRetryable = /\b(429|500|502|503|504)\b/.test(msg);
      lastErr = err;
      if (!isRetryable || i === attempts - 1) throw err;
      await sleep(4000 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

const PROMPT = ({ task, output, rubric }) => `You are an impartial judge for the Versuz benchmark.

# TASK
${task.title}

${task.description}

${task.input_text ? `## Task input\n${task.input_text}` : ""}

${task.expected_output ? `## Expected output\n${typeof task.expected_output === "string" ? task.expected_output : JSON.stringify(task.expected_output, null, 2)}` : ""}

# RUBRIC
${rubric || "Score on correctness (0-50pts), structural fidelity (0-30pts), and format hygiene (0-20pts)."}

# CANDIDATE OUTPUT
${output}

# YOUR JOB
Return STRICT JSON, no preamble, no codeblock fences:
{
  "score": <integer 0-100>,
  "rationale": "<2-3 sentences explaining the score>"
}
`;

export async function judgeOutput({ judge, task, output, rubric }) {
  const prompt = PROMPT({ task, output, rubric: rubric || task.rubric });

  const { text, inputTokens, outputTokens } = await callWithRetry({
    provider: judge.provider,
    modelId: judge.modelId,
    prompt,
    temperature: 0.2,
    // Rationale fits in 2-3 sentences. 350 tokens is plenty.
    maxTokens: 350,
  });

  const parsed = parseJudgeOutput(text);
  return {
    score: parsed.score,
    rationale: parsed.rationale,
    raw: text,
    inputTokens,
    outputTokens,
  };
}

function parseJudgeOutput(raw) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const j = JSON.parse(trimmed);
    if (typeof j.score === "number" && j.score >= 0 && j.score <= 100) {
      return {
        score: Math.round(j.score),
        rationale: String(j.rationale || "").slice(0, 2000),
      };
    }
  } catch {
    /* fall through */
  }
  // Fallback: scrape first integer in [0, 100] from the raw text
  const m = raw.match(/\b(\d{1,3})\b/);
  const n = m ? Number(m[1]) : NaN;
  return {
    score: !Number.isNaN(n) && n >= 0 && n <= 100 ? n : 0,
    rationale: `[parser fallback] ${raw.slice(0, 240)}`,
  };
}
