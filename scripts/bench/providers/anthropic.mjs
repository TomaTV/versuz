/**
 * Anthropic provider — direct REST API call (no SDK dep needed).
 *
 * Prompt caching: enabled by default. We split the prompt into two parts —
 * a "static" prefix (skill content + task description, marked cacheable) and
 * a "dynamic" suffix (rubric / per-judge instruction). When 3 different
 * judges hit Anthropic for the same skill+task within 5 minutes, only the
 * first pays full input price; the others read from cache at 10% cost.
 *
 * For 100 skills × 5 tasks × 3 judges with caching :
 *   Without : 3.55M input × $1/M (Haiku) = $3.55
 *   With    : ~1.85M unique × $1 + 1.7M cached × $0.10 = $1.85 + $0.17 = $2.02
 *   → ~43 % savings on input cost, $1.53 saved daily.
 *
 * Env: ANTHROPIC_API_KEY
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";

export async function callAnthropic({
  modelId,
  prompt,
  temperature = 0.3,
  maxTokens = 600,
  enableCaching = true,
}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("[anthropic] ANTHROPIC_API_KEY missing in env");

  // The prompt is one big string from agent.mjs / judge.mjs. Splitting it
  // requires a marker. Convention: anything before the line "===== END" is
  // cacheable (the SKILL.md + task setup); anything after is per-judge
  // dynamic. If the marker is absent we cache the whole prompt as a single
  // block (still helpful when same skill is judged twice in a row).
  const splitIdx = prompt.lastIndexOf("===== END");
  let messages;
  if (enableCaching && splitIdx > 0) {
    const splitPoint = prompt.indexOf("\n", splitIdx);
    const cacheable = prompt.slice(0, splitPoint > 0 ? splitPoint : splitIdx + 9);
    const dynamic = prompt.slice(splitPoint > 0 ? splitPoint + 1 : splitIdx + 9);
    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: cacheable, cache_control: { type: "ephemeral" } },
          { type: "text", text: dynamic || " " },
        ],
      },
    ];
  } else {
    messages = [
      {
        role: "user",
        content: enableCaching
          ? [{ type: "text", text: prompt, cache_control: { type: "ephemeral" } }]
          : prompt,
      },
    ];
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[anthropic] ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text || "";
  const usage = data?.usage || {};
  return {
    text,
    inputTokens: (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0),
    outputTokens: usage.output_tokens || 0,
    // Stash cache stats so callers can audit savings if they want
    cacheRead: usage.cache_read_input_tokens || 0,
    cacheCreation: usage.cache_creation_input_tokens || 0,
  };
}
