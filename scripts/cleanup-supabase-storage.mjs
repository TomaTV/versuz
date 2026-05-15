#!/usr/bin/env node
import "./_env.mjs";

/**
 * Delete every file in the Supabase Storage `content` bucket, in batches.
 * Run this ONLY after :
 *   1. migrate-storage-to-r2.mjs has uploaded everything to R2
 *   2. R2_PUBLIC_URL is set in env so reads go to R2
 *   3. You've spot-checked /skills/<slug> pages serve content from R2
 *
 * After this script, Supabase Storage usage drops to ~0 → you can safely
 * downgrade Pro → Free.
 *
 * SAFETY :
 *   - Requires --i-know-what-im-doing flag (no accidental runs)
 *   - Lists 50 sample paths before deleting, prompts for confirmation
 *   - Deletes in batches of 100, with a short sleep between batches
 *
 * Usage :
 *   node scripts/cleanup-supabase-storage.mjs --i-know-what-im-doing
 *   node scripts/cleanup-supabase-storage.mjs --i-know-what-im-doing --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const CONFIRM_FLAG = "--i-know-what-im-doing";
const DRY_RUN = process.argv.includes("--dry-run");

if (!process.argv.includes(CONFIRM_FLAG)) {
  console.error(`❌ Refusing to run without ${CONFIRM_FLAG} flag.`);
  console.error(`   This permanently deletes EVERY file in the Supabase 'content' bucket.`);
  console.error(`   Add the flag once you're sure R2 is operational.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "content";

async function listAllPaths() {
  console.log(`📋 Listing files in bucket '${BUCKET}'…`);
  const allPaths = [];

  async function listDir(prefix) {
    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`list ${prefix} failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        // Folders (no id), recurse. Files have an id.
        if (entry.id === null) {
          const next = prefix ? `${prefix}/${entry.name}` : entry.name;
          await listDir(next);
        } else {
          allPaths.push(prefix ? `${prefix}/${entry.name}` : entry.name);
        }
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }

  await listDir("");
  return allPaths;
}

async function main() {
  const paths = await listAllPaths();
  console.log(`   ${paths.length} files found.\n`);

  if (paths.length === 0) {
    console.log("✅ Nothing to delete — bucket is already empty.");
    return;
  }

  console.log("Sample paths (first 50) :");
  for (const p of paths.slice(0, 50)) console.log(`   ${p}`);
  if (paths.length > 50) console.log(`   ... and ${paths.length - 50} more.\n`);

  if (DRY_RUN) {
    console.log("[dry-run] Would delete the above. No changes made.");
    return;
  }

  const rl = readline.createInterface({ input, output });
  const ans = await rl.question(
    `\n⚠  DELETE ALL ${paths.length} FILES IN '${BUCKET}'?  (type "yes" to confirm) `
  );
  await rl.close();
  if (ans.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    return;
  }

  console.log("\n🗑  Deleting in batches of 100…");
  let deleted = 0;
  let failed = 0;
  const BATCH = 100;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const { error } = await sb.storage.from(BUCKET).remove(batch);
    if (error) {
      console.warn(`   ⚠ batch ${i}-${i + batch.length} failed: ${error.message}`);
      failed += batch.length;
    } else {
      deleted += batch.length;
    }
    if (i % 5000 === 0 || i + BATCH >= paths.length) {
      console.log(`   · ${deleted}/${paths.length} deleted (${failed} failed)`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✅ Done. ${deleted} deleted · ${failed} failed.`);
  console.log("\nStorage bucket should now be ~0 MB. You can safely downgrade to Free tier.");
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
