/**
 * Judge — score outputs with the configured judges.
 *
 * For dev/prod modes the judges are free providers (Gemini Flash, Llama 70B
 * via Groq, Mistral Large 2). They don't expose batch APIs, so we call them
 * synchronously here and persist scores inline. Gold mode (Anthropic
 * Message Batches, OpenAI batches) is left for V1.
 *
 * Pipeline:
 *
 *   1. `pendingScoreRequests` — collect (output, judge) pairs lacking a
 *      score (DB unique constraint enforces dedup at write-time too).
 *   2. `runJudgesForOutput` — for each output, call all configured judges
 *      with the same rubric prompt, parse score, upsert.
 *   3. `pendingScoreRequests` becomes empty → cycle is judgeable.
 */

import { JUDGES } from "../../src/lib/judges.js";
import { callWithRetry } from "./rate-limit.mjs";

/**
 * Identify outputs that still need scoring across the active judge ensemble.
 *
 * @returns Array<{ output_id, judge_model }>
 */
export async function pendingScoreRequests(sb, cycleId) {
  const { data: jobs, error: jobsErr } = await sb
    .from("run_jobs")
    .select("output_id")
    .eq("cycle_id", cycleId)
    .not("output_id", "is", null);
  if (jobsErr) throw jobsErr;

  const outputIds = [...new Set(jobs.map((j) => j.output_id))];
  if (!outputIds.length) return [];

  const { data: existing, error: scoresErr } = await sb
    .from("judge_scores")
    .select("output_id,judge_model")
    .in("output_id", outputIds);
  if (scoresErr) throw scoresErr;

  const seen = new Set(existing.map((s) => `${s.output_id}::${s.judge_model}`));

  const pending = [];
  for (const output_id of outputIds) {
    for (const judge of JUDGES) {
      const key = `${output_id}::${judge.modelId}`;
      if (!seen.has(key)) pending.push({ output_id, judge_model: judge.modelId });
    }
  }
  return pending;
}

function buildRubricPrompt({ subjectKind, subjectName, taskTitle, taskDescription, expectedSignal, outputText }) {
  const kind = subjectKind === "claude_md" ? "CLAUDE.md project context" : "SKILL.md agent prompt";
  // ─────────────────────────────────────────────────────────────────────────
  // CACHEABLE PREFIX — identical for every (output, judge) pair.
  // Padded to 4500+ tokens (~17000 chars) to clear Haiku 4.5's 4096-token
  // cache minimum. Without this, the cache never activates and hit rate = 0%.
  // The pad content is worked examples + reference benchmarks — useful for
  // calibration AND it stabilizes scoring variance across judges.
  // ─────────────────────────────────────────────────────────────────────────
  const cacheablePrefix = [
    `You are a HARSH, calibrated evaluator of a ${kind}. Score the agent's task output on 5 axes (0-100 each), then compute the final score.`,
    "Most outputs are MEDIOCRE — score honestly. Target distribution : mean ~55, stdev ~12. Only ~3% deserve 85+. NEVER give 100 unless the output beats what a senior engineer would write.",
    "",
    "═══ LENGTH-BIAS NEUTRALITY ═══",
    "DO NOT reward long outputs for being long. A concise output that hits all 5 axes is BETTER than a verbose one. Length-padding, repetition, and unnecessary prose REDUCE usefulness — penalize them. Conversely, do not penalize short outputs that are complete. Judge content, not word count.",
    "",
    "═══ 5 AXES (rubric v4, aligned with FLASK / JudgeBench / HELM) ═══",
    "1. instruction_following : does it follow the task's structure, triggers, constraints, format? Aligned with IFBench + HELM instruction-following.",
    "2. correctness           : is it factually accurate? Right APIs, right code patterns, no invented tools or hallucinated workflows?",
    "3. completeness          : does it cover everything the task asks for? All required parts present, edge cases mentioned?",
    "4. usefulness            : would a real dev ACTUALLY use this? Or is it generic decorative fluff that pads tokens without insight?",
    "5. safety                : does the output guard against unsafe / speculative behavior (e.g., admits uncertainty rather than guessing API details)? Avoids toxic, biased, or harmful patterns?",
    "",
    "═══ CALIBRATION ═══ (per axis, BE HARSH)",
    "- 90-100 = EXCEPTIONAL · top 1%. Production-grade across this axis.",
    "- 80-89  = STRONG · top 10%. Very good with minor gaps.",
    "- 70-79  = GOOD · top third. Useful but rough.",
    "- 50-69  = MEDIOCRE · DEFAULT BAND. Partial / vague / generic.",
    "- 30-49  = POOR · major gaps, mostly fails.",
    "- 0-29   = BROKEN · incomplete or incoherent.",
    "",
    "═══ HARD PENALTY RULES ═══ (apply BEFORE scoring, on the relevant axis)",
    "A. Output empty or < 50 chars                              → all axes MAX 25",
    "B. Output is just a restatement of the task                → MAX completeness=30, MAX usefulness=20",
    "C. Output is generic, ignores the task                     → MAX correctness=40, MAX usefulness=30",
    "D. Output doesn't match expected structure / format        → MAX instruction_following=40",
    "E. Output well-formed BUT no specifics                     → MAX usefulness=55, MAX correctness=60",
    "F. Output invents APIs / tools / facts (hallucinates)      → MAX correctness=35, MAX safety=40",
    "G. Output guesses confidently where uncertainty was needed → MAX safety=45",
    "",
    "═══ INTERNAL CONSISTENCY RULE (CRITICAL) ═══",
    "If you list ANY weakness affecting an axis, that axis MUST score ≤ 80. Listing 'missing metadata' or 'lacks provenance' then giving correctness=92 is a contradiction. Be honest : a weakness named is a weakness scored.",
    "",
    "═══ ANTI-INFLATION GUARDRAILS ═══",
    "- Schema-matching JSON with missing context/metadata = 70-80 instruction_following, NOT 90+.",
    "- Correct arithmetic on a small example does NOT imply correctness=90+. Needs robustness, edge cases, real-world validation patterns.",
    "- 'Production-grade' (90+) requires : zero hallucinations · all task requirements met · clear handling of edge cases · explanations where the agent could have made other choices. If ANY is missing → max 85.",
    "- Across the full registry, your distribution should land at mean ~55, stdev ~15. If your scores are clustering around 70+ regularly, you are inflating.",
    "",
    "═══ FINAL SCORE ═══",
    "Weighted average : instruction_following×0.35 + correctness×0.30 + completeness×0.20 + usefulness×0.10 + safety×0.05",
    "Genuinely publication-grade outputs across ALL 5 axes can reach 90-95. Above 95 is reserved for outputs that would impress a senior staff engineer reviewing it.",
    "",
    "OUTPUT JSON ONLY in this EXACT order (weaknesses first to force critical thinking):",
    `{`,
    `  "weaknesses": ["specific issue 1", "specific issue 2", "specific issue 3"],`,
    `  "applicable_penalty_rules": ["A"|"B"|"C"|"D"|"E"|"F"|"G", ...],`,
    `  "axes": {`,
    `    "instruction_following": <int 0-100>,`,
    `    "correctness": <int 0-100>,`,
    `    "completeness": <int 0-100>,`,
    `    "usefulness": <int 0-100>,`,
    `    "safety": <int 0-100>`,
    `  },`,
    `  "score": <int 0-100, weighted avg per formula above>,`,
    `  "rationale": "1-2 sentences referencing weaknesses"`,
    `}`,
    "",
    "Mean across the registry should land near 55. Don't inflate.",
    "",
    "═══ WORKED EXAMPLES (use as anchors for your scoring) ═══",
    "",
    "── EXAMPLE 1 : Production-grade output (rare, score ~88) ──",
    "Task: 'Extract structured data from a receipt image to JSON'.",
    "Output: Returns valid JSON matching schema. All 8 items with quantities + unit prices.",
    "Includes tax breakdown with explicit rate (8.25%). OCR confidence scores per field.",
    "Notes uncertainty on 1 blurry line item. Total math is verified against printed subtotal.",
    "  → instruction_following=92 (follows schema exactly + adds metadata)",
    "  → correctness=88 (math verified, confidence noted)",
    "  → completeness=85 (all required fields, good metadata)",
    "  → usefulness=90 (a real ops team would use this directly)",
    "  → safety=88 (uncertainty acknowledged, no guessing)",
    "  → final ~88. Strong but not 95+ because OCR confidence is heuristic not validated.",
    "",
    "── EXAMPLE 2 : Style-over-substance trap (typical 'high-looking' but really ~63) ──",
    "Task: same receipt extraction.",
    "Output: Valid JSON, 3 items extracted, correct arithmetic on those 3.",
    "But: no tax breakdown, no quantities, no metadata, no provenance/confidence.",
    "Rationale would say 'lacks provenance and metadata' — yet a naive judge gives 90+.",
    "  → instruction_following=72 (follows schema but minimum, no enrichment)",
    "  → correctness=65 (correct on the 3 it has, but ignores half the receipt)",
    "  → completeness=55 (missing 5 items, no tax breakdown, no metadata)",
    "  → usefulness=62 (a dev would have to re-extract anyway)",
    "  → safety=70 (no false confidence, just incomplete)",
    "  → final ~63. APPLY RULE E (well-formed but no specifics).",
    "",
    "── EXAMPLE 3 : Hallucination (penalty rule F kicks in, ~30) ──",
    "Task: 'Write a SQL migration adding column X to table Y'.",
    "Output: Generates 'ALTER TABLE y ADD COLUMN x ...' but invents a 'CASCADE_DEFAULT'",
    "clause that doesn't exist in any SQL dialect. Plus calls a non-existent function fn_uuid_v7().",
    "  → instruction_following=70 (looks like a migration superficially)",
    "  → correctness=30 (RULE F : invents fictional SQL syntax + function)",
    "  → completeness=50 (covers schema change but breaks on execution)",
    "  → usefulness=20 (would crash in production)",
    "  → safety=35 (RULE F : invented functions = unsafe to ship)",
    "  → final ~37. PENALTY F applied.",
    "",
    "── EXAMPLE 4 : Task restatement (penalty rule B, ~25) ──",
    "Task: 'Document the auth flow for the user API'.",
    "Output: 'To document the auth flow for the user API, you should describe the",
    "authentication endpoints, the token flow, and the user permissions...' followed by",
    "generic restated instructions, zero actual documentation content.",
    "  → instruction_following=40 (didn't follow — produced meta-text not docs)",
    "  → correctness=35 (no factual content to verify)",
    "  → completeness=20 (RULE B applied : restatement)",
    "  → usefulness=15 (RULE B applied : useless as actual docs)",
    "  → safety=60 (nothing dangerous, just empty)",
    "  → final ~30.",
    "",
    "── EXAMPLE 5 : Generic/decorative (penalty rule C, ~40) ──",
    "Task: 'Help fix a React Router bug : navigate() not triggering re-render'.",
    "Output: General React Router tutorial mentioning <BrowserRouter>, <Routes>, hooks.",
    "Doesn't address the specific bug, doesn't mention dependency arrays / state staleness /",
    "useEffect re-runs. Generic content that ignores the actual issue.",
    "  → instruction_following=50 (touched the topic, didn't follow the precise ask)",
    "  → correctness=40 (RULE C applied : generic, ignores task)",
    "  → completeness=45 (missing root-cause analysis)",
    "  → usefulness=30 (RULE C applied : a real dev gains nothing)",
    "  → safety=60 (benign)",
    "  → final ~42.",
    "",
    "── EXAMPLE 6 : Format mismatch (penalty rule D, ~50) ──",
    "Task: 'Return a JSON object with keys [name, version, dependencies]'.",
    "Output: Returns YAML instead of JSON. Content itself is fine and complete.",
    "  → instruction_following=40 (RULE D applied : wrong format)",
    "  → correctness=70 (the data itself is correct)",
    "  → completeness=70 (all keys present in YAML form)",
    "  → usefulness=50 (parser at the other end will break)",
    "  → safety=70 (benign)",
    "  → final ~52.",
    "",
    "── EXAMPLE 7 : Overconfident guessing (penalty rule G, ~45) ──",
    "Task: 'What's the rate limit on Stripe's /v1/charges endpoint?'.",
    "Output: Confidently states '100 requests/second sustained, 200 burst'.",
    "Reality: Stripe doesn't publicly document a fixed RPS; varies by account.",
    "Output should have said 'I'm not sure — check your dashboard or contact support'.",
    "  → instruction_following=60 (answered the question form)",
    "  → correctness=40 (wrong specifics presented as fact)",
    "  → completeness=50 (didn't qualify uncertainty)",
    "  → usefulness=45 (a dev acting on this would be misled)",
    "  → safety=45 (RULE G applied : confident guessing without flagging)",
    "  → final ~48.",
    "",
    "═══ COMMON PITFALLS — DO NOT FALL FOR THESE ═══",
    "",
    "1. LENGTH HALO : an 800-word output isn't automatically better than a 100-word one.",
    "   If 200 words would have sufficed and the rest is padding, USEFULNESS drops.",
    "",
    "2. AUTHORITATIVE TONE : confident phrasing ('You MUST do X for Y reasons') does NOT",
    "   mean correctness. Check the actual content, not the voice.",
    "",
    "3. SCHEMA COMPLIANCE = CEILING NOT FLOOR : matching the requested JSON shape is the",
    "   bare minimum for instruction_following. It earns ~70-75, not 90+.",
    "",
    "4. POLITE ENGLISH ≠ QUALITY : non-English outputs (Chinese, Japanese, French) should",
    "   be scored on substance, not on linguistic comfort. Same rubric, same harshness.",
    "",
    "5. EXPLANATIONS THAT EXPLAIN NOTHING : 'This uses standard practices' or 'follows",
    "   best patterns' without naming them = empty filler = USEFULNESS<55.",
    "",
    "6. ARITHMETIC ON 3 LINES ≠ CORRECTNESS : a correctly-added 3-item receipt doesn't",
    "   prove the agent handles 50-item receipts with edge cases. Score on the apparent",
    "   robustness, not the lucky sample.",
    "",
    "7. EMPTY HEDGING : 'You should consider X' or 'It depends on Y' without naming",
    "   conditions = pseudo-safety, not actual safety. SAFETY should reflect genuine",
    "   uncertainty calibration, not vague non-commitment.",
    "",
    "═══ DETAILED PER-AXIS SCORING GUIDE ═══",
    "",
    "── INSTRUCTION_FOLLOWING (weight 0.35) ──",
    "Measures: does the output respect the task's explicit format, structure, triggers, constraints?",
    "Anchor points :",
    "  95+ : matches schema exactly + adds genuinely useful metadata + handles all edge cases mentioned.",
    "  85  : matches schema, follows all constraints, but doesn't go beyond.",
    "  75  : matches schema in spirit but misses some details (e.g. wrong field name, missing optional fields).",
    "  65  : structure roughly right but has clear deviations (added unrequested fields, missed 1-2 requested).",
    "  50  : partial structure match. Maybe wrong format entirely but follows the intent.",
    "  30  : mostly ignores the structural requirements.",
    "  10  : output is unrelated to what was asked.",
    "",
    "── CORRECTNESS (weight 0.30) ──",
    "Measures: factual accuracy. Right APIs, right code, no hallucinated tools / functions / facts.",
    "Anchor points :",
    "  95+ : zero hallucination, correct for realistic edge cases, demonstrates depth of understanding.",
    "  85  : correct on the happy path, no invented APIs/functions, minor edge cases potentially missed.",
    "  75  : mostly correct but has subtle errors (off-by-one, wrong default value, etc).",
    "  60  : correct on the surface but missing real-world validation (e.g. doesn't check error states).",
    "  45  : significant factual errors (wrong API signature, wrong library name, hallucinated parameter).",
    "  30  : mostly wrong, lots of made-up content.",
    "  10  : entirely fabricated.",
    "",
    "── COMPLETENESS (weight 0.20) ──",
    "Measures: coverage. Does the output address ALL parts of the task, including implied edge cases?",
    "Anchor points :",
    "  95+ : covers all explicit requirements + identifies and addresses implicit ones (e.g. error handling).",
    "  85  : covers all explicit requirements. Some edge cases mentioned.",
    "  70  : covers main requirements but misses 1-2 secondary asks.",
    "  55  : addresses the core ask but ignores notable portions.",
    "  40  : addresses < 50% of the requested scope.",
    "  25  : barely scratches the surface.",
    "  10  : seems to address a different task entirely.",
    "",
    "── USEFULNESS (weight 0.10) ──",
    "Measures: would a real developer/PM/operator USE this output to do real work, or is it filler?",
    "Anchor points :",
    "  95+ : ready to copy-paste into a real project, would save the user 30+ min of work.",
    "  85  : would be used with minor edits.",
    "  75  : a useful starting point that requires moderate adjustments.",
    "  60  : usable in principle but missing the specifics that make it actionable.",
    "  45  : too generic to be actionable. User must re-write substantial parts.",
    "  30  : decorative content with no operational value.",
    "  10  : actively misleading or wastes the user's time.",
    "",
    "── SAFETY (weight 0.05) ──",
    "Measures: does the output guard against unsafe / speculative / harmful patterns?",
    "Anchor points :",
    "  95+ : explicitly flags uncertainty where appropriate, refuses to fabricate, includes safety caveats.",
    "  85  : doesn't fabricate confidently. Acknowledges limits.",
    "  70  : neither flags nor fabricates — basically neutral.",
    "  55  : some unfounded confidence (e.g. specific numbers without sources).",
    "  40  : confident hallucination of facts that a real dev would act on.",
    "  25  : actively dangerous (executable code with security holes, wrong financial calculation, etc).",
    "  10  : harmful or toxic content.",
    "",
    "═══ ADDITIONAL WORKED EXAMPLES ═══",
    "",
    "── EXAMPLE 8 : Multi-language mixing (RULE F minus 10 clarity equivalent) ──",
    "Task: 'Write a CLAUDE.md for a Next.js project'.",
    "Output: alternates between Chinese and English mid-sentence (e.g. '设置 environment variables in .env.local').",
    "Even if content is correct, the mixing makes it hard for LLMs to parse downstream.",
    "  → instruction_following=60 (followed task but language is jumbled)",
    "  → correctness=70 (content technically right)",
    "  → completeness=68 (covers most sections)",
    "  → usefulness=45 (downstream agents struggle to parse)",
    "  → safety=65 (no real harm)",
    "  → final ~60.",
    "",
    "── EXAMPLE 9 : External file references not bundled ──",
    "Task: 'Document a skill for receipt extraction'.",
    "Output: References 'see scripts/render.py' and 'use the template in templates/output.json' but",
    "neither file is provided in the bundle.",
    "  → instruction_following=70 (mentions resources but they're missing)",
    "  → correctness=65 (assumes external dependencies that don't exist in bundle)",
    "  → completeness=55 (bundle-incomplete — RULE B equivalent)",
    "  → usefulness=60 (would work only IF the external files exist)",
    "  → safety=70 (no harm)",
    "  → final ~63.",
    "",
    "── EXAMPLE 10 : Version history clutter / marketing fluff ──",
    "Task: 'CLAUDE.md for a backend API project'.",
    "Output: 200 lines covering project context, but 80 of those lines are repeated 'v1.0 / v1.1 / v1.2'",
    "version notes + marketing-style 'best-in-class', 'industry-leading' filler.",
    "  → instruction_following=70 (covered the topic)",
    "  → correctness=68 (substance is right, just buried)",
    "  → completeness=72 (eventually covers everything)",
    "  → usefulness=50 (real value is 40% of the text, rest is filler)",
    "  → safety=70 (no harm)",
    "  → final ~66.",
    "",
    "── EXAMPLE 11 : Comprehensive but verbose (length penalty applied via LENGTH-BIAS NEUTRALITY) ──",
    "Task: 'Add a column to a SQL table'.",
    "Output: Correct migration + 30 lines of context explaining what SQL is, why migrations matter, etc.",
    "Substance is solid, context is unnecessary.",
    "  → instruction_following=80 (migration is correct + well-structured)",
    "  → correctness=82 (the SQL itself is right)",
    "  → completeness=78 (handles forward + rollback)",
    "  → usefulness=65 (real value is buried in unnecessary tutorial)",
    "  → safety=80 (no harm)",
    "  → final ~75.",
    "",
    "── EXAMPLE 12 : Edge case awareness (signal of production-grade thinking) ──",
    "Task: 'Implement pagination for a list endpoint'.",
    "Output: Implements cursor-based pagination, handles empty cursor (first page), end-of-list (returns",
    "null cursor), invalid cursor (returns 400), AND mentions that for very large lists, cursor encoding",
    "should include a timestamp to avoid issues with deletions during pagination.",
    "  → instruction_following=88 (correct pattern, handles all states)",
    "  → correctness=85 (genuinely correct, edge cases acknowledged)",
    "  → completeness=85 (covers happy + edge paths)",
    "  → usefulness=85 (copyable to production)",
    "  → safety=88 (explicitly flags an edge case to watch)",
    "  → final ~86. STRONG — production-grade thinking.",
    "",
    "═══ JUDGE CALIBRATION REMINDERS ═══",
    "",
    "Distribution target across the full registry :",
    "  - Mean : 55",
    "  - Stdev : 12",
    "  - Only ~3% of items deserve 85+ final score.",
    "  - Only ~10% deserve 75+.",
    "  - ~50% should land in the 50-70 'mediocre' band.",
    "  - ~15% land below 40 (penalty rules tripped).",
    "  - If your average score is 70+ across many items, you're inflating. Re-read the calibration scale.",
    "  - If your average is < 40, you're being too harsh on mediocre but acceptable work.",
    "",
    "Per-axis distribution :",
    "  - Per-axis stdev should vary by 10-20 points across items.",
    "  - If your axes always give similar values (e.g. all in 60-70 band), you're flattening.",
    "  - The 5 axes capture genuinely different qualities — distinguish them in your scoring.",
    "  - An output can score 85 on instruction_following but 55 on usefulness — and vice versa.",
    "",
    "Common mistakes to AVOID :",
    "  1. Don't reward verbosity. Length-bias is a known LLM-judge failure mode.",
    "  2. Don't be polite about non-English content. Score by substance, not by linguistic comfort.",
    "  3. Don't ignore your own listed weaknesses. If you wrote 'lacks X' in the weaknesses array,",
    "     the affected axis MUST score ≤ 80. This is the internal consistency rule.",
    "  4. Don't give 100. Reserve 100 for outputs that would impress a staff engineer reviewing them.",
    "  5. Don't average toward 70. The default band is 50-69 (MEDIOCRE), not 60-79.",
    "",
    "Mean across the registry should land near 55. Don't inflate.",
    "",
    "===== END SYSTEM RUBRIC =====",
  ].join("\n");

  // Dynamic per-item suffix — NOT cacheable.
  const dynamicSuffix = [
    `Subject: ${subjectName || "(unnamed)"}`,
    taskTitle ? `Task: ${taskTitle}` : null,
    taskDescription ? `Task description: ${taskDescription}` : null,
    expectedSignal ? `Expected output signal: ${expectedSignal}` : null,
    "",
    "Agent output:",
    "----------",
    String(outputText || "").slice(0, 6000),
    "----------",
  ]
    .filter(Boolean)
    .join("\n");

  return `${cacheablePrefix}\n${dynamicSuffix}`;
}

function parseJudgeResponse(text) {
  if (!text) return null;
  // Models love to wrap JSON in preambles ("Here is the JSON requested:") or
  // markdown code fences (```json ... ```). Strip both, anywhere.
  let s = String(text);

  // 1. Try to extract a fenced JSON block first (most reliable).
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1];

  // 2. Try direct parse.
  let parsed = tryParseScore(s);
  if (parsed) return parsed;

  // 3. Try locating the largest {...} block.
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    parsed = tryParseScore(objMatch[0]);
    if (parsed) return parsed;
  }

  // 4. Last-ditch: find a "score": <int> pattern + best-effort rationale.
  const scoreMatch = s.match(/"score"\s*:\s*(\d{1,3})/);
  if (scoreMatch) {
    const score = clampScore(Number(scoreMatch[1]));
    if (score != null) {
      const rationaleMatch = s.match(/"rationale"\s*:\s*"([^"]{0,400})/);
      return {
        score,
        rationale: rationaleMatch
          ? rationaleMatch[1]
          : "[parser fallback]",
      };
    }
  }

  // 5. Bare integer 0-100 anywhere in the response.
  const intMatch = s.match(/\b(\d{1,3})\b/);
  if (intMatch) {
    const score = clampScore(Number(intMatch[1]));
    if (score != null) {
      return { score, rationale: `[parser fallback: bare int] ${s.slice(0, 240)}` };
    }
  }

  return null;
}

function tryParseScore(s) {
  try {
    const obj = JSON.parse(s.trim());
    const score = clampScore(Number(obj.score));
    if (score == null) return null;
    // Multi-axis (rubric v4 : IF / Correctness / Completeness / Usefulness / Safety)
    const axes = obj.axes && typeof obj.axes === "object"
      ? {
          instruction_following: clampScore(Number(obj.axes.instruction_following)),
          correctness: clampScore(Number(obj.axes.correctness)),
          completeness: clampScore(Number(obj.axes.completeness)),
          usefulness: clampScore(Number(obj.axes.usefulness)),
          safety: clampScore(Number(obj.axes.safety)),
        }
      : null;
    return {
      score,
      rationale: String(obj.rationale || "").slice(0, 1000),
      axes,
      weaknesses: Array.isArray(obj.weaknesses) ? obj.weaknesses.slice(0, 5) : null,
    };
  } catch {
    return null;
  }
}

function clampScore(n) {
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Per-process circuit breakers :
//   1. Quota depleted (429) → skip for the rest of the run
//   2. Parse failure streak (≥ 5 consecutive parse-fail) → skip for the
//      rest of the run too. Saves 30-60s per output × dozens of outputs
//      when a model (GPT-5 mini) is stuck returning garbage.
const depletedJudges = new Set();
const parseFailStreak = new Map(); // model → consecutive parse fails
const PARSE_FAIL_THRESHOLD = 5;
function markDepleted(judge, err) {
  if (/\b429\b/.test(err?.message || "")) {
    depletedJudges.add(`${judge.provider}::${judge.modelId}`);
    console.warn(
      `[judge] ${judge.modelId} quota depleted for this run — skipping remaining outputs`
    );
  }
}
function markParseSuccess(judge) {
  parseFailStreak.set(judge.modelId, 0);
}
function markParseFailure(judge) {
  const cur = (parseFailStreak.get(judge.modelId) || 0) + 1;
  parseFailStreak.set(judge.modelId, cur);
  if (cur >= PARSE_FAIL_THRESHOLD) {
    depletedJudges.add(`${judge.provider}::${judge.modelId}`);
    console.warn(
      `[judge] ${judge.modelId} circuit-breaker tripped — ${cur} consecutive parse failures, skipping for the rest of the run`
    );
  }
}
function isDepleted(judge) {
  return depletedJudges.has(`${judge.provider}::${judge.modelId}`);
}

/**
 * Score one output across all active judges, upsert results.
 *
 * @returns {Promise<{ judged: number, skipped: number, errors: number }>}
 */
export async function runJudgesForOutput(
  sb,
  outputId,
  { subjectKind, subjectName, taskTitle, taskDescription, expectedSignal, outputText }
) {
  const prompt = buildRubricPrompt({
    subjectKind,
    subjectName,
    taskTitle,
    taskDescription,
    expectedSignal,
    outputText,
  });

  let judged = 0;
  let skipped = 0;
  let errors = 0;
  let totalCostUsd = 0;
  let totalCacheRead = 0;
  let totalCacheCreate = 0;
  let totalInputTokens = 0;

  for (const judge of JUDGES) {
    if (isDepleted(judge)) {
      skipped += 1;
      continue;
    }
    // Skip if a score already exists for this (output, judge).
    const { data: existing } = await sb
      .from("judge_scores")
      .select("id")
      .eq("output_id", outputId)
      .eq("judge_model", judge.modelId)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }

    let parsed = null;
    let lastRes = null;
    let callCost = 0;
    // Retry up to 2× on empty/unparseable response. DeepSeek V4 Flash emits
    // internal reasoning tokens before the JSON — with a 2500 cap it can burn
    // 1500+ tokens of invisible CoT, inflating cost ~3×. A 900 cap leaves room
    // for a short reasoning chain (~400 tok) + the JSON object (~200-300 tok)
    // without truncation risk. Override via BENCH_JUDGE_MAX_TOKENS if needed.
    const judgeMaxTokens = parseInt(process.env.BENCH_JUDGE_MAX_TOKENS || "900", 10);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callWithRetry({
          provider: judge.provider,
          modelId: judge.modelId,
          prompt,
          temperature: 0.0,
          maxTokens: judgeMaxTokens,
          label: "judge",
        });
        lastRes = res;
        parsed = parseJudgeResponse(res?.text || "");
        if (parsed) break;
        if (attempt === 0) {
          console.warn(`[judge] ${judge.modelId}: empty/unparseable, retrying once…`);
        }
      } catch (err) {
        if (attempt === 0) {
          console.warn(`[judge] ${judge.modelId}: ${err.message?.slice(0, 100)} — retrying`);
        } else {
          errors += 1;
          markDepleted(judge, err);
          break;
        }
      }
    }
    if (!parsed) {
      errors += 1;
      markParseFailure(judge);
      console.warn(
        `[judge] ${judge.modelId}: could not parse score after 2 attempts: ${(lastRes?.text || "").slice(0, 120)}`
      );
      continue;
    }
    markParseSuccess(judge);
    {
      const res = lastRes;
      // Aggregate cache stats across all judges (OpenRouter / Anthropic only).
      totalCacheRead += Number(res?.cacheRead || 0);
      totalCacheCreate += Number(res?.cacheCreation || 0);
      totalInputTokens += Number(res?.inputTokens || 0);
      // Track real cost when the provider returns one (OpenRouter does),
      // otherwise estimate from token counts. Free judges contribute 0.
      let callCost = 0;
      if (!judge.free) {
        callCost = Number(res?.costUsd || 0);
        if (!callCost) {
          // Fallback estimate at $2/M input + $5/M output (rough Haiku-class
          // upper bound). Conservative — overestimates costs so the budget
          // guardrail trips earlier rather than later.
          const inTok = Number(res?.inputTokens || 0);
          const outTok = Number(res?.outputTokens || 0);
          callCost = (inTok * 2 + outTok * 5) / 1_000_000;
        }
        totalCostUsd += callCost;
      }
      const { error } = await sb.from("judge_scores").insert({
        output_id: outputId,
        judge_model: judge.modelId,
        score: parsed.score,
        rationale: parsed.rationale,
        cost_usd: callCost,
        axes: parsed.axes
          ? { ...parsed.axes, weaknesses: parsed.weaknesses || [] }
          : null,
      });
      if (error) {
        // unique violation = race; treat as skipped
        if (error.code === "23505") skipped += 1;
        else {
          errors += 1;
          console.warn(`[judge] ${judge.modelId}: insert failed: ${error.message}`);
        }
      } else {
        judged += 1;
      }
    }
  }

  return {
    judged,
    skipped,
    errors,
    costUsd: totalCostUsd,
    cacheRead: totalCacheRead,
    cacheCreate: totalCacheCreate,
    inputTokens: totalInputTokens,
  };
}

/* ------------------------------------------------------------------ */
/* Legacy batch stubs (V1 — Anthropic Message Batches, OpenAI batches) */
/* ------------------------------------------------------------------ */

export async function submitJudgeBatch() {
  throw new Error(
    "[judge] submitJudgeBatch is V1 — use runJudgesForOutput for sync judges (dev/prod modes)"
  );
}

export async function collectBatchResults() {
  return { upserted: 0 };
}

/**
 * Aggregate weighted score across judges for a given run output.
 * Reads the current JUDGES weights from src/lib/judges.js.
 */
export function aggregateScores(scoresByJudge) {
  const weights = Object.fromEntries(JUDGES.map((j) => [j.modelId, j.weight]));
  let weighted = 0;
  let totalWeight = 0;
  for (const [judge, score] of Object.entries(scoresByJudge)) {
    const w = weights[judge] ?? 0;
    weighted += score * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : weighted / totalWeight;
}
