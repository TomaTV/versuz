/**
 * Provider dispatcher. Pick the right adapter for a judge config.
 */

import { callGoogle } from "./google.mjs";
import { callGroq } from "./groq.mjs";
import { callMistral } from "./mistral.mjs";
import { callAnthropic } from "./anthropic.mjs";
import { callOpenAI } from "./openai.mjs";
import { callDeepSeek } from "./deepseek.mjs";
import { callOpenRouter } from "./openrouter.mjs";

const ADAPTERS = {
  google: callGoogle,
  groq: callGroq,
  mistral: callMistral,
  anthropic: callAnthropic,
  openai: callOpenAI,
  deepseek: callDeepSeek,
  openrouter: callOpenRouter,
};

export async function callProvider({ provider, modelId, prompt, temperature, maxTokens, label }) {
  const fn = ADAPTERS[provider];
  if (!fn) throw new Error(`[providers] unknown provider: ${provider}`);
  return await fn({ modelId, prompt, temperature, maxTokens, label });
}
