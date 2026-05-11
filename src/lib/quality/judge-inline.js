/**
 * Inline quality judge — call at submit time so new items get a quality_score
 * within ~2-5 seconds instead of waiting for the 6h cron.
 *
 * Free path : Groq Llama 4 Scout (1000 RPD), fallback Llama 3.3 70B.
 * Errors are swallowed (best effort) — the submit response already succeeded
 * by the time this runs (via after() / waitUntil()).
 *
 * Mirrors the rubric in scripts/bench/quality-judge.mjs, slimmed down for a
 * single inline call without retry/throttle bookkeeping.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
];

const RUBRIC = `You are a HARSH editor reviewing markdown for AI agent consumption. Most files are mediocre — score them honestly. Target distribution across 100 files : mean ~65, stdev ~12. Only ~5% deserve 85+, only ~1% deserve 90+.

LANGUAGE RULE : same strictness regardless of language. Don't inflate non-English scores.

CALIBRATION :
- 90-100 = EXCEPTIONAL · top 1%
- 80-89  = STRONG · top 10%
- 70-79  = GOOD · top third
- 60-69  = MEDIOCRE · DEFAULT BAND
- 40-59  = POOR
- 0-39   = BROKEN

PENALTY RULES (apply before scoring) :
A. File < 100 lines                            → MAX completeness=70
B. References external files not bundled       → MAX completeness=65, MAX usefulness=75
C. Endpoint list w/o auth/errors/examples      → MAX usefulness=70
D. No runnable command or code block           → MAX specificity=65
E. Repetitive / marketing fluff                → -10 clarity
F. Mixed languages mid-sentence                → -10 clarity

OUTPUT JSON ONLY :
{
  "weaknesses": ["specific issue 1", "specific issue 2"],
  "applicable_penalty_rules": ["A"|"B"|"C"|"D"|"E"|"F", ...],
  "clarity": 0-100,
  "specificity": 0-100,
  "completeness": 0-100,
  "structure": 0-100,
  "usefulness": 0-100,
  "rationale": "1-2 sentences referencing the weaknesses"
}`;

function buildPrompt({ kind, name, content }) {
  const header =
    kind === "skill"
      ? `===== SKILL.md (name: ${name || "unknown"}) =====`
      : `===== CLAUDE.md (project: ${name || "unknown"}) =====`;
  return [
    "You are a strict but fair AI code-quality reviewer.",
    header,
    String(content || "").slice(0, 3500),
    "===== END =====",
    RUBRIC,
  ].join("\n\n");
}

function parseScore(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?\s*|\s*```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const axes = ["clarity", "specificity", "completeness", "structure", "usefulness"];
    const vals = axes.map((a) => Number(obj[a])).filter((n) => Number.isFinite(n));
    if (vals.length < 3) return null;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return {
      score: Math.round(avg * 100) / 100,
      rationale: String(obj.rationale || "").slice(0, 500),
      axes: Object.fromEntries(axes.map((a) => [a, Number(obj[a]) || null])),
    };
  } catch {
    return null;
  }
}

async function callGroq(model, prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq ${res.status} ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * Best-effort inline quality judge. Returns nothing. Logs errors but never throws.
 * Caller should invoke via `after()` (Next.js) or fire-and-forget so it runs
 * AFTER the response is sent.
 *
 * @param {object} sb — Supabase admin client (service role)
 * @param {"skill"|"claude_md"} kind
 * @param {string} slug
 * @param {string} content — SKILL.md or CLAUDE.md raw markdown
 * @param {string} name — display name (optional, for prompt clarity)
 */
export async function judgeQualityInline(sb, kind, slug, content, name = "") {
  if (!process.env.GROQ_API_KEY) {
    // Silent no-op when running locally without a Groq key
    return;
  }
  if (!content || content.length < 50) return;

  const prompt = buildPrompt({ kind, name, content });
  let parsed = null;
  for (const model of GROQ_MODELS) {
    try {
      const text = await callGroq(model, prompt);
      parsed = parseScore(text);
      if (parsed) break;
    } catch (err) {
      // Try next model in the chain
      console.warn(`[quality-inline] ${model} failed: ${err.message?.slice(0, 100)}`);
    }
  }
  if (!parsed) {
    console.warn(`[quality-inline] no model returned parseable JSON for ${kind}/${slug}`);
    return;
  }

  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { error } = await sb
    .from(table)
    .update({
      quality_score: parsed.score,
      quality_rationale: parsed.rationale,
    })
    .eq("slug", slug);
  if (error) {
    console.warn(`[quality-inline] DB update failed for ${kind}/${slug}: ${error.message}`);
  } else {
    console.log(`[quality-inline] ✓ ${kind}/${slug} → quality ${parsed.score}`);
  }
}
