#!/usr/bin/env node
import "./_env.mjs";
/**
 * Task generator — drafts task_proposals via Gemini 2.5 Flash (free).
 *
 * Usage:
 *   node scripts/generate-tasks.mjs --kind=skill --category=document --count=10
 *   node scripts/generate-tasks.mjs --kind=claude_md --category=nextjs --count=10
 *   node scripts/generate-tasks.mjs --all
 *   node scripts/generate-tasks.mjs --dry-run --kind=skill --category=document
 *
 * Writes to `task_proposals` (status='pending'). Promote good ones manually
 * into `tasks` after review.
 */

import { createClient } from "@supabase/supabase-js";
import { callGoogle } from "./bench/providers/google.mjs";

const SKILL_CATEGORIES = ["document", "sql", "data", "web", "shell", "code"];
const CLAUDE_MD_CATEGORIES = [
  "nextjs",
  "react",
  "python-data",
  "backend-api",
  "mobile",
  "devops",
  "ml-training",
  "generic",
];

const MODEL = "gemini-2.5-flash";

function parseArgs(argv) {
  const out = { kind: null, category: null, count: 10, dryRun: false, all: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--all") out.all = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
    else if (a.startsWith("--category=")) out.category = a.slice(11);
    else if (a.startsWith("--count=")) out.count = Number(a.slice(8)) || 10;
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function promptForKindCategory(kind, category, count) {
  const focus =
    kind === "skill"
      ? `evaluate the quality of an AI agent SKILL.md (a markdown file describing a Claude Code / Codex CLI / Cursor skill) executing real-world ${category} work`
      : `evaluate how much an AI agent CLAUDE.md project context file improves agent output on real ${category} engineering tasks`;

  const exampleTask =
    kind === "skill"
      ? {
          title: "Extract structured invoice data from a multi-page PDF",
          description:
            "Given a 4-page scanned invoice PDF, the skill must extract line items (description, qty, unit_price, total), the vendor name, the invoice number, and the issue date.",
          input_data: {
            file: "invoice-acme-2026-01.pdf",
            extra_instructions: "Output strict JSON with fields: vendor, invoice_number, issue_date, line_items[]",
          },
          expected_output_signal: "JSON contains all 4 line items with correct totals; no fabricated fields",
          difficulty: "medium",
        }
      : {
          title: "Bootstrap a Next.js 16 App Router project with auth",
          description:
            "An agent reading the CLAUDE.md should produce a working Next.js 16 (App Router) project with Supabase Auth, Server Actions, and one protected route — without ambiguity or rework.",
          input_data: {
            requirements: "Next.js 16 + Supabase Auth + GitHub OAuth + one protected page",
          },
          expected_output_signal: "Agent produces a runnable scaffold; doesn't ask clarifying questions about RSC vs client",
          difficulty: "medium",
        };

  return `You are designing realistic benchmark tasks to ${focus}.

Output ONLY a JSON array of ${count} task objects. Each object must have:
- "title": short imperative (under 80 chars)
- "description": 1-3 sentences describing the task
- "input_data": object with whatever inputs the agent needs (file paths, code snippets, requirements list, etc.)
- "expected_output_signal": one sentence describing what a passing answer looks like (NOT the answer itself — just the signal a judge looks for)
- "difficulty": "easy" | "medium" | "hard"

Constraints:
- Tasks must be concrete and reproducible.
- Mix easy/medium/hard (roughly 30/50/20).
- Avoid trivia. Avoid tasks that depend on private data.
- Use varied scenarios — don't generate ${count} variations of the same task.

Example shape (do not copy verbatim, generate fresh tasks for category="${category}"):
${JSON.stringify(exampleTask, null, 2)}

Return only the JSON array. No markdown code fences, no commentary.`;
}

function safeParseJson(raw) {
  if (!raw) return null;
  // Strip code fences if Gemini ignores the instruction
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first array/object in the string
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generateForCategory(kind, category, count) {
  const prompt = promptForKindCategory(kind, category, count);
  const { text, outputTokens } = await callGoogle({
    modelId: MODEL,
    prompt,
    temperature: 0.7,
    maxTokens: 4096,
  });
  const parsed = safeParseJson(text);
  if (!Array.isArray(parsed)) {
    console.warn(
      `[generate-tasks] ${kind}/${category}: failed to parse — raw output (first 200 chars): ${text.slice(0, 200)}`
    );
    return [];
  }
  return parsed
    .filter((t) => t && typeof t === "object" && t.title && t.description)
    .map((t) => ({
      subject_kind: kind,
      category,
      title: String(t.title).slice(0, 200),
      description: String(t.description).slice(0, 1000),
      input_data: t.input_data && typeof t.input_data === "object" ? t.input_data : {},
      expected_output_signal: t.expected_output_signal
        ? String(t.expected_output_signal).slice(0, 500)
        : null,
      difficulty: ["easy", "medium", "hard"].includes(t.difficulty) ? t.difficulty : "medium",
      source_model: MODEL,
      status: "pending",
      _outputTokens: outputTokens,
    }));
}

async function main() {
  const args = parseArgs(process.argv);
  const sb = args.dryRun ? null : makeSupabase();

  let targets = [];
  if (args.all) {
    for (const c of SKILL_CATEGORIES) targets.push({ kind: "skill", category: c });
    for (const c of CLAUDE_MD_CATEGORIES) targets.push({ kind: "claude_md", category: c });
  } else {
    if (!args.kind || !args.category) {
      console.error(
        "[generate-tasks] --kind=<skill|claude_md> --category=<id> required (or --all)"
      );
      process.exit(1);
    }
    targets = [{ kind: args.kind, category: args.category }];
  }

  let total = 0;
  for (const t of targets) {
    console.log(`[generate-tasks] ${t.kind}/${t.category} · drafting ${args.count} tasks…`);
    let rows = [];
    try {
      rows = await generateForCategory(t.kind, t.category, args.count);
    } catch (err) {
      console.warn(`[generate-tasks] ${t.kind}/${t.category} failed: ${err.message}`);
      continue;
    }
    if (!rows.length) {
      console.warn(`[generate-tasks] ${t.kind}/${t.category}: 0 tasks parsed`);
      continue;
    }
    console.log(`[generate-tasks]   parsed ${rows.length} tasks`);
    total += rows.length;
    if (args.dryRun) {
      console.log(JSON.stringify(rows.slice(0, 2), null, 2));
      continue;
    }
    if (!sb) {
      console.warn("[generate-tasks] Supabase env missing, skipping insert");
      continue;
    }
    const insertRows = rows.map(({ _outputTokens, ...r }) => r);
    const { error } = await sb.from("task_proposals").insert(insertRows);
    if (error) {
      console.warn(`[generate-tasks] insert failed: ${error.message}`);
    } else {
      console.log(`[generate-tasks]   inserted ${insertRows.length} rows`);
    }
  }
  console.log(`[generate-tasks] done · ${total} tasks generated total`);
}

main().catch((err) => {
  console.error(`[generate-tasks] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
