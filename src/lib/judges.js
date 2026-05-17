/**
 * Single source of truth for the judges currently active.
 *
 * Modes (set via BENCH_MODE / NEXT_PUBLIC_BENCH_MODE) :
 *
 *   - `dev`    — three free models, 3 different families. $0/cycle.
 *                Gemini Flash (Google) + Llama 3.3 70B (Meta/Groq) + Mistral Large 2 (Mistral)
 *
 *   - `prod`   — recommended public mode. Mixes Opus (paid via Anthropic API)
 *                with two free judges from other families.
 *                Opus 4.7 (Anthropic) + Gemini 2.5 Pro (Google free 50 RPD) + Mistral Large 2 (Mistral free)
 *
 *   - `gold`   — full canonical, all paid. Highest credibility, highest cost.
 *                Opus 4.7 + GPT-5 + Gemini 2.5 Pro
 *
 * Bumping a judge or rotating providers is one config change here, and the
 * whole site + bench engine pick it up. Never hardcode judge names elsewhere.
 *
 * Honesty rule: page copy reads `JUDGES` directly. Mode flips → copy flips.
 */

// Default = `or-v1` : premium 3-judge ensemble (Haiku 4.5 + DeepSeek V3 +
// GPT-5 mini) routed through OpenRouter — one key, one billing dashboard.
// Landing page + skill detail pages all read JUDGES from here, so flipping
// MODE flips every "we use 3 judges" copy across the site.
//
// Fallback to `dev` (free Groq Llama trio) if you don't have an OR key set
// up — explicitly via `BENCH_MODE=dev`.
const MODE =
  process.env.BENCH_MODE ||
  process.env.NEXT_PUBLIC_BENCH_MODE ||
  "or-v1";

/**
 * Modes:
 *   - dev    → 3 Groq models, $0/cycle (3000 RPD total free)
 *   - v1     → DeepSeek V3 + R1 + Mistral free, ~$0.0001/call (~$0.90 / 9k calls)
 *   - prod   → Opus 4.7 + Gemini 2.5 Pro free + Mistral free
 *   - gold   → Opus + GPT-5 + Gemini 2.5 Pro (all paid, full canonical)
 */

const PRESETS = {
  dev: [
    // Three Groq models — quotas are PER-MODEL, not per-account, so we get
    // 3× 1000 RPD = 3000 free requests/day, and 3× 30 RPM = 90 RPM
    // theoretical (clamped per-model). No more cross-provider rate-limit
    // cascade; one provider, three independent quota pools, three different
    // model families for genuine ensemble diversity.
    {
      id: "llama-3-3-70b",
      label: "Llama 3.3 70B",
      shortLabel: "Llama 70B",
      provider: "groq",
      modelId: "llama-3.3-70b-versatile",
      color: "var(--accent)",
      weight: 0.34,
      free: true,
    },
    {
      id: "llama-4-scout-17b",
      label: "Llama 4 Scout 17B",
      shortLabel: "Llama 4 Scout",
      provider: "groq",
      modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
      color: "var(--azure)",
      weight: 0.33,
      free: true,
    },
    {
      id: "llama-4-maverick-17b",
      label: "Llama 4 Maverick 17B",
      shortLabel: "Llama 4 Maverick",
      provider: "groq",
      modelId: "meta-llama/llama-4-maverick-17b-128e-instruct",
      color: "var(--sage)",
      weight: 0.33,
      free: true,
    },
  ],
  v1: [
    // V1 paid — three brand-name judges, no free filler.
    // Anthropic Haiku 4.5 + DeepSeek V3 + GPT-5 mini = wow ensemble.
    //
    // Real token math per judge call (1700 tok in + 150 tok out):
    //   Haiku 4.5    $1/M in + $5/M out  → $0.00245/call
    //   DeepSeek V3  $0.27/M in + $1.10/M out → $0.000624/call
    //   GPT-5 mini   $0.25/M in + $2/M out → $0.000725/call
    //
    // For 100 skills × 5 tasks × 3 judges = 1500 judge calls/day :
    //   Haiku 4.5    500 × $0.00245 = $1.23/day
    //   DeepSeek V3  500 × $0.000624 = $0.31/day
    //   GPT-5 mini   500 × $0.000725 = $0.36/day
    //   Agent (DeepSeek V3, 2k in + 1k out, 500 calls) = $0.82/day
    //                                                  ────────
    //                                                  $2.72/day ≈ 2.50 €
    {
      id: "claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      shortLabel: "Haiku 4.5",
      provider: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      color: "var(--accent)",
      weight: 0.4,
      free: false,
    },
    {
      id: "deepseek-chat",
      label: "DeepSeek V3",
      shortLabel: "DeepSeek V3",
      provider: "deepseek",
      // Revert from V4 Flash : V4 = reasoning-only, on coupe le reasoning →
      // calibration polarisée. V3 chat = calibration stable (avg 57, stddev 14).
      modelId: "deepseek-chat",
      color: "var(--azure)",
      weight: 0.3,
      free: false,
    },
    {
      id: "gpt-5-mini",
      label: "GPT-5 mini",
      shortLabel: "GPT-5 mini",
      provider: "openai",
      modelId: "gpt-5-mini",
      color: "var(--sage)",
      weight: 0.3,
      free: false,
    },
  ],
  // v1-thrift — under 1 €/day with brand recognition.
  //   Agent: DeepSeek V3   $0.82/day
  //   Judge: GPT-5 nano    500 × ($0.05/M × 1700 + $0.40/M × 150) = $0.073/day
  //                        ────────
  //                        $0.89/day ≈ 0.81 €/day ✓
  // Single judge → no ensemble disagreement, but real Anthropic-tier names
  // (DeepSeek for the agent, OpenAI for scoring).
  "v1-thrift": [
    {
      id: "gpt-5-nano",
      label: "GPT-5 nano",
      shortLabel: "GPT-5 nano",
      provider: "openai",
      modelId: "gpt-5-nano",
      color: "var(--accent)",
      weight: 1,
      free: false,
    },
  ],
  // or-v1 — same lineup as v1, routed through OpenRouter so you only manage
  // ONE API key + billing account. Slight markup (~5-15%) over direct
  // pricing, traded for setup simplicity. Prompt caching works transparently
  // through OR for Anthropic + DeepSeek models.
  "or-v1": [
    {
      id: "or-claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      shortLabel: "Haiku 4.5",
      provider: "openrouter",
      modelId: "anthropic/claude-haiku-4-5",
      color: "var(--accent)",
      weight: 0.4,
      free: false,
    },
    {
      id: "or-deepseek-chat",
      label: "DeepSeek V3",
      shortLabel: "DeepSeek V3",
      provider: "openrouter",
      // Revert from V4 Flash (mai 2026) : V4 Flash est reasoning-only, et on
      // coupe le reasoning pour économiser tokens → calibration polarisée
      // (stddev 27, 46% sub-30 + 17% sup-70). V3 chat : avg 57, stddev 14,
      // calibration prouvée sur 49 scores. Delta coût marginal ($5/mois) vs
      // un judge stable. Cache moins agressif sur OR mais on est à 1% du cap.
      modelId: "deepseek/deepseek-chat",
      color: "var(--azure)",
      weight: 0.3,
      free: false,
    },
    {
      id: "or-gpt-5-mini",
      label: "GPT-5 mini",
      shortLabel: "GPT-5 mini",
      provider: "openrouter",
      modelId: "openai/gpt-5-mini",
      color: "var(--sage)",
      weight: 0.3,
      free: false,
    },
  ],
  // or-thrift — single judge, ~0.81 €/day, ONE OpenRouter key only.
  "or-thrift": [
    {
      id: "or-gpt-5-nano",
      label: "GPT-5 nano",
      shortLabel: "GPT-5 nano",
      provider: "openrouter",
      modelId: "openai/gpt-5-nano",
      color: "var(--accent)",
      weight: 1,
      free: false,
    },
  ],
  // or-screen — tier 0 du système tiered. 1 judge GPT-5 mini (reliable parse
  // + brand). Plus cher que nano mais 5× moins de parse errors → ranking
  // moins biaisé pour le filtrage initial. ~$0.0008/judge call.
  "or-screen": [
    {
      id: "or-gpt-5-mini",
      label: "GPT-5",
      shortLabel: "GPT-5",
      provider: "openrouter",
      modelId: "openai/gpt-5-mini",
      color: "var(--accent)",
      weight: 1,
      free: false,
    },
  ],
  prod: [
    {
      id: "claude-opus-4-7",
      label: "Claude Opus 4.7",
      shortLabel: "Opus 4.7",
      provider: "anthropic",
      modelId: "claude-opus-4-7-20251001",
      color: "var(--accent)",
      weight: 0.4,
      free: false,
    },
    {
      id: "gemini-2-5-pro",
      label: "Gemini 2.5 Pro",
      shortLabel: "Gemini Pro",
      provider: "google",
      modelId: "gemini-2.5-pro",
      color: "var(--azure)",
      weight: 0.3,
      free: true, // free up to 50 RPD via Google AI Studio
    },
    {
      id: "mistral-large",
      label: "Mistral Large 2",
      shortLabel: "Mistral Large",
      provider: "mistral",
      modelId: "mistral-large-latest",
      color: "var(--sage)",
      weight: 0.3,
      free: true,
    },
  ],
  gold: [
    {
      id: "claude-opus-4-7",
      label: "Claude Opus 4.7",
      shortLabel: "Opus 4.7",
      provider: "anthropic",
      modelId: "claude-opus-4-7-20251001",
      color: "var(--accent)",
      weight: 0.34,
      free: false,
    },
    {
      id: "gpt-5",
      label: "GPT-5",
      shortLabel: "GPT-5",
      provider: "openai",
      modelId: "gpt-5",
      color: "var(--azure)",
      weight: 0.33,
      free: false,
    },
    {
      id: "gemini-2-5-pro",
      label: "Gemini 2.5 Pro",
      shortLabel: "Gemini 2.5 Pro",
      provider: "google",
      modelId: "gemini-2.5-pro",
      color: "var(--sage)",
      weight: 0.33,
      free: false,
    },
  ],
};

export const JUDGE_MODE = PRESETS[MODE] ? MODE : "dev";
const FULL_JUDGES = PRESETS[JUDGE_MODE];

/**
 * Trim the active judge ensemble down via env. Useful in dev to save free-
 * tier quota: BENCH_JUDGE_COUNT=1 means 1 judge per output (3× fewer calls)
 * at the cost of disagreement signal. Default = use them all.
 */
const judgeCountRaw = Number(process.env.BENCH_JUDGE_COUNT || 0);
const judgeCount =
  judgeCountRaw > 0 && judgeCountRaw <= FULL_JUDGES.length
    ? judgeCountRaw
    : FULL_JUDGES.length;

export const JUDGES = FULL_JUDGES.slice(0, judgeCount);
export const PRIMARY_JUDGE = JUDGES[0];
export const ALL_FREE = JUDGES.every((j) => j.free);

/**
 * Display label for the current judge ensemble. Used in copy.
 */
export function judgesLabel({ short = false } = {}) {
  const labels = JUDGES.map((j) => (short ? j.shortLabel : j.label));
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Map a raw judge_model id (as stored in `judge_scores.judge_model`) vers
 * un nom affichable. Permet de masquer les variantes "cheap" sur le site
 * (ex : `openai/gpt-5-nano` → "GPT-5", `anthropic/claude-haiku-4-5` →
 * "Haiku 4.5"). Fallback = raw id si pas trouvé.
 *
 * Cherche dans TOUS les presets pour éviter les "unknown model" quand on
 * affiche des scores legacy d'un ancien preset.
 */
export function displayJudgeModel(rawModelId) {
  if (!rawModelId) return "—";
  for (const preset of Object.values(PRESETS)) {
    for (const j of preset) {
      if (j.modelId === rawModelId || j.id === rawModelId) {
        return j.shortLabel || j.label || rawModelId;
      }
    }
  }
  // Friendly fallback : strip provider prefix
  const m = String(rawModelId).match(/[^/]+$/);
  return m ? m[0] : rawModelId;
}
