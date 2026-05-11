/**
 * Shared rate-limit / retry helpers for bench provider calls.
 *
 * Two challenges with free tiers:
 *  - per-minute RPM (Gemini Flash 15, Groq 30, Mistral generous)
 *  - per-day RPD (Gemini Flash 1500, Groq 1000)
 *
 * 429 from any of them looks the same on the wire: "exceeded quota". We can't
 * tell daily-vs-minute from the message alone, but a single per-minute
 * exhaustion clears in <60s while daily takes hours. So we backoff
 * aggressively (60s on attempt 2, 180s on attempt 3) — long enough to ride
 * through a per-minute spike, short enough to give up before the user
 * abandons.
 */

import { callProvider } from "./providers/index.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RETRY_DELAYS = [
  Number(process.env.BENCH_RETRY_DELAY_1 || 8_000),
  Number(process.env.BENCH_RETRY_DELAY_2 || 30_000),
  Number(process.env.BENCH_RETRY_DELAY_3 || 90_000),
];

export async function callWithRetry(opts, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callProvider(opts);
    } catch (err) {
      const msg = err?.message || "";
      const isRetryable = /\b(429|500|502|503|504)\b/.test(msg);
      lastErr = err;
      if (!isRetryable || i === attempts - 1) throw err;
      const delay = RETRY_DELAYS[Math.min(i, RETRY_DELAYS.length - 1)];
      console.warn(
        `[rate-limit] ${opts.provider}/${opts.modelId} got ${msg.slice(0, 80)} — retry in ${Math.round(delay / 1000)}s (attempt ${i + 2}/${attempts})`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Same as callWithRetry, but also rotates across a list of provider configs
 * if one runs into an unrecoverable 429. Used for the agent path so we can
 * fall over from Gemini Flash → Groq → Mistral when one quota is depleted.
 */
export async function callWithRotation(providers, basePromptOpts) {
  let lastErr;
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    try {
      return await callWithRetry(
        {
          provider: p.provider,
          modelId: p.modelId,
          ...basePromptOpts,
        },
        // First provider gets full retry budget; fallbacks get 1 attempt each
        // (we'd rather try a different provider than wait another 90s).
        i === 0 ? 3 : 1
      );
    } catch (err) {
      lastErr = err;
      const msg = err?.message || "";
      const isQuota = /\b429\b/.test(msg);
      if (!isQuota || i === providers.length - 1) throw err;
      console.warn(
        `[rate-limit] ${p.provider}/${p.modelId} quota exhausted — falling over to ${providers[i + 1].provider}/${providers[i + 1].modelId}`
      );
    }
  }
  throw lastErr;
}
