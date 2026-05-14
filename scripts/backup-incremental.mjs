#!/usr/bin/env node
import "./_env.mjs";

/**
 * Incremental, low-impact backup of every Versuz table.
 *
 * Why this exists alongside emergency-dump.mjs :
 *   emergency-dump.mjs  → one-shot `pg_dump --format=custom`. Fast, atomic,
 *                         restorable via `pg_restore`. But on a struggling
 *                         free-tier DB it can spike I/O hard, get killed,
 *                         and leave you with a partial dump.
 *   backup-incremental  → hits Supabase REST API in 500-row batches with
 *                         sleep between requests. Slower (5-20 min depending
 *                         on table size), but predictable I/O footprint —
 *                         the DB barely notices.
 *
 * Use this BEFORE running db-recovery.sql, BEFORE applying any migrations,
 * BEFORE the Pro→Free downgrade. It captures everything that matters in a
 * format that's easy to inspect, diff, and re-import.
 *
 * Output : .backup/<timestamp>/<table>.jsonl.gz (one line = one row, gzipped)
 *          .backup/<timestamp>/_manifest.json     (summary + checkpoint state)
 *
 * Resume : if the script is killed (network, DB crash, Ctrl+C), re-run with
 *          the same timestamp dir as arg :
 *          node scripts/backup-incremental.mjs --resume=.backup/2026-05-14T...
 *
 * Restore : individual rows can be re-inserted via the Supabase client
 *          (`supabase.from(tbl).upsert(rows)`). Or convert to SQL with
 *          jq + a tiny script.
 *
 * Requires : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *            (service role bypasses RLS — needed to read all rows).
 */

import { createClient } from "@supabase/supabase-js";
import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// ─── Config ───────────────────────────────────────────────────────────
const BATCH_SIZE = parseInt(process.env.BACKUP_BATCH || "500", 10);
const SLEEP_MS = parseInt(process.env.BACKUP_SLEEP_MS || "250", 10);
const MAX_RETRIES = 5;

// Order matters : smallest + most critical first. If the DB crashes mid-run,
// you still have the Stripe / user data even if you lose bench history.
const TABLES = [
  // Tier 1 : critical, small (Stripe, user, mailing list)
  "profiles",
  "purchases",
  "payouts",
  "subscribers",
  "cli_submissions",

  // Tier 2 : product config (small)
  "cycles",
  "task_sets",
  "tasks",
  "task_proposals",

  // Tier 3 : content (medium-large)
  "skills",
  "claude_md_files",

  // Tier 4 : bench data (largest)
  "run_jobs",
  "run_outputs",
  "judge_batches",
  "judge_scores",
  "scores",
];

// ─── Setup ────────────────────────────────────────────────────────────
function parseArgs() {
  const out = { resumeDir: null, tablesOnly: null };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--resume=")) out.resumeDir = a.slice(9);
    else if (a.startsWith("--tables=")) out.tablesOnly = a.slice(9).split(",");
  }
  return out;
}

function nowSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function readManifest(dir) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, "_manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function writeManifest(dir, manifest) {
  await fs.writeFile(
    path.join(dir, "_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Dump one table to <dir>/<table>.jsonl.gz ─────────────────────────
async function dumpTable(supabase, table, dir, manifest) {
  const filePath = path.join(dir, `${table}.jsonl.gz`);
  const existing = manifest.tables[table];

  if (existing?.done) {
    console.log(`  ✓ ${table.padEnd(22)} already done (${existing.rows} rows)`);
    return;
  }

  // Resume support : continue from last offset if file exists
  const startOffset = existing?.offset || 0;
  const append = startOffset > 0;
  const gz = createGzip({ level: 6 });
  const writeStream = createWriteStream(filePath, { flags: append ? "a" : "w" });
  // Buffered queue feeding the gzip stream — gives us backpressure
  const queue = new Readable({ read() {} });
  const writePromise = pipeline(queue, gz, writeStream);

  let offset = startOffset;
  let rows = existing?.rows || 0;
  let retries = 0;
  let done = false;

  while (!done) {
    try {
      // Use range() instead of LIMIT/OFFSET so PostgREST does it in one query
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        // 42P01 = relation does not exist → table not in this schema, skip
        if (error.code === "42P01" || /does not exist/.test(error.message)) {
          console.log(`  ⊘ ${table.padEnd(22)} skipped (table not present)`);
          queue.push(null);
          await writePromise;
          await fs.unlink(filePath).catch(() => {});
          manifest.tables[table] = { skipped: true, reason: "missing" };
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        // True end-of-table : empty response means no more rows.
        done = true;
        break;
      }

      for (const row of data) {
        queue.push(JSON.stringify(row) + "\n");
      }

      rows += data.length;
      offset += data.length;
      retries = 0; // reset on success

      // Checkpoint every 5 batches so a crash loses ≤ 2500 rows of progress
      if (rows % (BATCH_SIZE * 5) === 0) {
        manifest.tables[table] = { rows, offset, done: false };
        await writeManifest(dir, manifest);
      }

      process.stdout.write(`\r  · ${table.padEnd(22)} ${String(rows).padStart(7)} rows`);

      // We keep paginating until we get an EMPTY response, never on
      // `data.length < BATCH_SIZE`. PostgREST has a `max-rows` cap (typically
      // 1000) that silently truncates oversized requests — so a "smaller than
      // requested" response can mean either "end of table" OR "hit the cap".
      // The only safe signal is `data.length === 0` at offset N.
      await sleep(SLEEP_MS);
    } catch (err) {
      retries += 1;
      if (retries > MAX_RETRIES) {
        console.error(
          `\n  ✗ ${table.padEnd(22)} failed after ${MAX_RETRIES} retries at offset ${offset}: ${err.message}`
        );
        manifest.tables[table] = { rows, offset, done: false, error: err.message };
        await writeManifest(dir, manifest);
        queue.push(null);
        await writePromise.catch(() => {});
        return;
      }
      const backoffMs = Math.min(30_000, 2000 * 2 ** retries);
      console.log(
        `\n  ⚠ ${table.padEnd(22)} retry ${retries}/${MAX_RETRIES} after ${err.message.slice(0, 80)} — backoff ${backoffMs}ms`
      );
      await sleep(backoffMs);
    }
  }

  queue.push(null);
  await writePromise;

  manifest.tables[table] = { rows, offset: rows, done: true };
  await writeManifest(dir, manifest);
  console.log(`\r  ✓ ${table.padEnd(22)} ${String(rows).padStart(7)} rows · saved`);
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  const { resumeDir, tablesOnly } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve output dir
  let dir, manifest;
  if (resumeDir) {
    dir = path.resolve(resumeDir);
    manifest = await readManifest(dir);
    if (!manifest) {
      console.error(`❌ Resume dir has no _manifest.json: ${dir}`);
      process.exit(1);
    }
    console.log(`📁 Resuming ${dir}`);
  } else {
    dir = path.resolve(".backup", nowSlug());
    await fs.mkdir(dir, { recursive: true });
    manifest = {
      startedAt: new Date().toISOString(),
      batchSize: BATCH_SIZE,
      sleepMs: SLEEP_MS,
      tables: {},
    };
    await writeManifest(dir, manifest);
    console.log(`📁 New backup → ${dir}`);
  }

  const tables = tablesOnly || TABLES;
  console.log(`📦 Backing up ${tables.length} tables · batch ${BATCH_SIZE} · sleep ${SLEEP_MS}ms\n`);

  const t0 = Date.now();
  for (const table of tables) {
    await dumpTable(supabase, table, dir, manifest);
  }

  manifest.finishedAt = new Date().toISOString();
  manifest.durationSec = Math.round((Date.now() - t0) / 1000);
  await writeManifest(dir, manifest);

  const summary = Object.entries(manifest.tables)
    .map(([t, m]) => `  ${t.padEnd(22)} ${m.skipped ? "skipped" : (m.done ? "✓ " + m.rows : "⚠ partial " + m.rows)}`)
    .join("\n");

  console.log(`\n✅ Backup done in ${manifest.durationSec}s.\n${summary}\n\n📂 ${dir}\n`);
  console.log(`To restore individual tables later :`);
  console.log(`  gunzip -c ${path.relative(process.cwd(), dir)}/skills.jsonl.gz | head`);
  console.log(`  # then \`supabase.from('skills').upsert(rows)\` from a small script`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
