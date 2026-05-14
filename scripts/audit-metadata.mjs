#!/usr/bin/env node
import "./_env.mjs";

/**
 * Audit the metadata jsonb column on skills + claude_md_files.
 * For each key found across rows, reports :
 *   - frequency (% of rows with that key)
 *   - average + max byte size of the value
 *   - sample value (first non-null occurrence)
 *
 * Output guides the Option A (hot/cold split) decision : keys with high
 * byte size + low query frequency in the codebase = good candidates to
 * offload to a Storage `meta/{id}.json` file.
 *
 * Usage :
 *   node scripts/audit-metadata.mjs
 *   node scripts/audit-metadata.mjs --table=skills    # only skills
 *   node scripts/audit-metadata.mjs --sample=500      # smaller sample (faster)
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs() {
  const out = { table: "both", sample: 2000 };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--table=")) out.table = a.slice(8);
    else if (a.startsWith("--sample=")) out.sample = Number(a.slice(9)) || 2000;
  }
  return out;
}

function bytesPretty(b) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function auditTable(sb, table, sampleSize) {
  console.log(`\n[audit] === ${table} ===`);

  // Get total count
  const { count: total } = await sb
    .from(table)
    .select("id", { count: "exact", head: true });
  console.log(`[audit] total rows : ${total}`);

  // Pull a random-ish sample (just first N for speed — random would be
  // more representative but slower on big tables)
  const sample = Math.min(sampleSize, total);
  console.log(`[audit] sampling ${sample} rows...`);

  // Pagination loop to fetch sample
  const rows = [];
  let from = 0;
  const batch = 500;
  while (rows.length < sample) {
    const need = Math.min(batch, sample - rows.length);
    const { data, error } = await sb
      .from(table)
      .select("metadata")
      .range(from, from + need - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    from += data.length;
    if (data.length < need) break;
  }

  // Aggregate stats per key
  const stats = new Map(); // key → { count, totalBytes, maxBytes, sample }
  let totalSize = 0;
  for (const row of rows) {
    const meta = row.metadata || {};
    const rowBytes = Buffer.byteLength(JSON.stringify(meta));
    totalSize += rowBytes;
    for (const [k, v] of Object.entries(meta)) {
      const vBytes = Buffer.byteLength(JSON.stringify(v));
      const s = stats.get(k) || { count: 0, totalBytes: 0, maxBytes: 0, sample: null };
      s.count += 1;
      s.totalBytes += vBytes;
      s.maxBytes = Math.max(s.maxBytes, vBytes);
      if (s.sample === null) {
        const repr = typeof v === "string"
          ? v.slice(0, 80) + (v.length > 80 ? "..." : "")
          : Array.isArray(v)
            ? `[${v.length} items]`
            : typeof v === "object"
              ? `{${Object.keys(v || {}).length} keys}`
              : JSON.stringify(v);
        s.sample = repr;
      }
      stats.set(k, s);
    }
  }

  const avgRowBytes = totalSize / rows.length;
  const projTotal = avgRowBytes * total;
  console.log(
    `[audit] avg metadata row size : ${bytesPretty(Math.round(avgRowBytes))} · projected total : ${bytesPretty(Math.round(projTotal))}`
  );

  // Sort keys by total bytes (biggest space-hogs first)
  const sorted = [...stats.entries()].sort((a, b) => b[1].totalBytes - a[1].totalBytes);

  console.log(`\n${"KEY".padEnd(28)} ${"FREQ".padEnd(8)} ${"AVG".padEnd(10)} ${"MAX".padEnd(10)} ${"PROJ TOTAL".padEnd(12)} SAMPLE`);
  console.log("─".repeat(120));
  for (const [key, s] of sorted) {
    const freq = ((s.count / rows.length) * 100).toFixed(0) + "%";
    const avg = Math.round(s.totalBytes / s.count);
    const projTableTotal = (s.totalBytes / rows.length) * total;
    console.log(
      `${key.padEnd(28)} ${freq.padEnd(8)} ${bytesPretty(avg).padEnd(10)} ${bytesPretty(s.maxBytes).padEnd(10)} ${bytesPretty(Math.round(projTableTotal)).padEnd(12)} ${s.sample}`
    );
  }

  return { table, sampleSize: rows.length, total, projTotal, keys: sorted.length };
}

async function main() {
  const opts = parseArgs();
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  if (opts.table === "skills" || opts.table === "both") {
    await auditTable(sb, "skills", opts.sample);
  }
  if (opts.table === "claude_md_files" || opts.table === "both") {
    await auditTable(sb, "claude_md_files", opts.sample);
  }

  console.log(`
[audit] Reading guide :
  - FREQ low + bytes high → strong candidate for offload (rarely needed, big)
  - FREQ high + bytes low → keep inline (hot data)
  - Grep ${"`metadata.<key>`"} in /src to see if frontend actually uses it.
    Zero results → safe to drop entirely.
`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
