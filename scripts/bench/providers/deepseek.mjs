/**
 * DeepSeek provider — OpenAI-compatible API.
 *
 * V1 paid path. V4 Flash = ~$0.14/M input + ~$1.10/M output = ~$0.00038 per
 * judge call (1700 tok in + 150 tok out). 9000 calls = ~$3.40/cycle.
 *
 * Get a key: https://platform.deepseek.com/api_keys  (env: DEEPSEEK_API_KEY)
 *
 * Models:
 *   - deepseek-v4-flash  → V4 family (fast, cheap, general-purpose)
 *   - deepseek-reasoner  → R1 family (slower but stronger reasoning)
 */

const ENDPOINT = "https://api.deepseek.com/chat/completions";

export async function callDeepSeek({ modelId, prompt, temperature = 0.3, maxTokens = 600 }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("[deepseek] DEEPSEEK_API_KEY missing in env");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[deepseek] ${res.status} ${body.slice(0, 200)}`);
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
