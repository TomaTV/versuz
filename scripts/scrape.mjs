#!/usr/bin/env node
import "./_env.mjs";

/**
 * Versuz unified scraper — single entry point that orchestrates the 4
 * source adapters in series, so you can launch ONE command instead of
 * juggling parallel `npm run scrape:*` that hammer the DB.
 *
 * Usage :
 *   node scripts/scrape.mjs                              # all sources, both kinds
 *   node scripts/scrape.mjs --source=github              # GitHub Code Search only
 *   node scripts/scrape.mjs --source=aggregators         # awesome-list curated only
 *   node scripts/scrape.mjs --source=codesearch          # Sourcegraph + grep.app
 *   node scripts/scrape.mjs --kind=skill                 # SKILL.md only (skips claude_md scraper)
 *   node scripts/scrape.mjs --kind=claude_md             # CLAUDE.md only (skips skill scraper)
 *   node scripts/scrape.mjs --max                        # max scrape mode (broad search)
 *
 *   # Combinable :
 *   node scripts/scrape.mjs --source=github --kind=claude_md
 *
 * Why this exists : juggling 5-6 parallel scrape commands was what blew up
 * the Supabase free tier (DB exhausted, disk full). Running serially with
 * the same env limits the I/O footprint to one writer at a time.
 *
 * Each "source" adapter is a thin wrapper around the existing scraper
 * scripts — no logic moved. V1.5 will deep-refactor into a real pipeline
 * with shared upsert.mjs + Storage offload at scrape time. For now we
 * keep the existing 4 implementations and just orchestrate them.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CLI parsing ─────────────────────────────────────────────────────────
function parseArgs() {
  const out = {
    source: "all",   // all | github | aggregators | codesearch
    kind: "both",    // both | skill | claude_md
    max: false,
    extras: [],      // pass-through flags
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--source=")) out.source = a.slice(9);
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
    else if (a === "--max") out.max = true;
    else if (a.startsWith("--")) out.extras.push(a);
  }
  return out;
}

// ─── Adapters : each = { name, script, args(opts) → string[] } ────────────
const ADAPTERS = {
  github: {
    label: "github code search · SKILL.md",
    script: "scrape/index.mjs",
    appliesTo: (kind) => kind === "both" || kind === "skill",
    args: (opts) => (opts.max ? ["--max"] : []),
  },
  github_claude_md: {
    label: "github code search · CLAUDE.md",
    script: "scrape-claude-md/index.mjs",
    appliesTo: (kind) => kind === "both" || kind === "claude_md",
    args: (opts) => (opts.max ? ["--max"] : []),
  },
  aggregators: {
    label: "awesome-list aggregators",
    script: "scrape-aggregators/index.mjs",
    appliesTo: (kind) => true, // aggregators auto-classify
    args: (opts) => {
      const a = [];
      if (opts.kind === "skill") a.push("--kind=skill");
      else if (opts.kind === "claude_md") a.push("--kind=claude_md");
      return a;
    },
  },
  codesearch: {
    label: "sourcegraph + grep.app code search",
    script: "scrape-codesearch/index.mjs",
    appliesTo: (kind) => true,
    args: (opts) => {
      const a = [];
      if (opts.kind === "skill") a.push("--kind=skill");
      else if (opts.kind === "claude_md") a.push("--kind=claude_md");
      if (opts.max) a.push("--max");
      return a;
    },
  },
};

// ─── Filter which adapters run for the given --source flag ──────────────
function selectAdapters({ source, kind }) {
  const all = Object.entries(ADAPTERS);
  let chosen;
  if (source === "all") chosen = all;
  else if (source === "github") chosen = all.filter(([k]) => k === "github" || k === "github_claude_md");
  else if (source === "aggregators") chosen = all.filter(([k]) => k === "aggregators");
  else if (source === "codesearch") chosen = all.filter(([k]) => k === "codesearch");
  else {
    console.error(`Unknown source: ${source}`);
    console.error(`Valid : all, github, aggregators, codesearch`);
    process.exit(1);
  }
  return chosen.filter(([_, a]) => a.appliesTo(kind)).map(([k, a]) => ({ key: k, ...a }));
}

// ─── Run one adapter as a subprocess, inherits stdio ────────────────────
function runAdapter(adapter, opts) {
  const scriptPath = path.join(__dirname, adapter.script);
  const args = [scriptPath, ...adapter.args(opts), ...opts.extras];
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn("node", args, { stdio: "inherit" });
    child.on("exit", (code) => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      resolve({ adapter, code, elapsed });
    });
    child.on("error", (err) => {
      console.error(`[scrape] ${adapter.label} : ${err.message}`);
      resolve({ adapter, code: 1, elapsed: 0 });
    });
  });
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  const adapters = selectAdapters(opts);

  console.log(
    `\n[scrape] source=${opts.source} · kind=${opts.kind}${opts.max ? " · max" : ""}\n`
  );
  console.log(`[scrape] will run ${adapters.length} adapter(s) serially :`);
  for (const a of adapters) console.log(`  · ${a.label}`);
  console.log();

  const results = [];
  for (const adapter of adapters) {
    console.log(`\n━━━━━ ${adapter.label} ━━━━━`);
    const r = await runAdapter(adapter, opts);
    results.push(r);
    if (r.code !== 0) {
      console.warn(`[scrape] ${adapter.label} exited ${r.code} after ${r.elapsed}s`);
    } else {
      console.log(`[scrape] ${adapter.label} ✓ done in ${r.elapsed}s`);
    }
  }

  console.log(`\n[scrape] ━━━━━ SUMMARY ━━━━━`);
  for (const r of results) {
    const status = r.code === 0 ? "✓" : `✗ exit ${r.code}`;
    console.log(`  ${status}  ${r.adapter.label} · ${r.elapsed}s`);
  }
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
