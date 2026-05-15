#!/usr/bin/env node
import "./_env.mjs";

/**
 * Migrate Versuz content files from a local Supabase Storage backup into
 * Cloudflare R2.
 *
 * Why this script reads from the LOCAL backup (not directly from Supabase) :
 *   1. Zero Supabase egress (we already paid for the backup download).
 *   2. Atomic + restartable — backup is frozen, R2 upload can resume.
 *   3. If R2 upload fails midway, retry without re-hitting Supabase.
 *
 * Prerequisites :
 *   1. Run `npm run backup:storage` to produce .backup/storage/<ts>/content/
 *   2. Create R2 bucket on Cloudflare (public access enabled).
 *   3. Generate R2 API token (Object Read & Write).
 *   4. Set env vars in .env.local :
 *        R2_ACCOUNT_ID=<cloudflare account ID>
 *        R2_ACCESS_KEY_ID=<token Access Key ID>
 *        R2_SECRET_ACCESS_KEY=<token Secret Access Key>
 *        R2_BUCKET=versuz-content
 *
 * Usage :
 *   node scripts/migrate-storage-to-r2.mjs                  # uses latest backup
 *   node scripts/migrate-storage-to-r2.mjs --from=.backup/storage/2026-05-15T14-14-50
 *   node scripts/migrate-storage-to-r2.mjs --concurrency=30 # tune speed
 *   node scripts/migrate-storage-to-r2.mjs --dry-run        # list only, no upload
 *   node scripts/migrate-storage-to-r2.mjs --resume         # skip already-uploaded
 *
 * Progress is checkpointed every 500 uploads to .migrate-r2-progress.json
 * so a crash / Ctrl+C can resume without re-uploading.
 *
 * Output : R2 bucket populated. DB content_path values unchanged (path
 * shape is identical across both backends). Once verified, run
 * `npm run cleanup:supabase-storage` to wipe the old bucket.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v === undefined ? true : v];
  })
);

const CONCURRENCY = parseInt(args.concurrency || "20", 10);
const DRY_RUN = !!args["dry-run"];
const RESUME = !!args.resume;
const FROM_DIR = args.from;

const BUCKET = process.env.R2_BUCKET || "versuz-content";
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("❌ Missing R2 env vars. Required :");
  console.error("   R2_ACCOUNT_ID");
  console.error("   R2_ACCESS_KEY_ID");
  console.error("   R2_SECRET_ACCESS_KEY");
  console.error("   R2_BUCKET (optional, default 'versuz-content')");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

// Find latest backup if --from not specified
async function findLatestBackup() {
  const root = path.resolve(".backup/storage");
  let entries;
  try {
    entries = await fs.readdir(root);
  } catch {
    console.error("❌ No .backup/storage/ directory. Run `npm run backup:storage` first.");
    process.exit(1);
  }
  const stamps = entries.filter((e) => /^\d{4}-\d{2}-\d{2}T/.test(e)).sort();
  if (stamps.length === 0) {
    console.error("❌ No timestamped backup found in .backup/storage/");
    process.exit(1);
  }
  return path.join(root, stamps[stamps.length - 1]);
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(full);
    else if (ent.isFile()) yield full;
  }
}

const PROGRESS_FILE = ".migrate-r2-progress.json";

async function loadProgress() {
  if (!RESUME) return new Set();
  try {
    const raw = await fs.readFile(PROGRESS_FILE, "utf8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

async function saveProgress(done) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify([...done]));
}

async function main() {
  const baseDir = FROM_DIR
    ? path.resolve(FROM_DIR)
    : await findLatestBackup();

  // The backup-storage script writes everything under <ts>/content/...
  const contentRoot = path.join(baseDir, "content");
  try {
    await fs.access(contentRoot);
  } catch {
    console.error(`❌ ${contentRoot} does not exist. Backup incomplete?`);
    process.exit(1);
  }

  console.log("📂 Source     :", baseDir);
  console.log("☁  R2 bucket  :", BUCKET);
  console.log("🔁 Mode       :", DRY_RUN ? "DRY-RUN (no upload)" : RESUME ? "RESUME" : "FRESH");
  console.log("⚡ Concurrency:", CONCURRENCY);
  console.log();

  // Collect file list first so we have a known total
  console.log("📋 Enumerating files…");
  const allFiles = [];
  for await (const f of walk(contentRoot)) {
    allFiles.push(f);
  }
  const total = allFiles.length;
  console.log(`   ${total} files to migrate (~${(total * 12 / 1024).toFixed(1)} MB estimated)`);
  console.log();

  if (DRY_RUN) {
    console.log("First 10 files (dry-run) :");
    for (const f of allFiles.slice(0, 10)) {
      const key = path.relative(contentRoot, f).replace(/\\/g, "/");
      console.log(`  → ${key}  (${f})`);
    }
    console.log(`\n... and ${total - 10} more.\n`);
    return;
  }

  const done = await loadProgress();
  if (done.size > 0) {
    console.log(`📌 Resuming : ${done.size} files already uploaded, skipping.\n`);
  }

  let okCount = 0;
  let failCount = 0;
  const failed = [];
  let processed = done.size;
  const start = Date.now();

  // Worker pool
  const queue = allFiles.filter((f) => {
    const key = path.relative(contentRoot, f).replace(/\\/g, "/");
    return !done.has(key);
  });
  console.log(`🚀 ${queue.length} files to upload to R2 with ${CONCURRENCY} workers\n`);

  let nextIdx = 0;
  async function worker(id) {
    while (true) {
      const idx = nextIdx++;
      if (idx >= queue.length) return;
      const file = queue[idx];
      const key = path.relative(contentRoot, file).replace(/\\/g, "/");
      try {
        const body = await fs.readFile(file);
        await client.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: "text/markdown; charset=utf-8",
            CacheControl: "public, max-age=31536000, immutable",
          })
        );
        done.add(key);
        okCount++;
      } catch (err) {
        failCount++;
        failed.push({ file, key, error: err.message });
      }
      processed++;
      if (processed % 500 === 0 || processed === total) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = (okCount / elapsed).toFixed(1);
        const eta = ((queue.length - okCount) / (okCount / elapsed)).toFixed(0);
        console.log(
          `  · ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%) · ` +
          `${okCount} ok · ${failCount} fail · ${rate} files/s · ETA ${eta}s`
        );
        await saveProgress(done);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  await saveProgress(done);

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n✅ Migration complete in ${elapsed}s`);
  console.log(`   ${okCount} uploaded · ${failCount} failed`);
  if (failed.length > 0) {
    const failedFile = ".migrate-r2-failed.json";
    await fs.writeFile(failedFile, JSON.stringify(failed, null, 2));
    console.log(`   ⚠ Failed files logged to ${failedFile}. Re-run with --resume to retry.`);
  }
  console.log();
  console.log("Next steps :");
  console.log("  1. Set R2_PUBLIC_URL in .env.local (e.g. https://cdn.versuz.dev)");
  console.log("  2. Restart dev server : npm run dev");
  console.log("  3. Verify reads : open /skills/<some-slug> → check Network tab,");
  console.log("     the markdown content should fetch from R2 not Supabase.");
  console.log("  4. Once verified, run cleanup-supabase-storage to wipe old bucket.");
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
