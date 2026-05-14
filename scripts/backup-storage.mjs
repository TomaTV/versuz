#!/usr/bin/env node
import "./_env.mjs";

/**
 * Download every file from the `content` Storage bucket to a local folder.
 * Pairs with backup-incremental.mjs : the JSONL captures DB rows including
 * `content_path` references, this script captures the files themselves.
 * Together they let you fully reconstruct on a clean Supabase project via
 *   1. JSONL → restore DB rows
 *   2. This script's output → re-upload to Storage with same paths
 *
 * Usage :
 *   node scripts/backup-storage.mjs                    # full backup
 *   node scripts/backup-storage.mjs --concurrency=50   # tune speed
 *   node scripts/backup-storage.mjs --resume           # skip already-downloaded files
 *
 * Output : .backup/storage/<timestamp>/content/...
 */

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

const BUCKET = "content";
const CONCURRENCY = parseInt(
  process.argv.find((a) => a.startsWith("--concurrency="))?.slice(14) || "30",
  10
);
const RESUME = process.argv.includes("--resume");

function nowSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function listAllObjects(sb) {
  const all = [];
  for (const prefix of ["skills", "claude-md", "meta", "bench"]) {
    let offset = 0;
    while (true) {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .list(prefix, { limit: 1000, offset });
      if (error) {
        if (/not found/i.test(error.message)) break; // prefix doesn't exist yet, skip
        throw error;
      }
      if (!data || data.length === 0) break;
      for (const o of data) {
        if (o.name && !o.id?.endsWith("/")) {
          all.push({ path: `${prefix}/${o.name}`, size: o.metadata?.size || 0 });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return all;
}

async function downloadOne(sb, storagePath, localPath) {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  const { data, error } = await sb.storage.from(BUCKET).download(storagePath);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(localPath, buf);
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const outDir = path.resolve(".backup", "storage", nowSlug());
  await fs.mkdir(outDir, { recursive: true });
  console.log(`📁 Storage backup → ${outDir}`);

  console.log("📋 listing all Storage objects...");
  const objects = await listAllObjects(sb);
  const totalBytes = objects.reduce((s, o) => s + o.size, 0);
  console.log(
    `📦 ${objects.length} files · ${(totalBytes / 1024 / 1024).toFixed(1)} MB total\n`
  );

  // Parallel downloads with bounded concurrency.
  const queue = objects.slice();
  let done = 0;
  let failed = 0;
  let skipped = 0;
  const t0 = Date.now();

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const obj = queue.shift();
      if (!obj) break;
      const localPath = path.join(outDir, BUCKET, obj.path);
      if (RESUME) {
        const stat = await fs.stat(localPath).catch(() => null);
        if (stat && stat.size > 0) {
          skipped++;
          done++;
          continue;
        }
      }
      try {
        await downloadOne(sb, obj.path, localPath);
        done++;
      } catch (err) {
        console.warn(`\n  ✗ ${obj.path}: ${err.message}`);
        failed++;
        done++;
      }
      const elapsed = (Date.now() - t0) / 1000;
      const rate = done / elapsed;
      process.stdout.write(
        `\r  ${done.toString().padStart(6)} / ${objects.length} · ${rate.toFixed(1)} files/s · skipped ${skipped} · failed ${failed}`
      );
    }
  });
  await Promise.all(workers);

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✅ Storage backup done in ${duration}s`);
  console.log(`   downloaded: ${done - failed - skipped}`);
  console.log(`   skipped (resume): ${skipped}`);
  console.log(`   failed: ${failed}`);
  console.log(`\n📂 ${outDir}\n`);
  console.log(`To restore later :`);
  console.log(`   1. Manually upload back to a new bucket via Supabase Studio, OR`);
  console.log(`   2. Write a tiny script using supabase.storage.from('content').upload()`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
