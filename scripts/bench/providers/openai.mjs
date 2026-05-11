/**
 * OpenAI provider — for prod-mode judges (GPT-5).
 *
 * STUB. Wire in `openai` when prod budget unlocks. Use Batch API for -50%.
 */

export async function callOpenAI({ modelId, prompt, temperature, maxTokens }) {
  throw new Error(
    "[openai] not wired yet. BENCH_MODE=prod requires `openai` package + OPENAI_API_KEY."
  );
}
