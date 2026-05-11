/**
 * Google AI Studio provider — Gemini 2.5 Flash + Pro.
 *
 * Free tier (Flash): 15 RPM, 1500 RPD, 1M tokens/day.
 * Get a key: https://aistudio.google.com/apikey  (env: GOOGLE_AI_STUDIO_KEY)
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGoogle({ modelId, prompt, temperature = 0.3, maxTokens = 600, signal }) {
  // Accept either env var name — common variants we've seen in user setups
  const key =
    process.env.GOOGLE_AI_STUDIO_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("[google] GOOGLE_AI_STUDIO_KEY (or GOOGLE_API_KEY / GEMINI_API_KEY) missing in env");
  }

  const res = await fetch(
    `${ENDPOINT}/${modelId}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
      signal,
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[google] ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data?.usageMetadata || {};
  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}
