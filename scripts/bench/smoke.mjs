#!/usr/bin/env node
import "../_env.mjs";
/**
 * Smoke test for the bench engine.
 *
 *   npm run bench:smoke
 *
 * Sends a tiny scoring prompt to each currently-active judge and prints the
 * result. No DB, no scraping, no real tasks — just verifies the providers
 * + API keys + JSON parsing work end-to-end.
 *
 * If you see "OK" for all 3 judges, the dev pipeline is healthy.
 */

import { JUDGES, JUDGE_MODE } from "../../src/lib/judges.js";
import { judgeOutput } from "./judge-call.mjs";

const FAKE_TASK = {
  slug: "smoke",
  title: "Smoke test — judge basic format",
  description: "Score this candidate output. It's a literal string, not a real task.",
  rubric: "Score 90+ if the candidate is non-empty and looks like text. Score 0 if empty.",
};

const FAKE_OUTPUT =
  "The 2026 study on document extraction found that table fidelity remains the hardest metric.";

async function main() {
  console.log(`[smoke] mode=${JUDGE_MODE} · ${JUDGES.length} judges to test\n`);

  let ok = 0;
  let failed = 0;

  for (const judge of JUDGES) {
    process.stdout.write(`  ${judge.id} (${judge.provider}) … `);
    const start = Date.now();
    try {
      const r = await judgeOutput({ judge, task: FAKE_TASK, output: FAKE_OUTPUT });
      const ms = Date.now() - start;
      console.log(
        `OK · score=${r.score}/100 · ${r.inputTokens}+${r.outputTokens} tok · ${ms}ms`
      );
      console.log(`     "${(r.rationale || "").slice(0, 120)}${r.rationale.length > 120 ? "…" : ""}"\n`);
      ok += 1;
    } catch (err) {
      console.log(`FAIL · ${err.message}\n`);
      failed += 1;
    }
  }

  console.log(`[smoke] ${ok} OK · ${failed} FAIL`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(`[smoke] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
