#!/usr/bin/env node
import "./_env.mjs";

/**
 * Cleanup Storage orphans : list every file in the `content` bucket and
 * delete those that no row references via `content_path`. After a
 * hard-delete of archived rows, their Storage files become orphans.
 *
 * Usage :
 *   node scripts/cleanup-orphan-storage.mjs              # dry run preview
 *   node scripts/cleanup-orphan-storage.mjs --apply      # actually delete
 *
 * Safe : only removes Storage objects whose path is referenced nowhere
 * in `skills.content_path` or `claude_md_files.content_path`.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "content";
const apply = process.argv.includes("--apply");

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Fetch every content_path still referenced (these are "alive")
  console.log("[cleanup] fetching live content_paths from DB...");
  const live = new Set();
  for (const table of ["skills", "claude_md_files"]) {
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from(table)
        .select("content_path")
        .not("content_path", "is", null)
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) if (r.content_path) live.add(r.content_path);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`[cleanup] ${live.size} live content_paths referenced in DB`);

  // List every file in the bucket via Storage API (recursive per prefix)
  console.log("[cleanup] listing all Storage objects...");
  const allObjects = [];
  for (const prefix of ["skills", "claude-md"]) {
    let offset = 0;
    while (true) {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .list(prefix, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const o of data) {
        if (o.name && !o.id?.endsWith("/")) allObjects.push(`${prefix}/${o.name}`);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  console.log(`[cleanup] ${allObjects.length} total Storage objects`);

  // Diff : orphans = in Storage but not in live
  const orphans = allObjects.filter((p) => !live.has(p));
  console.log(`[cleanup] ${orphans.length} orphans to delete\n`);

  if (orphans.length === 0) {
    console.log("[cleanup] nothing to do");
    return;
  }

  if (!apply) {
    console.log("[cleanup] DRY RUN — paths that would be deleted (first 20) :");
    orphans.slice(0, 20).forEach((p) => console.log(`  ${p}`));
    if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);
    console.log(`\n[cleanup] Re-run with --apply to commit.`);
    return;
  }

  // Storage.remove accepts batches of up to 1000 paths
  let removed = 0;
  for (let i = 0; i < orphans.length; i += 100) {
    const chunk = orphans.slice(i, i + 100);
    const { error } = await sb.storage.from(BUCKET).remove(chunk);
    if (error) {
      console.warn(`[cleanup] chunk ${i}: ${error.message}`);
      continue;
    }
    removed += chunk.length;
    process.stdout.write(`\r[cleanup] deleted ${removed} / ${orphans.length}`);
  }
  console.log(`\n[cleanup] DONE — ${removed} orphans removed`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
