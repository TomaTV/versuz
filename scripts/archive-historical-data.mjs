#!/usr/bin/env node
import "./_env.mjs";

/**
 * Archive cold rows from Postgres to R2, keeping the live DB tight.
 *
 * What gets archived (per table, by retention window) :
 *   - bench_results.created_at  < now() - INTERVAL '30 days'
 *   - judge_scores.created_at   < now() - INTERVAL '30 days'
 *   - run_outputs.created_at    < now() - INTERVAL '30 days'
 *   - rank_history.cycle_at     < now() - INTERVAL '30 days'  (mig 0052)
 *   - cycles.completed_at       < now() - INTERVAL '90 days'
 *
 * Archive format : R2 `archive/{table}/{YYYY-MM}.jsonl.gz`
 * (one line per row, gzipped — easy to grep + cheap to store)
 *
 * After archive : DELETE the rows from Postgres so the table footprint
 * doesn't grow unbounded. The R2 archive is the source of truth for any
 * historical query.
 *
 * Lazy-load on reads : if a page needs a cycle older than 30 days, fetch
 * the corresponding archive file from R2 (~5-50 KB gzipped), decompress,
 * parse, render. Slow but rare (no one looks at month-old rankings except
 * for the rare `/standings/[cycle]` deep link).
 *
 * RUN THIS LATER (not now during the storage migration). Once the DB
 * starts approaching 400 MB (cap is 500 MB), schedule a daily cron.
 *
 * Usage :
 *   node scripts/archive-historical-data.mjs --dry-run           # show what would archive
 *   node scripts/archive-historical-data.mjs --apply             # archive + delete
 *   node scripts/archive-historical-data.mjs --apply --table=bench_results
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { gzipSync } from "node:zlib";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v === undefined ? true : v];
  })
);
const APPLY = !!args.apply;
const TABLE_FILTER = args.table || null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !sbKey) {
  console.error("❌ Missing Supabase env");
  process.exit(1);
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_ARCHIVE_BUCKET || process.env.R2_BUCKET || "versuz-content";
if (APPLY && (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY)) {
  console.error("❌ R2 creds missing (set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  process.exit(1);
}

const sb = createClient(url, sbKey, { auth: { persistSession: false } });

const r2 = APPLY
  ? new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    })
  : null;

// Schema-aware archive plan : which table → which date column → retention
const PLAN = [
  { table: "bench_results", dateCol: "created_at", retentionDays: 30 },
  { table: "judge_scores",  dateCol: "created_at", retentionDays: 30 },
  { table: "run_outputs",   dateCol: "created_at", retentionDays: 30 },
  { table: "rank_history",  dateCol: "cycle_at",   retentionDays: 30 },
  { table: "cycles",        dateCol: "completed_at", retentionDays: 90 },
];

function ymKey(date) {
  // YYYY-MM string from a Date or ISO timestamp string
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function archiveTable({ table, dateCol, retentionDays }) {
  console.log(`\n📦 Table : ${table}  (retention ${retentionDays}d, by ${dateCol})`);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  // Count what would be archived
  const { count, error: countErr } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .lt(dateCol, cutoff);
  if (countErr) {
    console.warn(`   ⚠ count failed: ${countErr.message}`);
    return;
  }
  console.log(`   ${count ?? 0} rows older than ${cutoff.slice(0, 10)}`);
  if (!count || count === 0) return;

  if (!APPLY) {
    console.log("   [dry-run] would archive + delete these rows. Use --apply to commit.");
    return;
  }

  // Fetch in batches (5000), group by month, write each month to R2
  const PAGE = 5000;
  const monthBuckets = new Map(); // ym → { rows: [...], minId, maxId }
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select("*")
      .lt(dateCol, cutoff)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const ym = ymKey(row[dateCol]);
      if (!monthBuckets.has(ym)) monthBuckets.set(ym, []);
      monthBuckets.get(ym).push(row);
    }
    console.log(`   · fetched ${offset + data.length}/${count} rows`);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // Write each month's bucket to R2
  for (const [ym, rows] of monthBuckets) {
    const key = `archive/${table}/${ym}.jsonl.gz`;
    const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    const gz = gzipSync(jsonl, { level: 9 });
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: gz,
        ContentType: "application/x-ndjson+gzip",
      })
    );
    console.log(`   ✓ R2 archive/${table}/${ym}.jsonl.gz  (${rows.length} rows, ${(gz.length / 1024).toFixed(1)} KB gzipped)`);
  }

  // Delete archived rows from Postgres in batches (to avoid statement timeout)
  console.log(`   🗑 deleting ${count} archived rows from Postgres…`);
  const DELETE_BATCH = 1000;
  let deleted = 0;
  while (deleted < count) {
    const { data: batch, error: pickErr } = await sb
      .from(table)
      .select("id")
      .lt(dateCol, cutoff)
      .order("id", { ascending: true })
      .limit(DELETE_BATCH);
    if (pickErr) throw new Error(`delete-pick failed: ${pickErr.message}`);
    if (!batch || batch.length === 0) break;
    const ids = batch.map((r) => r.id);
    const { error: delErr } = await sb.from(table).delete().in("id", ids);
    if (delErr) throw new Error(`delete failed: ${delErr.message}`);
    deleted += batch.length;
    if (deleted % 10000 === 0 || deleted >= count) {
      console.log(`     · deleted ${deleted}/${count}`);
    }
  }
  console.log(`   ✅ ${table} done : ${deleted} rows archived to R2 + removed from DB`);
}

async function main() {
  console.log(`🗂  Archive policy run · mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`   target bucket : ${BUCKET}`);

  const tablesToProcess = TABLE_FILTER
    ? PLAN.filter((p) => p.table === TABLE_FILTER)
    : PLAN;

  if (TABLE_FILTER && tablesToProcess.length === 0) {
    console.error(`❌ Unknown table : ${TABLE_FILTER}`);
    console.error(`   Known : ${PLAN.map((p) => p.table).join(", ")}`);
    process.exit(1);
  }

  for (const item of tablesToProcess) {
    await archiveTable(item).catch((err) => {
      console.error(`   ❌ ${item.table} : ${err.message}`);
    });
  }

  console.log("\n✅ Archive run complete.");
  if (!APPLY) console.log("   Re-run with --apply to actually archive + delete.");
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
