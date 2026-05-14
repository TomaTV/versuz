#!/usr/bin/env node
import "./_env.mjs";

/**
 * Versuz full pipeline — scrape → quality → bench
 *
 * Usage:
 *   npm run pipeline:full              # run with defaults
 *   npm run pipeline:full -- --min-stars=0 --dry-run
 *
 * Flow:
 *   1. Scrape via Sourcegraph (exhaustive mode, all niches)
 *   2. Quality judge newly scraped items (5-axis LLM rating)
 *   3. Bench cycle (enqueue + run full cycle)
 *
 * This is designed to run overnight or on a schedule (cron).
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function runScript(name, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${name}] starting…`);
    const start = Date.now();

    const child = spawn(
      "node",
      [join(__dirname, name), ...args],
      { stdio: "inherit", shell: false }
    );

    child.on("close", (code) => {
      const duration = ((Date.now() - start) / 60000).toFixed(1);
      if (code !== 0) {
        console.error(`[${name}] failed after ${duration}min (exit ${code})`);
        reject(new Error(`${name} exited ${code}`));
      } else {
        console.log(`[${name}] completed in ${duration}min`);
        resolve();
      }
    });

    child.on("error", (err) => {
      console.error(`[${name}] spawn error: ${err.message}`);
      reject(err);
    });
  });
}

function parseArgs(argv) {
  const out = {
    minStars: "50",
    dryRun: false,
    skipScrape: false,
    skipQuality: false,
    skipBench: false,
  };
  for (const tok of argv) {
    if (tok === "--dry-run") out.dryRun = true;
    else if (tok === "--skip-scrape") out.skipScrape = true;
    else if (tok === "--skip-quality") out.skipQuality = true;
    else if (tok === "--skip-bench") out.skipBench = true;
    else if (tok.startsWith("--min-stars=")) out.minStars = tok.split("=")[1];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Versuz Full Pipeline — scrape → quality → bench");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  min-stars: ${args.minStars}`);
  console.log(`  dry-run: ${args.dryRun}`);
  console.log("");

  const startTime = Date.now();

  try {
    // 1. SCRAPE (exhaustive mode)
    if (!args.skipScrape) {
      const scrapeArgs = [
        "--mode=exhaustive",
        `--min-stars=${args.minStars}`,
      ];
      if (args.dryRun) scrapeArgs.push("--dry-run");

      await runScript("scrape-codesearch/index.mjs", scrapeArgs);
    } else {
      console.log("[scrape] skipped ( --skip-scrape )");
    }

    // 2. QUALITY JUDGE (new items only)
    if (!args.skipQuality) {
      // quality-judge auto-resumes and skips already judged items via checkpoint
      const qualityArgs = [];
      if (args.dryRun) qualityArgs.push("--dry-run");

      await runScript("bench/quality-judge.mjs", qualityArgs);
    } else {
      console.log("[quality] skipped ( --skip-quality )");
    }

    // 3. BENCH (full cycle)
    if (!args.skipBench && !args.dryRun) {
      // First enqueue a cycle for pending items
      await runScript("bench/enqueue-cycle.mjs", []);
      // Then run the full bench
      await runScript("bench/full.mjs", []);
    } else if (args.dryRun) {
      console.log("[bench] skipped (dry-run)");
    } else {
      console.log("[bench] skipped ( --skip-bench )");
    }

    const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ✅ Pipeline completed in ${totalMin} minutes`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (err) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`  ❌ Pipeline failed: ${err.message}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[pipeline] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
