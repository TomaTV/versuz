/**
 * OpenRouter provider — one API key, 200+ models.
 *
 * Big UX win: instead of juggling Anthropic + OpenAI + DeepSeek + Google +
 * Mistral keys, OpenRouter aggregates them all behind one OpenAI-compatible
 * endpoint. You pay OpenRouter, they pay the upstream provider.
 *
 * Pricing: a thin markup (~5-15%) on the upstream model's price. Worth it
 * for solo dev to skip 5 separate billing accounts.
 *
 * Features:
 *   - Prompt caching for Anthropic models : we forward `cache_control:
 *     ephemeral` blocks (same shape as direct Anthropic API). 2nd+3rd judge
 *     in the 5min window pays ~10% input cost.
 *   - DeepSeek server-side cache : automatic, no header needed.
 *   - Free-tier models : `meta-llama/llama-3.3-70b-instruct:free`,
 *     `google/gemini-2.0-flash-exp:free`, etc. (rate-limited but usable).
 *
 * Get a key: https://openrouter.ai/keys
 * Env: OPENROUTER_API_KEY
 *
 * Model IDs use the form `<provider>/<model>` :
 *   anthropic/claude-haiku-4-5
 *   openai/gpt-5-mini
 *   deepseek/deepseek-v4-flash
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function buildMessages(modelId, prompt, enableCaching) {
  const isAnthropic = modelId.startsWith("anthropic/");
  if (!isAnthropic || !enableCaching) {
    return { messages: [{ role: "user", content: prompt }], cacheAttempted: false };
  }
  // Mirror anthropic.mjs: split at "===== END" marker so SKILL.md + task
  // setup is the cacheable prefix, per-judge rubric is the dynamic suffix.
  const splitIdx = prompt.lastIndexOf("===== END");
  if (splitIdx > 0) {
    const splitPoint = prompt.indexOf("\n", splitIdx);
    const cacheable = prompt.slice(0, splitPoint > 0 ? splitPoint : splitIdx + 9);
    const dynamic = prompt.slice(splitPoint > 0 ? splitPoint + 1 : splitIdx + 9);
    return {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: cacheable, cache_control: { type: "ephemeral", ttl: "5m" } },
            { type: "text", text: dynamic || " " },
          ],
        },
      ],
      cacheAttempted: true,
    };
  }
  return {
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt, cache_control: { type: "ephemeral", ttl: "5m" } }],
      },
    ],
    cacheAttempted: true,
  };
}

export async function callOpenRouter({
  modelId,
  prompt,
  temperature = 0.3,
  maxTokens = 600,
  enableCaching = true,
  label = "", // "agent" or "judge" — passed through for debug log clarity
  signal,
}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("[openrouter] OPENROUTER_API_KEY missing in env");

  const referer = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";
  const isAnthropic = modelId.startsWith("anthropic/");
  const isDeepSeek = modelId.startsWith("deepseek/");

  const { messages, cacheAttempted } = buildMessages(modelId, prompt, enableCaching);
  const body = {
    model: modelId,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  // Anthropic models don't support response_format json_object via OR.
  // OpenAI / DeepSeek / Mistral do — keep strict JSON for them.
  if (!isAnthropic) {
    body.response_format = { type: "json_object" };
  }
  // Force routing through providers that support prompt caching.
  // `only` is STRICT (vs `order` = preference). Slugs are lowercase.
  //
  //   - Anthropic models : route through Anthropic-direct (Bedrock/Vertex
  //     strip cache_control).
  //   - DeepSeek V4 (Flash & Pro) : DeepSeek-direct has implicit caching at
  //     $0.0028/M cache read (vs DeepInfra $0.028/M — 10× more), and full
  //     precision (vs DeepInfra FP4 quantized). Note : V3 chat does NOT have
  //     DeepSeek-direct on OR, only DeepInfra/Novita, so we'd fail there.
  //     We use V4 Flash which has all providers including direct.
  if (isAnthropic && enableCaching) {
    body.provider = { only: ["anthropic"], allow_fallbacks: false };
  } else if (isDeepSeek && enableCaching && modelId.includes("v4")) {
    // DeepSeek-direct has the cheapest cache ($0.0028/M vs DeepInfra $0.028/M).
    // BUT some OR accounts have "guardrail restrictions" (data privacy / region)
    // that block DeepSeek-direct → 404. Use `order` not `only` so we prefer
    // DeepSeek but fall back to another caching provider (SiliconFlow / AtlasCloud
    // also have cache_read at $0.028/M). Explicitly exclude DeepInfra (FP4
    // quantized = lower quality) and Venice (higher pricing).
    body.provider = {
      order: ["deepseek", "siliconflow", "atlascloud", "novita"],
      ignore: ["deepinfra", "venice"],
      allow_fallbacks: true,
    };
  }

  // Reasoning tokens eat the max_tokens budget *before* the model emits its
  // visible response. For judges that just return a score + 1-2 sentences of
  // rationale, the chain-of-thought is wasted budget and triggers truncated /
  // empty responses (parse fail). Tame it down for the two judges that default
  // to verbose reasoning on OpenRouter : DeepSeek V4 (Flash & Pro) and
  // OpenAI gpt-5-mini / gpt-5-nano.
  //
  // Provider quirks discovered in prod :
  //   - DeepSeek V4 : accepts `reasoning.enabled: false` cleanly.
  //   - GPT-5 mini  : refuses `enabled: false` with 400 "Reasoning is
  //                   mandatory for this endpoint and cannot be disabled".
  //                   Must use `effort: "minimal"` + `exclude: true` instead
  //                   (reasoning runs at minimum intensity, kept out of the
  //                   response so the JSON has all the visible tokens).
  //
  // The agent role keeps reasoning (different code path, doesn't pass
  // label="judge" — gated by the env switch below as a safety net).
  const isGpt5 = /^openai\/gpt-5/.test(modelId);
  const isReasoningModel = isDeepSeek || isGpt5;
  if (isReasoningModel && label === "judge" && process.env.BENCH_DISABLE_JUDGE_REASONING !== "0") {
    body.reasoning = isGpt5
      ? { effort: "minimal", exclude: true }
      : { enabled: false, exclude: true };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "http-referer": referer,
      "x-title": "Versuz",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[openrouter] ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const usage = data?.usage || {};
  // OpenRouter exposes cache stats under several possible names depending on
  // upstream provider + route. Check all known locations :
  //   1. usage.cache_read_input_tokens   (Anthropic-direct passthrough)
  //   2. usage.prompt_tokens_details.cached_tokens  (OpenAI-compatible)
  //   3. usage.cached_tokens             (some OR variants)
  //   4. usage.cache_tokens              (DeepSeek server-side cache)
  //   5. usage.prompt_cache_hit_tokens   (legacy DeepSeek)
  const cacheRead =
    usage.cache_read_input_tokens ||
    usage.prompt_tokens_details?.cached_tokens ||
    usage.cached_tokens ||
    usage.cache_tokens ||
    usage.prompt_cache_hit_tokens ||
    0;
  const cacheCreation =
    usage.cache_creation_input_tokens ||
    usage.cache_creation_tokens ||
    0;
  // Debug: log cache outcome on every call when BENCH_DEBUG_CACHE=1.
  //   - Anthropic : explicit cache_control, expect HIT after first call within 5 min
  //   - DeepSeek : auto server-side, expect HIT on judge calls (same rubric prefix)
  //   - OpenAI : implicit auto, 50% discount on hits
  // Agent calls (DeepSeek-as-agent) will MISS because each task is unique.
  if (process.env.BENCH_DEBUG_CACHE === "1") {
    const inTok = usage.prompt_tokens || 0;
    const outTok = usage.completion_tokens || 0;
    const status = cacheRead > 0
      ? `HIT ${cacheRead}/${inTok} (${Math.round((cacheRead / inTok) * 100)}%)`
      : `MISS in=${inTok}`;
    const tag = label ? `[${label.padEnd(5)}]` : "[?]    ";
    console.log(`${tag} ${modelId.padEnd(38)} → ${status} · out=${outTok}`);
    // Deep-dive : on DeepSeek judge calls, dump the full usage shape so we
    // can see exactly which cache field (if any) is populated. Run once.
    if (modelId.startsWith("deepseek/") && label === "judge" && cacheRead === 0) {
      if (!globalThis._vz_logged_deepseek_usage) {
        globalThis._vz_logged_deepseek_usage = true;
        console.log(`  [deepseek-usage-debug] full usage shape : ${JSON.stringify(usage)}`);
        console.log(`  [deepseek-usage-debug] full cost_details : ${JSON.stringify(data?.cost_details || {})}`);
        console.log(`  [deepseek-usage-debug] provider used : ${data?.provider || "unknown"}`);
      }
    }
  }
  return {
    text,
    inputTokens: (usage.prompt_tokens || 0),
    outputTokens: usage.completion_tokens || 0,
    cacheRead,
    cacheCreation,
    costUsd: data?.cost || usage.cost || 0,
  };
}
