#!/usr/bin/env node
import "../_env.mjs";
/**
 * Quick smoke test for the bench agent.
 *
 *   npm run bench:agent-smoke
 *
 * Runs the configured agent (Gemini 2.5 Flash by default) on a fake skill
 * + a fake task. No Supabase needed. Validates the prompt template, the
 * provider call, and that we get back something coherent.
 */

import { runAgent, DEFAULT_PROVIDER, DEFAULT_MODEL } from "./agent.mjs";

const FAKE_SKILL = `---
name: pdf-extract-quick
description: Extract structured data from PDF invoices.
tools: ["read", "write"]
---

# PDF extraction

You are an expert at extracting structured data from invoice PDFs.

When given an invoice description, output strict JSON with:
- vendor: string
- invoice_number: string
- issue_date: ISO date
- line_items: [{ description, qty, unit_price, total }]

Never invent values. If a field is missing, output null.`;

const FAKE_TASK = {
  title: "Extract from a small invoice",
  description: "Given a textual representation of an invoice, return the structured JSON described in the SKILL.md.",
  input_data: {
    invoice_text: "Invoice from Acme Inc.\nInvoice #2026-001\nDate: 2026-05-10\nLine: Widget x 2 @ 19.99 = 39.98\nLine: Gizmo x 1 @ 49.00 = 49.00\nTotal: 88.98",
  },
};

async function main() {
  console.log(`[agent-smoke] provider=${DEFAULT_PROVIDER} model=${DEFAULT_MODEL}`);
  console.log("[agent-smoke] running fake skill on fake task…");

  const t0 = Date.now();
  const result = await runAgent({
    subjectKind: "skill",
    subjectContent: FAKE_SKILL,
    taskInput: FAKE_TASK.input_data,
    taskTitle: FAKE_TASK.title,
    taskDescription: FAKE_TASK.description,
  });
  const ms = Date.now() - t0;

  console.log(`[agent-smoke] OK · ${ms}ms · model=${result.model} · cost=$${result.cost_usd.toFixed(4)}`);
  console.log("─".repeat(72));
  console.log(result.text);
  console.log("─".repeat(72));
}

main().catch((err) => {
  console.error(`[agent-smoke] FAIL: ${err.stack || err.message}`);
  process.exit(1);
});
