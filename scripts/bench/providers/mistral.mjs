/**
 * Mistral provider — La Plateforme.
 *
 * Free tier "Experiment plan" — generous rate limits on Mistral Large 2,
 * Mistral Small, Codestral. OpenAI-compatible endpoint.
 * Get a key: https://console.mistral.ai/api-keys  (env: MISTRAL_API_KEY)
 */

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

export async function callMistral({ modelId, prompt, temperature = 0.3, maxTokens = 600 }) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("[mistral] MISTRAL_API_KEY missing in env");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
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
    throw new Error(`[mistral] ${res.status} ${body.slice(0, 200)}`);
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
