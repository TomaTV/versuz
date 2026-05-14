#!/usr/bin/env node
import "../_env.mjs";

/**
 * Quality judge — single-LLM rating of a SKILL.md or CLAUDE.md content.
 *
 * Why : the full bench engine (agent + 3 judges × N tasks) is expensive and
 * requires per-category task suites. For categories where we don't have
 * tasks (`other` skills + most CLAUDE.md), we still want SOME signal so the
 * leaderboard isn't empty.
 *
 * This script asks 1 LLM judge to rate the markdown content on 5 axes
 * (clarity / specificity / completeness / structure / usefulness) and
 * persists the average + rationale on the row.
 *
 * Cost : default = FREE (Gemini 2.5 Flash via Google AI Studio, 1500 RPD +
 * 1M tokens/jour). Plus fort que Groq Llama 4 Scout pour l'output JSON
 * structuré. Switchable to Groq (1000 RPD free) or OpenRouter (paid, no cap).
 *
 * Usage :
 *   node scripts/bench/quality-judge.mjs                            # both kinds, free Gemini Flash
 *   node scripts/bench/quality-judge.mjs --kind=skill               # skills only
 *   node scripts/bench/quality-judge.mjs --kind=claude_md           # claude_md only
 *   node scripts/bench/quality-judge.mjs --limit=20                 # cap items processed
 *   node scripts/bench/quality-judge.mjs --rejudge                  # re-judge already-scored items
 *   node scripts/bench/quality-judge.mjs --provider=groq            # free Groq (default)
 *   node scripts/bench/quality-judge.mjs --provider=openrouter      # paid, no daily cap
 *   node scripts/bench/quality-judge.mjs --fallback-provider=openrouter  # auto-switch when free tier exhausted
 *   node scripts/bench/quality-judge.mjs --model=<id>               # override default model
 */

import { createClient } from "@supabase/supabase-js";
import { callGroq } from "./providers/groq.mjs";
import { callGoogle } from "./providers/google.mjs";
import { callOpenRouter } from "./providers/openrouter.mjs";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const args = new Set(process.argv.slice(2));
const kindArg = process.argv.find((a) => a.startsWith("--kind="))?.split("=")[1];
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const modelArg = process.argv.find((a) => a.startsWith("--model="))?.split("=")[1];
const providerArg = process.argv.find((a) => a.startsWith("--provider="))?.split("=")[1];
const fallbackProviderArg = process.argv.find((a) => a.startsWith("--fallback-provider="))?.split("=")[1];
const REJUDGE = args.has("--rejudge");

const KINDS = kindArg ? [kindArg] : ["skill", "claude_md"];
const LIMIT = limitArg ? parseInt(limitArg, 10) : 1000;
const INITIAL_PROVIDER = (providerArg || process.env.QUALITY_JUDGE_PROVIDER || "groq").toLowerCase();
const FALLBACK_PROVIDER = (fallbackProviderArg || process.env.QUALITY_JUDGE_FALLBACK_PROVIDER || "openrouter").toLowerCase();

// Per-provider fallback chain. When the current model hits TPD (Tokens Per
// Day — not recoverable in the run), rotate to the next. Each Groq model
// has a SEPARATE daily quota, so 3 models = ~3x the effective capacity.
//
// Quality-judge stays a CHEAP single-LLM signal — the heavy ensemble
// (Haiku + DeepSeek + GPT-5 mini) belongs to the bench engine via
// `BENCH_MODE=or-v1`. Don't conflate the two.
const FALLBACK_CHAINS = {
  // Groq chain — verified working free-tier models. Each has its own ~1000 RPD
  // bucket so chaining gives effective ~3-4k RPD daily.
  groq: [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ],
  google: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  // OpenRouter chain — fast & cheap. Quality scoring doesn't need reasoning.
  openrouter: [
    "deepseek/deepseek-v4-flash",
    "mistralai/mistral-small-3.1-24b-instruct",
    "openai/gpt-5-nano",
  ],
};

let PROVIDER;
let PROVIDER_CHAIN;
let MODELS;
let exhaustedModels;
let rrCursor;
let REQUIRED_KEY;
let THROTTLE_MS;

function configureProvider(name) {
  const chain = FALLBACK_CHAINS[name];
  if (!chain) {
    throw new Error(`[quality-judge] unknown provider="${name}" (expected: groq|google|openrouter)`);
  }
  PROVIDER = name;
  PROVIDER_CHAIN = chain;
  MODELS = (() => {
    if (modelArg) return modelArg.split(",").map((s) => s.trim()).filter(Boolean);
    if (process.env.QUALITY_JUDGE_MODELS) return process.env.QUALITY_JUDGE_MODELS.split(",").map((s) => s.trim()).filter(Boolean);
    if (process.env.QUALITY_JUDGE_MODEL) return [process.env.QUALITY_JUDGE_MODEL];
    return PROVIDER_CHAIN;
  })();
  exhaustedModels = new Set();
  rrCursor = 0;
  REQUIRED_KEY = {
    groq: "GROQ_API_KEY",
    google: "GOOGLE_AI_STUDIO_KEY",
    openrouter: "OPENROUTER_API_KEY",
  }[PROVIDER];
  THROTTLE_MS = { groq: 2500, google: 4500, openrouter: 220 }[PROVIDER];

  const key = process.env[REQUIRED_KEY];
  if (!key) {
    throw new Error(`[quality-judge] missing ${REQUIRED_KEY} (provider=${PROVIDER})`);
  }
  return true;
}

configureProvider(INITIAL_PROVIDER);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("[quality-judge] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

function pickModel() {
  for (let i = 0; i < MODELS.length; i++) {
    const m = MODELS[rrCursor % MODELS.length];
    rrCursor = (rrCursor + 1) % MODELS.length;
    if (!exhaustedModels.has(m)) return m;
  }
  return null; // all exhausted → caller stops
}

async function callProviderRaw(opts) {
  const { modelId, prompt, temperature, maxTokens } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const callOpts = { modelId, prompt, temperature, maxTokens, signal: ctrl.signal };

  try {
    if (PROVIDER === "groq") return await callGroq(callOpts);
    if (PROVIDER === "google") return await callGoogle(callOpts);
    return await callOpenRouter({ ...callOpts, enableCaching: false });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap callProviderRaw with 429-aware retry + model rotation.
 *
 * Distinguishes 4 error flavors :
 *   - TPM/RPM (tokens/requests per minute) → recoverable in seconds, sleep + retry
 *   - TPD (tokens per DAY) → not recoverable, mark model exhausted, switch
 *   - Network / timeout / ECONNRESET → retry same model with backoff
 *   - Other (4xx/5xx non-429) → throw immediately (likely bad prompt / key)
 *
 * Returns null if all models in MODELS are exhausted (TPD). Caller
 * should stop the run gracefully — re-run tomorrow when daily quota resets.
 */
async function callProvider(opts) {
  const MAX_RETRIES_PER_MODEL = 3;
  const MAX_NETWORK_RETRIES = 2;
  while (true) {
    const modelId = pickModel();
    if (!modelId) {
      throw new Error("ALL_MODELS_EXHAUSTED");
    }
    let lastErr;
    let modelSwitched = false;
    let netRetries = 0;
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const out = await callProviderRaw({ ...opts, modelId });
        return { ...out, modelUsed: modelId };
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || "");
        const lower = msg.toLowerCase();

        // 1) Network / timeout / connection reset → retry with backoff (NOT switch model)
        const isNetwork =
          err.name === "AbortError" ||
          err.code === "ECONNRESET" ||
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNREFUSED" ||
          /abort|timeout|reset|refused|socket|network/i.test(lower);
        if (isNetwork) {
          if (netRetries >= MAX_NETWORK_RETRIES) {
            console.warn(`  ↳ ${modelId} network timeout after ${MAX_NETWORK_RETRIES} retries — switching model`);
            exhaustedModels.add(modelId);
            modelSwitched = true;
            break;
          }
          netRetries++;
          const waitMs = Math.min(5000 * netRetries, 20000);
          console.warn(`  ↳ ${modelId} network issue, sleeping ${waitMs / 1000}s (net retry ${netRetries}/${MAX_NETWORK_RETRIES})`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        // 2) Rate limit 429
        const is429 = msg.includes("429") || lower.includes("rate limit") || lower.includes("too many requests");
        if (!is429) throw err; // non-retryable error (bad key, bad request, etc.)

        // Detect TPD ("tokens per day") — switch model immediately
        const isTPD = /tokens per day|tokens per d|tpd|daily|quota exceeded/i.test(msg);
        if (isTPD) {
          console.warn(`  ↳ ${modelId} TPD exhausted — switching model`);
          exhaustedModels.add(modelId);
          modelSwitched = true;
          break;
        }
        if (attempt === MAX_RETRIES_PER_MODEL) {
          // Treat persistent 429 as exhausted to move on
          console.warn(`  ↳ ${modelId} persistent 429 after ${MAX_RETRIES_PER_MODEL} retries — marking exhausted`);
          exhaustedModels.add(modelId);
          modelSwitched = true;
          break;
        }
        // Try to extract "Please try again in 12.34s" hint
        const m = msg.match(/try again in ([\d.]+)\s*s/i);
        const hintMs = m ? Math.min(Math.max(parseFloat(m[1]) * 1000 + 500, 5000), 65000) : 0;
        const waitMs = hintMs || Math.min(15000 * (attempt + 1), 65000);
        console.warn(`  ↳ ${modelId} 429 (TPM/RPM), sleeping ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL})`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    if (!modelSwitched) throw lastErr;
    // loop continues — picks next non-exhausted model
  }
}

// Throttle between calls — respect each provider's free-tier RPM.
//   groq: 4-model round-robin. GPT-OSS 120B has a lower RPM cap than the
//         Llamas, so we go conservative at 2500ms → each model is called
//         every ~10s = 6 RPM/model, well under any free-tier ceiling.
//   google: 15 RPM => ~4500ms safe
//   openrouter: paid, 5 RPS => ~220ms
// NOTE: THROTTLE_MS is now set dynamically by configureProvider().

// Network / fetch timeout — prevents indefinite hangs when a provider stalls.
const FETCH_TIMEOUT_MS = 30_000;

// Resume checkpoint file — if the script crashes mid-run, restarting will skip
// already-judged items (identified by id + kind) and retry only failures.
const CHECKPOINT_PATH = join(process.cwd(), ".quality-judge-checkpoint.json");

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return { done: new Set(), failed: [] };
  try {
    const raw = JSON.parse(readFileSync(CHECKPOINT_PATH, "utf-8"));
    return {
      done: new Set(raw.done || []),
      failed: raw.failed || [],
    };
  } catch {
    return { done: new Set(), failed: [] };
  }
}

function saveCheckpoint(doneSet, failedArr) {
  try {
    writeFileSync(
      CHECKPOINT_PATH,
      JSON.stringify({ done: Array.from(doneSet), failed: failedArr.slice(-500) }, null, 2)
    );
  } catch {}
}

const checkpoint = loadCheckpoint();

const RUBRIC = `You are a HARSH editor reviewing markdown for AI agent consumption. Most files are mediocre — score them honestly. The distribution of your scores across 100 files should look like a normal curve with mean ~65 and stdev ~12. Only ~5% deserve 85+, only ~1% deserve 90+.

LANGUAGE RULE : score with the same strictness regardless of language (English, Chinese, French, etc.). Do NOT inflate scores for non-English content out of politeness.

CALIBRATION SCALE :
- 90-100 = EXCEPTIONAL — canonical reference. Top 1%. Almost never give this.
- 80-89  = STRONG — clearly above average, concrete, well-edited, minor gaps. Top 10%.
- 70-79  = GOOD — useful and competent but has noticeable gaps or vague spots. Top third.
- 60-69  = MEDIOCRE — usable but thin, generic, or partially confused. THIS IS THE DEFAULT BAND.
- 40-59  = POOR — major gaps, vague advice, hard to follow, or content too short.
- 0-39   = BROKEN — incomplete, incoherent, or unusable.

HARD PENALTY RULES — apply these BEFORE scoring, no exceptions :
A. File under 100 lines                                          → MAX completeness = 70
B. References ANY external file not bundled (e.g. "see template.md", "see references/X.md", "scripts/render.py", "voir templates/Y.md", "参见 X.md") → MAX completeness = 65, MAX usefulness = 75
C. Just an endpoint/tool list with no auth / no errors / no usage examples → MAX usefulness = 70
D. Lacks ANY runnable command or code block                      → MAX specificity = 65
E. Repetitive content (same info restated in 3+ places, version-history clutter, marketing fluff) → -10 on clarity
F. Mixes 2+ languages randomly mid-sentence                      → -10 on clarity

REFERENCE BENCHMARKS — use these as anchors :
- "40-line API endpoint list, no auth, no examples" : clarity 75, spec 60, completeness 50, structure 75, usefulness 60 (avg ~64)
- "200-line skill with multi-PM install + working code blocks + env vars + safety model" : clarity 85, spec 88, completeness 82, structure 88, usefulness 86 (avg ~86 — STRONG)
- "Workflow skill that references 4 external templates not bundled" : MAX completeness 65 + MAX usefulness 75 → avg ~70
- "Verbose Chinese skill referencing external Python scripts + version history clutter + GUI .bat docs" : -10 clarity (rule E), max completeness 65 (rule B), max usefulness 75 (rule B) → avg ~70

OUTPUT FORMAT — JSON ONLY, in this EXACT order so you think about flaws first :
{
  "weaknesses": ["specific issue 1 in English", "specific issue 2 in English"],
  "applicable_penalty_rules": ["A"|"B"|"C"|"D"|"E"|"F", ...],
  "clarity": 0-100,
  "specificity": 0-100,
  "completeness": 0-100,
  "structure": 0-100,
  "usefulness": 0-100,
  "rationale": "1-2 sentences in English — must reference the weaknesses identified"
}

ANTI-FLATTENING REQUIREMENT — CRITICAL :
The 5 axes capture DIFFERENT qualities. They MUST disagree by 5-15 points on a real file.
- A 200-line file with great structure but no examples = structure 85, specificity 55. NOT both 70.
- A code-heavy file with bad markdown = clarity 50, usefulness 80. NOT both 65.
- Giving 4+ axes the SAME value is a signal of lazy evaluation. Look harder, the rubric demands per-axis judgment.
- Variance across axes is the WHOLE POINT — flatten = useless score.

Be honest. A file that scores 65 on average is FINE — that's the median. Don't try to be encouraging.`;

function buildPrompt({ kind, name, content }) {
  const header =
    kind === "skill"
      ? `===== SKILL.md (name: ${name || "unknown"}) =====`
      : `===== CLAUDE.md (project: ${name || "unknown"}) =====`;
  // Truncate aggressively : 3500 chars (~900 tokens) suffit pour les 5 axes
  // et garde le total prompt sous le TPM cap Groq (30k TPM).
  const trimmed = (content || "").slice(0, 3500);
  return [
    "You are a strict but fair AI code-quality reviewer.",
    header,
    trimmed,
    "===== END =====",
    RUBRIC,
  ].join("\n\n");
}

function parseScore(text) {
  if (!text) return null;
  const axes = ["clarity", "specificity", "completeness", "structure", "usefulness"];
  // Strip markdown fences and common AI preamble patterns
  let cleaned = String(text)
    .replace(/```(?:json)?\s*|\s*```/g, "")
    .replace(/^\s*(?:Here is|Here are|Below is|Sure[,.!]|Okay[,.!]|Alright[,.!]|The JSON is|JSON[,:])\s*/im, "");

  const tryObj = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const vals = axes.map((a) => Number(obj[a])).filter((n) => Number.isFinite(n));
    if (vals.length < 3) return null;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return {
      score: Math.round(avg * 100) / 100,
      rationale: String(obj.rationale || "").slice(0, 800),
      breakdown: Object.fromEntries(axes.map((a) => [a, Number(obj[a]) || null])),
    };
  };

  // 1. Try the full cleaned text as JSON
  try {
    const parsed = tryObj(JSON.parse(cleaned));
    if (parsed) return parsed;
  } catch {}

  // 2. Try the largest balanced {...} substring (handles preamble/postamble + trailing text)
  let start = -1, depth = 0, bestStart = -1, bestEnd = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        bestStart = start;
        bestEnd = i;
      }
    }
  }
  if (bestStart >= 0 && bestEnd > bestStart) {
    try {
      const parsed = tryObj(JSON.parse(cleaned.slice(bestStart, bestEnd + 1)));
      if (parsed) return parsed;
    } catch {}
  }

  // 3. Regex-extract each axis individually — robust to malformed/truncated JSON
  const extract = (key) => {
    // Support both "key": 42 and 'key': 42 (some models emit single quotes)
    const m = cleaned.match(new RegExp(`["']${key}["']\\s*:\\s*(\\d{1,3}(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : null;
  };
  const extracted = Object.fromEntries(axes.map((a) => [a, extract(a)]));
  const vals = axes.map((a) => extracted[a]).filter((n) => Number.isFinite(n));
  if (vals.length >= 3) {
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    // Robust rationale extraction: handle escaped quotes inside the string
    // Match "rationale": "..." where ... may contain \" escapes
    const ratRe = /"rationale"\s*:\s*"((?:[^"\\]|\\.){0,800})/;
    const ratM = cleaned.match(ratRe);
    return {
      score: Math.round(avg * 100) / 100,
      rationale: ratM ? ratM[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').slice(0, 800) : "[regex fallback parse]",
      breakdown: extracted,
    };
  }

  return null;
}

async function loadCandidates(kind) {
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const sel =
    kind === "skill"
      ? "id, slug, name, skill_md_content, content_path, quality_score"
      : "id, slug, content, content_path, metadata, quality_score";
  let q = sb.from(table).select(sel).limit(LIMIT);
  if (!REJUDGE) q = q.is("quality_score", null);
  const { data, error } = await q;
  if (error) throw new Error(`${table} load: ${error.message}`);
  return (data || [])
    .filter((r) => {
      // Skip items already done in a previous interrupted run
      if (checkpoint.done.has(`${kind}:${r.id}`)) return false;
      return true;
    })
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name:
        kind === "skill"
          ? r.name
          : r.metadata?.author && r.metadata?.repo
            ? `${r.metadata.author}/${r.metadata.repo}`
            : r.slug,
      // Inline content is the legacy column (skill_md_content / content),
      // typically NULL post-migration 0042. The actual body lives in
      // Storage bucket `content` at `content_path`. resolveContent() in
      // judgeOne falls back to fetching from Storage when inline is empty.
      content: kind === "skill" ? r.skill_md_content : r.content,
      contentPath: r.content_path || null,
    }));
}

// Inline equivalent of src/lib/content/storage.js#fetchContentByPath
// (kept local to avoid importing Next.js-flavored modules into a Node
// script). Bucket `content` is public, so no auth needed for the fetch.
//
// Returns { text, error }. text=null when fetch failed — error string lets
// the caller report the REAL reason instead of masking it as
// "content too short" (which was the historical bug : Storage 429/503 or
// transient network reset → null → false-positive skip).
const STORAGE_BUCKET = "content";
async function fetchFromStorage(path) {
  if (!path) return { text: null, error: "no content_path" };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { text: null, error: "no NEXT_PUBLIC_SUPABASE_URL" };
  const url = `${base.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  const MAX_TRIES = 3;
  let lastErr = "unknown";
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        return { text, error: null };
      }
      lastErr = `storage HTTP ${res.status}`;
      // 4xx (except 429) is permanent — don't retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (err) {
      clearTimeout(timer);
      lastErr = `storage fetch: ${err.code || err.name || err.message || "unknown"}`;
    }
    if (attempt < MAX_TRIES) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return { text: null, error: lastErr };
}

async function resolveItemContent(item) {
  if (typeof item.content === "string" && item.content.length > 0) {
    return { text: item.content, error: null };
  }
  if (item.contentPath) {
    return await fetchFromStorage(item.contentPath);
  }
  return { text: null, error: "no inline content and no content_path" };
}

async function judgeOne({ kind, item }) {
  // Storage fallback : post-migration 0042, content lives in the public
  // `content` bucket. The inline column is NULL for most rows.
  const { text: body, error: resolveErr } = await resolveItemContent(item);
  if (!body) {
    return { error: resolveErr || "no content resolved" };
  }
  if (body.length < 50) {
    return { error: `content too short (${body.length} chars)` };
  }
  const prompt = buildPrompt({ kind, name: item.name, content: body });
  let res;
  try {
    // callProvider injects modelId from the fallback chain. maxTokens 1500
    // gives buffer for reasoning models (GPT-OSS, R1-distill) which burn
    // thinking tokens before emitting the JSON. Non-reasoning models just
    // use ~600 of the 1500, no overhead.
    res = await callProvider({
      prompt,
      temperature: 0.0,
      maxTokens: 1500,
    });
  } catch (err) {
    return { error: err.message };
  }
  const parsed = parseScore(res?.text || "");
  if (!parsed) return { error: "could not parse JSON" };
  return { ...parsed, modelUsed: res.modelUsed || pickModel() || MODELS[0] };
}

async function persist({ kind, item, parsed }) {
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { error } = await sb
    .from(table)
    .update({
      quality_score: parsed.score,
      quality_rationale: parsed.rationale,
      quality_judged_at: new Date().toISOString(),
      quality_judge_model: parsed.modelUsed || MODELS[0],
    })
    .eq("id", item.id);
  if (error) throw new Error(`${table} update ${item.slug}: ${error.message}`);
}

async function processKind(kind) {
  console.log(`[quality-judge] loading ${kind} candidates…`);
  const candidates = await loadCandidates(kind);
  console.log(`[quality-judge] ${candidates.length} ${kind}(s) to judge`);

  let ok = 0;
  let fail = 0;
  const localFailed = [];

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    const key = `${kind}:${item.id}`;
    process.stdout.write(`[${i + 1}/${candidates.length}] ${kind} ${item.slug.slice(0, 40)} … `);
    const r = await judgeOne({ kind, item });
    if (r.error === "ALL_MODELS_EXHAUSTED") {
      console.log(`SKIP (all models hit TPD — stopping run, retry tomorrow)`);
      fail += 1;
      checkpoint.failed.push({ kind, id: item.id, slug: item.slug, error: "ALL_MODELS_EXHAUSTED", at: new Date().toISOString() });
      saveCheckpoint(checkpoint.done, checkpoint.failed);
      return { ok, fail, exhausted: true };
    }
    if (r.error) {
      console.log(`SKIP (${r.error})`);
      fail += 1;
      localFailed.push({ kind, id: item.id, slug: item.slug, error: r.error });
      continue;
    }
    try {
      await persist({ kind, item, parsed: r });
      console.log(`${r.score}`);
      ok += 1;
      checkpoint.done.add(key);
    } catch (err) {
      console.log(`DB ERR ${err.message}`);
      fail += 1;
      localFailed.push({ kind, id: item.id, slug: item.slug, error: `DB: ${err.message}` });
    }
    // Save checkpoint every 25 items so a crash doesn't lose all progress
    if ((ok + fail) % 25 === 0) {
      saveCheckpoint(checkpoint.done, checkpoint.failed);
    }
    await new Promise((res) => setTimeout(res, THROTTLE_MS));
  }

  // Append local failures to global checkpoint
  if (localFailed.length) {
    checkpoint.failed.push(...localFailed.map((f) => ({ ...f, at: new Date().toISOString() })));
    saveCheckpoint(checkpoint.done, checkpoint.failed);
  }
  return { ok, fail };
}

(async () => {
  console.log(`[quality-judge] provider=${PROVIDER} · models=[${MODELS.join(", ")}] · kinds=${KINDS.join(",")} · limit=${LIMIT} · rejudge=${REJUDGE} · fallback=${FALLBACK_PROVIDER}`);
  let totalOk = 0;
  let totalFail = 0;
  let stopEarly = false;
  for (const k of KINDS) {
    if (stopEarly) break;
    let result = await processKind(k);
    totalOk += result.ok;
    totalFail += result.fail;

    // Cross-provider fallback: when all models of the current provider are
    // exhausted (TPD), auto-switch to the fallback provider and continue
    // judging the SAME kind. Already-judged items are skipped via checkpoint.
    if (result.exhausted && FALLBACK_PROVIDER && FALLBACK_PROVIDER !== PROVIDER) {
      try {
        configureProvider(FALLBACK_PROVIDER);
        console.log(`\n[quality-judge] ↺ switching to fallback provider "${FALLBACK_PROVIDER}" · models=[${MODELS.join(", ")}]\n`);
        const retry = await processKind(k);
        totalOk += retry.ok;
        totalFail += retry.fail;
        if (retry.exhausted) stopEarly = true;
      } catch (err) {
        console.warn(`[quality-judge] fallback provider "${FALLBACK_PROVIDER}" unavailable: ${err.message}`);
        stopEarly = true;
      }
    } else if (result.exhausted) {
      stopEarly = true;
    }
  }
  console.log("");
  console.log(`[quality-judge] DONE · ${totalOk} judged · ${totalFail} skipped/failed`);
})().catch((err) => {
  console.error(`[quality-judge] FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
