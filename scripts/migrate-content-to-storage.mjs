#!/usr/bin/env node
import "./_env.mjs";

/**
 * ⚠ LEGACY (post-R2 migration mai 2026) — code mort. La migration inline →
 *   Storage (mig 0042) a été faite en 2026, puis Storage → R2 en mai 2026.
 *   Le content vit désormais sur Cloudflare R2 (`https://cdn.versuz.dev`).
 *   Si tu veux ré-uploader du contenu depuis un backup local vers R2, utilise
 *   `scripts/migrate-storage-to-r2.mjs` à la place.
 *
 * Migrate skill_md_content + claude_md_files.content depuis inline DB columns
 * vers Supabase Storage bucket "content" (public).
 *
 * Pourquoi : à 100k items × 2-5KB par row, le inline content sature le free
 * tier Supabase (500MB DB). Storage = 1GB free, et le DB se concentre sur
 * les metadata + indexes.
 *
 * Usage :
 *   node scripts/migrate-content-to-storage.mjs                # migrate, garde legacy
 *   node scripts/migrate-content-to-storage.mjs --purge        # vide legacy après migration
 *   node scripts/migrate-content-to-storage.mjs --kind=skill   # skills only
 *   node scripts/migrate-content-to-storage.mjs --resume       # reprend (skip rows déjà migrées)
 *   node scripts/migrate-content-to-storage.mjs --batch=20     # plus prudent
 *
 * Idempotent : --resume (default) skip les rows qui ont déjà content_path set.
 * Toujours safe à re-run.
 *
 * Une fois validé que tout est OK côté frontend (skills affichent leur
 * content depuis Storage), re-run avec --purge pour NULL les colonnes
 * inline et lancer `VACUUM FULL skills; VACUUM FULL claude_md_files;` dans
 * Supabase Studio pour récupérer l'espace DB.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "content";

function parseArgs(argv) {
  const out = { kind: "both", purge: false, batch: 50 };
  for (const a of argv.slice(2)) {
    if (a === "--purge") out.purge = true;
    else if (a === "--resume") out.resume = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
    else if (a.startsWith("--batch=")) out.batch = Number(a.slice(8)) || 50;
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBucket(sb) {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) {
    console.warn(`[migrate] listBuckets: ${error.message} — assuming bucket exists`);
    return;
  }
  if (buckets?.find((b) => b.name === BUCKET)) {
    console.log(`[migrate] bucket "${BUCKET}" already exists`);
    return;
  }
  const { error: cErr } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 1024 * 1024, // 1 MB par fichier (un SKILL.md max ~50KB en pratique)
  });
  if (cErr) {
    console.warn(`[migrate] createBucket: ${cErr.message}`);
    console.warn(`[migrate] Crée manuellement un bucket public "content" dans Supabase Dashboard → Storage`);
    process.exit(1);
  }
  console.log(`[migrate] created public bucket "${BUCKET}"`);
}

async function migrateTable(sb, { table, contentCol, prefix, batch, concurrency = 25 }) {
  // ID-cursor pagination (NOT offset-based). Offset breaks when iterating a
  // filtered result set whose rows we're actively modifying : migrated rows
  // drop from the `content_path IS NULL` filter, the result set shifts, and
  // offset=N hits rows that were originally at offset=N+migrated, skipping
  // everything in between. Cursor on id solves it — failed rows stay in the
  // filter but the cursor moves past them so we don't loop forever (rerun
  // the script later to retry).
  let cursor = null;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Process one row : upload to Storage + stamp content_path in DB.
  // Returns "migrated" | "skipped" | "failed".
  async function processRow(row) {
    const body = row[contentCol];
    if (!body || body.length === 0) return "skipped";

    const path = `${prefix}/${row.slug}.md`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, body, {
      contentType: "text/markdown; charset=utf-8",
      upsert: true,
    });
    if (upErr) {
      console.warn(`[migrate] upload ${path}: ${upErr.message}`);
      return "failed";
    }
    const { error: dbErr } = await sb
      .from(table)
      .update({ content_path: path })
      .eq("id", row.id);
    if (dbErr) {
      console.warn(`[migrate] stamp ${row.slug}: ${dbErr.message}`);
      return "failed";
    }
    return "migrated";
  }

  // Run a batch with bounded concurrency. Storage uploads + per-row UPDATEs
  // were the bottleneck — both are independent per-row, so paralleling them
  // gives a 20-30× speedup. Storage handles fan-out fine; the DB UPDATEs
  // hit different rows so no lock contention.
  async function runBatchParallel(rows) {
    const queue = rows.slice();
    let m = 0, s = 0, f = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        const result = await processRow(row).catch((e) => {
          console.warn(`[migrate] worker err ${row.slug}: ${e.message}`);
          return "failed";
        });
        if (result === "migrated") m++;
        else if (result === "skipped") s++;
        else f++;
      }
    });
    await Promise.all(workers);
    return { m, s, f };
  }

  while (true) {
    let q = sb
      .from(table)
      .select(`id, slug, ${contentCol}, content_path`)
      .is("content_path", null)
      .not(contentCol, "is", null)
      .order("id", { ascending: true })
      .limit(batch);
    if (cursor) q = q.gt("id", cursor);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;

    const t0 = Date.now();
    const { m, s, f } = await runBatchParallel(data);
    migrated += m;
    skipped += s;
    failed += f;
    // Advance cursor past the last row we saw (even if it failed —
    // we'll retry it on a fresh run since its content_path is still NULL).
    cursor = data[data.length - 1].id;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const rate = (data.length / Math.max(0.1, (Date.now() - t0) / 1000)).toFixed(1);
    console.log(
      `[migrate] ${table} · cursor=${String(cursor).slice(0, 8)} · +${m} migrated (total ${migrated}) · ${elapsed}s @ ${rate} rows/s`
    );
    if (data.length < batch) break;
  }
  return { migrated, skipped, failed };
}

async function purgeColumn(sb, table, col) {
  let totalCleared = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select("id")
      .not("content_path", "is", null)
      .not(col, "is", null)
      .limit(500);
    if (error) {
      console.warn(`[purge] ${table}: ${error.message}`);
      return totalCleared;
    }
    if (!data || data.length === 0) break;
    const ids = data.map((r) => r.id);
    const { error: uErr } = await sb.from(table).update({ [col]: null }).in("id", ids);
    if (uErr) {
      console.warn(`[purge] update ${table}: ${uErr.message}`);
      return totalCleared;
    }
    totalCleared += ids.length;
    console.log(`[purge] ${table}.${col} · cleared ${totalCleared} rows`);
    if (data.length < 500) break;
  }
  return totalCleared;
}

async function main() {
  const opts = parseArgs(process.argv);
  console.log(`[migrate] starting · ${JSON.stringify(opts)}`);
  const sb = makeSupabase();

  await ensureBucket(sb);

  if (opts.kind === "skill" || opts.kind === "both") {
    console.log(`[migrate] === skills ===`);
    const r = await migrateTable(sb, {
      table: "skills",
      contentCol: "skill_md_content",
      prefix: "skills",
      batch: opts.batch,
    });
    console.log(`[migrate] skills DONE · migrated ${r.migrated} · skipped ${r.skipped} · failed ${r.failed}`);
  }

  if (opts.kind === "claude_md" || opts.kind === "both") {
    console.log(`[migrate] === claude_md_files ===`);
    const r = await migrateTable(sb, {
      table: "claude_md_files",
      contentCol: "content",
      prefix: "claude-md",
      batch: opts.batch,
    });
    console.log(`[migrate] claude_md DONE · migrated ${r.migrated} · skipped ${r.skipped} · failed ${r.failed}`);
  }

  if (opts.purge) {
    console.log(`[migrate] === --purge: clearing legacy columns ===`);
    if (opts.kind === "skill" || opts.kind === "both") {
      await purgeColumn(sb, "skills", "skill_md_content");
    }
    if (opts.kind === "claude_md" || opts.kind === "both") {
      await purgeColumn(sb, "claude_md_files", "content");
    }
    console.log(`[migrate] purge DONE. Run this in Supabase Studio for disk reclaim :`);
    console.log(`   VACUUM FULL skills;`);
    console.log(`   VACUUM FULL claude_md_files;`);
  } else {
    console.log(`[migrate] DONE. Re-run with --purge after frontend validation to NULL legacy columns + reclaim DB space.`);
  }
}

main().catch((err) => {
  console.error(`[migrate] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
