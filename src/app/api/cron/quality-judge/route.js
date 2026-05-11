/**
 * Cron — quality-judge any items that haven't been scored yet.
 *
 * Why : we want every item in the registry to have at least a quality_score
 * (LLM-rated content quality) so the leaderboard isn't empty. Skills in
 * categories with task suites get a real Elo via the bench engine ; this
 * cron picks up the rest (other skills + ALL CLAUDE.md by default).
 *
 * Schedule : every 6 hours (cron `0 0,6,12,18 * * *` in vercel.json).
 *
 * Cap per run : 50 items (~$0.025 via openai/gpt-5-nano through OR).
 * Re-runs are idempotent (skips already-judged unless `?rejudge=1`).
 *
 * Manual trigger :
 *   GET /api/cron/quality-judge?secret=<CRON_SECRET>
 *   GET /api/cron/quality-judge?secret=...&kind=skill&limit=20
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { callGroq } from "../../../../../scripts/bench/providers/groq.mjs";
import { callGoogle } from "../../../../../scripts/bench/providers/google.mjs";
import { callOpenRouter } from "../../../../../scripts/bench/providers/openrouter.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Default = FREE (Gemini 2.5 Flash via Google AI Studio, 1500 RPD + 1M tok/jour).
// Switch via env :
//   QUALITY_JUDGE_PROVIDER=groq       → Llama 4 Scout (free, 1000 RPD)
//   QUALITY_JUDGE_PROVIDER=openrouter → gpt-5-nano (~$0.0005/item, no daily cap)
const PROVIDER = (process.env.QUALITY_JUDGE_PROVIDER || "groq").toLowerCase();
const DEFAULT_MODEL = {
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
  google: "gemini-2.5-flash",
  openrouter: "openai/gpt-5-nano",
}[PROVIDER];
const MODEL = process.env.QUALITY_JUDGE_MODEL || DEFAULT_MODEL;
const REQUIRED_KEY = {
  groq: "GROQ_API_KEY",
  google: "GOOGLE_AI_STUDIO_KEY",
  openrouter: "OPENROUTER_API_KEY",
}[PROVIDER];
// Throttle between calls to respect each provider's free-tier RPM.
const THROTTLE_MS = { groq: 2100, google: 4500, openrouter: 250 }[PROVIDER];

async function callProvider(opts) {
  if (PROVIDER === "groq") return await callGroq(opts);
  if (PROVIDER === "google") return await callGoogle(opts);
  return await callOpenRouter({ ...opts, enableCaching: false });
}

function authorized(request) {
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (isVercelCron) return true;
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected || querySecret === expected;
}

const RUBRIC = `You are a HARSH editor reviewing markdown for AI agent consumption. Most files are mediocre — score them honestly. Distribution should be normal-shaped with mean ~65, only ~5% scoring 85+, only ~1% scoring 90+.

LANGUAGE RULE : same strictness regardless of language. Do NOT inflate non-English content out of politeness.

CALIBRATION SCALE :
- 90-100 = EXCEPTIONAL, top 1%
- 80-89  = STRONG, top 10%
- 70-79  = GOOD, top third
- 60-69  = MEDIOCRE — DEFAULT band
- 40-59  = POOR
- 0-39   = BROKEN

HARD PENALTY RULES (apply BEFORE scoring) :
A. Under 100 lines → MAX completeness = 70
B. References ANY external file not bundled (template.md, scripts/X.py, references/Y.md, 参见 X.md) → MAX completeness = 65, MAX usefulness = 75
C. Endpoint list with no auth / no examples → MAX usefulness = 70
D. No runnable command or code block → MAX specificity = 65
E. Repetitive content / version-history clutter / marketing fluff → -10 on clarity
F. Mixes 2+ languages mid-sentence → -10 on clarity

OUTPUT JSON ONLY in this EXACT order so you think about flaws first :
{
  "weaknesses": ["specific issue 1 in English", "specific issue 2 in English"],
  "applicable_penalty_rules": ["A"|"B"|"C"|"D"|"E"|"F", ...],
  "clarity": 0-100,
  "specificity": 0-100,
  "completeness": 0-100,
  "structure": 0-100,
  "usefulness": 0-100,
  "rationale": "1-2 sentences in English referencing the weaknesses"
}

A file scoring 65 average is FINE — that's the median. Don't be encouraging.`;

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
      rationale: String(obj.rationale || "").slice(0, 800),
    };
  } catch {
    return null;
  }
}

async function judgeOne(kind, item) {
  const name =
    kind === "skill"
      ? item.name
      : item.metadata?.author && item.metadata?.repo
        ? `${item.metadata.author}/${item.metadata.repo}`
        : item.slug;
  const content = kind === "skill" ? item.skill_md_content : item.content;
  if (!content || content.length < 50) return null;
  const trimmed = content.slice(0, 6000);
  const header =
    kind === "skill"
      ? `===== SKILL.md (name: ${name}) =====`
      : `===== CLAUDE.md (project: ${name}) =====`;
  const prompt = [
    "You are a strict but fair AI code-quality reviewer.",
    header,
    trimmed,
    "===== END =====",
    RUBRIC,
  ].join("\n\n");

  try {
    const res = await callProvider({
      modelId: MODEL,
      prompt,
      temperature: 0.0,
      maxTokens: 400,
    });
    return parseScore(res?.text || "");
  } catch {
    return null;
  }
}

export async function GET(request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  if (!process.env[REQUIRED_KEY]) {
    return Response.json({ ok: false, reason: `${REQUIRED_KEY.toLowerCase()}_unconfigured` });
  }
  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "DB unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const kindFilter = url.searchParams.get("kind");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const rejudge = url.searchParams.get("rejudge") === "1";

  const kinds = kindFilter ? [kindFilter] : ["skill", "claude_md"];
  const summary = { provider: PROVIDER, model: MODEL, kinds, judged: {}, errors: {} };

  for (const kind of kinds) {
    const table = kind === "claude_md" ? "claude_md_files" : "skills";
    const sel =
      kind === "skill"
        ? "id, slug, name, skill_md_content"
        : "id, slug, content, metadata";
    let q = sb.from(table).select(sel).limit(limit);
    if (!rejudge) q = q.is("quality_score", null);
    const { data: items, error } = await q;
    if (error) {
      summary.errors[kind] = error.message;
      continue;
    }
    let judged = 0;
    for (const item of items || []) {
      const parsed = await judgeOne(kind, item);
      if (!parsed) continue;
      const { error: updErr } = await sb
        .from(table)
        .update({
          quality_score: parsed.score,
          quality_rationale: parsed.rationale,
          quality_judged_at: new Date().toISOString(),
          quality_judge_model: MODEL,
        })
        .eq("id", item.id);
      if (!updErr) judged += 1;
      // Throttle to respect provider's free-tier RPM (groq=2.1s, google=4.5s, OR=250ms).
      await new Promise((res) => setTimeout(res, THROTTLE_MS));
    }
    summary.judged[kind] = judged;
  }

  return Response.json({ ok: true, ...summary });
}
