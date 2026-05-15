#!/usr/bin/env node
import "./_env.mjs";

/**
 * ⚠ LEGACY (post-R2 migration mai 2026) — lit Supabase Storage object sizes
 *   désormais vides → script broken pour usage actuel. Si tu veux backfill
 *   byte_count depuis R2, faut refactor avec le S3 client (HeadObject pour
 *   chaque content_path) — voir scripts/_storage.mjs pour le client R2.
 *   La majorité des rows ont déjà leur byte_count stamp depuis le scraper
 *   et la migration R2 (path shape inchangé), pas urgent.
 *
 * Backfill `metadata.byte_count` on skills + claude_md_files by reading
 * file size from the Supabase Storage `content` bucket. Used by the
 * marketplace Tokens filter when `word_count` is unavailable
 * (skills don't have an indexed word_count column).
 *
 * approxTokens = byte_count / 4
 *
 * Idempotent : only fetches for rows missing `metadata.byte_count` AND
 * having a `content_path`. Uses Storage object metadata (the size is
 * stored as part of the object entry, no need to download the file).
 *
 * Usage :
 *   node scripts/backfill-byte-counts.mjs               # dry run preview
 *   node scripts/backfill-byte-counts.mjs --apply       # commit
 *   node scripts/backfill-byte-counts.mjs --kind=skill --apply
 */

import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const kindArg = process.argv.find((a) => a.startsWith("--kind="))?.slice(7) || "both";
const CONCURRENCY = 30;
const BUCKET = "content";

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Read object size from a path. Storage list() returns metadata.size for free,
// but per-path lookup is awkward (no head endpoint). We can use the storage
// info() method on each object, OR list the parent prefix once and lookup.
// For ~100k objects, listing the prefix once and building a map is faster.
async function buildSizeMap(sb, prefix) {
  console.log(`[backfill-bytes] listing Storage objects in '${prefix}/'...`);
  const map = new Map();
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await sb.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const o of data) {
      if (o.name && o.metadata?.size) {
        map.set(`${prefix}/${o.name}`, o.metadata.size);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`[backfill-bytes] ${map.size} objects with size in '${prefix}/'`);
  return map;
}

async function backfillTable(sb, table, prefix) {
  console.log(`\n[backfill-bytes] === ${table} ===`);

  // Pull all rows missing byte_count
  const { count: total } = await sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .not("content_path", "is", null);
  console.log(`[backfill-bytes] ${total} rows with content_path set`);

  if (total === 0) return { processed: 0, updated: 0 };

  const sizeMap = await buildSizeMap(sb, prefix);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let cursor = null;

  while (true) {
    let q = sb
      .from(table)
      .select("id, metadata, content_path")
      .not("content_path", "is", null)
      .order("id", { ascending: true })
      .limit(500);
    if (cursor) q = q.gt("id", cursor);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;

    cursor = data[data.length - 1].id;

    // Parallel UPDATEs with bounded concurrency
    const queue = data.slice();
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        processed++;
        if (row.metadata?.byte_count != null) {
          skipped++;
          continue; // already done
        }
        const size = sizeMap.get(row.content_path);
        if (size == null) continue; // object missing from Storage, skip

        if (apply) {
          const newMeta = { ...(row.metadata || {}), byte_count: size };
          const { error: uErr } = await sb
            .from(table)
            .update({ metadata: newMeta })
            .eq("id", row.id);
          if (uErr) {
            console.warn(`  ✗ ${row.id}: ${uErr.message}`);
            continue;
          }
        }
        updated++;
      }
    });
    await Promise.all(workers);

    process.stdout.write(
      `\r  processed ${processed} / ${total} · updated ${updated} · skipped ${skipped}`
    );
  }
  console.log();
  return { processed, updated, skipped };
}

async function main() {
  const sb = makeSupabase();
  console.log(`[backfill-bytes] starting · ${apply ? "APPLY" : "DRY RUN"}`);

  if (kindArg === "skill" || kindArg === "both") {
    const r = await backfillTable(sb, "skills", "skills");
    console.log(
      `[backfill-bytes] skills · processed ${r.processed} · updated ${r.updated} · skipped ${r.skipped}`
    );
  }
  if (kindArg === "claude_md" || kindArg === "both") {
    const r = await backfillTable(sb, "claude_md_files", "claude-md");
    console.log(
      `[backfill-bytes] claude_md · processed ${r.processed} · updated ${r.updated} · skipped ${r.skipped}`
    );
  }

  console.log(
    `\n[backfill-bytes] DONE. ${apply ? "Changes committed." : "DRY RUN — re-run with --apply."}`
  );
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
