#!/usr/bin/env node
import "./_env.mjs";

/**
 * Download every object in the Cloudflare R2 bucket `versuz-content` to a
 * local folder. Pairs with backup-incremental.mjs : the JSONL captures DB
 * rows including `content_path` references, this script captures the .md
 * files themselves. Together they let you fully reconstruct on a clean R2
 * bucket (or migrate again elsewhere).
 *
 * Replaces the legacy backup-storage.mjs (which targeted Supabase Storage,
 * now wiped post-migration).
 *
 * Usage :
 *   node scripts/backup-r2.mjs                     # full backup
 *   node scripts/backup-r2.mjs --concurrency=50    # tune speed
 *   node scripts/backup-r2.mjs --resume            # skip existing files
 *   node scripts/backup-r2.mjs --bucket=other-bkt  # override default
 *
 * Output : .backup/r2/<timestamp>/content/<prefix>/<slug>.md
 *
 * Requires : R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY in env.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v === undefined ? true : v];
  })
);

const CONCURRENCY = parseInt(args.concurrency || "30", 10);
const RESUME = !!args.resume;
const BUCKET = args.bucket || process.env.R2_BUCKET || "versuz-content";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("❌ Missing R2 env vars : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function listAllKeys() {
  console.log(`📋 Listing objects in R2 bucket '${BUCKET}'…`);
  const allKeys = [];
  let continuationToken = undefined;
  let page = 0;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents || []) {
      allKeys.push({ key: obj.Key, size: obj.Size });
    }
    continuationToken = res.NextContinuationToken;
    page++;
    if (page % 10 === 0) console.log(`   · ${allKeys.length} objects so far…`);
  } while (continuationToken);
  return allKeys;
}

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.resolve(`.backup/r2/${ts}/content`);
  await fs.mkdir(outDir, { recursive: true });

  console.log(`📁 Backup → ${outDir}`);
  console.log(`☁  Source : R2 bucket '${BUCKET}'`);
  console.log(`⚡ Concurrency : ${CONCURRENCY}, resume : ${RESUME}\n`);

  const allKeys = await listAllKeys();
  const totalBytes = allKeys.reduce((sum, k) => sum + (k.size || 0), 0);
  console.log(`   → ${allKeys.length} objects · ~${(totalBytes / 1024 / 1024).toFixed(1)} MB total\n`);

  if (allKeys.length === 0) {
    console.log("⚠ Empty bucket — nothing to backup.");
    return;
  }

  // Filter out already-downloaded files if --resume
  let queue = allKeys;
  if (RESUME) {
    const before = queue.length;
    queue = [];
    for (const k of allKeys) {
      const target = path.join(outDir, k.key);
      try {
        const stat = await fs.stat(target);
        if (stat.size === k.size) continue; // already downloaded
      } catch {}
      queue.push(k);
    }
    console.log(`📌 Resume : ${before - queue.length} already done, ${queue.length} to download.\n`);
  }

  let ok = 0;
  let failed = 0;
  let nextIdx = 0;
  const start = Date.now();
  const total = queue.length;

  async function worker() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= queue.length) return;
      const { key } = queue[idx];
      const target = path.join(outDir, key);
      try {
        await fs.mkdir(path.dirname(target), { recursive: true });
        const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const body = await streamToString(res.Body);
        await fs.writeFile(target, body);
        ok++;
      } catch (err) {
        failed++;
        console.warn(`   ⚠ ${key} : ${err.message}`);
      }
      if ((ok + failed) % 1000 === 0 || ok + failed === total) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = ((ok + failed) / elapsed).toFixed(1);
        const eta = ((total - ok - failed) / (ok + failed) * elapsed).toFixed(0);
        console.log(`   · ${ok + failed}/${total} (${((ok + failed) / total * 100).toFixed(0)}%) · ${rate} files/s · ETA ${eta}s · ${failed} failed`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n✅ R2 backup done in ${elapsed}s`);
  console.log(`   ${ok} downloaded · ${failed} failed`);
  console.log(`   Output : ${path.relative(process.cwd(), outDir)}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
