/**
 * Groq provider — OpenAI-compatible endpoint.
 *
 * Free tier: 30 RPM, 1000 RPD on Llama 3.3 70B Versatile, similar on Qwen.
 * Get a key: https://console.groq.com/keys  (env: GROQ_API_KEY)
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq({ modelId, prompt, temperature = 0.3, maxTokens = 600, signal }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("[groq] GROQ_API_KEY missing in env");

  // Reasoning models (GPT-OSS, deepseek-r1-distill) emit thinking tokens
  // BEFORE the JSON output. Groq's strict json_object mode rejects this →
  // server returns "Failed to validate JSON" with empty failed_generation.
  // Skip the strict mode for these — our parser handles preamble extraction.
  const isReasoningModel = /gpt-oss|r1-distill|qwen3.*think/i.test(modelId);

  const body = {
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  };
  if (!isReasoningModel) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[groq] ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const usage = data?.usage || {};
  return {
    text,
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
  };
}
