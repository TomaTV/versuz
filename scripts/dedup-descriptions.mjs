#!/usr/bin/env node
import "./_env.mjs";

/**
 * Near-duplicate detection via description_hash (migration 0039).
 *
 * Groupe les rows par description_hash, garde celui avec :
 *   1. plus de stars
 *   2. plus de forks
 *   3. is_official == true
 *   4. id stable (UUID asc) en dernier recours
 *
 * Le reste est archivé (is_archived = true, migration 0041).
 *
 *   node scripts/dedup-descriptions.mjs                  # dry-run
 *   node scripts/dedup-descriptions.mjs --apply          # vraiment archive
 *   node scripts/dedup-descriptions.mjs --kind=skill     # skills only
 *   node scripts/dedup-descriptions.mjs --kind=claude_md # claude_md only
 *   node scripts/dedup-descriptions.mjs --delete         # DROP au lieu d'archive (irréversible)
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const out = { apply: false, kind: "both", delete: false };
  for (const a of argv.slice(2)) {
    if (a === "--apply") out.apply = true;
    else if (a === "--delete") out.delete = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function pickWinner(rows) {
  // Sort : stars DESC, forks DESC, is_official DESC, id ASC
  return [...rows].sort((a, b) => {
    const sa = a.github_stars || 0;
    const sb = b.github_stars || 0;
    if (sa !== sb) return sb - sa;
    const fa = a.metadata?.forks || 0;
    const fb = b.metadata?.forks || 0;
    if (fa !== fb) return fb - fa;
    if (a.is_official !== b.is_official) return a.is_official ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  })[0];
}

async function processTable(sb, table, opts) {
  console.log(`[dedup-desc] scanning ${table}…`);
  const { data, error } = await sb
    .from(table)
    .select("id, slug, description_hash, github_stars, metadata, is_official")
    .not("description_hash", "is", null);
  if (error) throw error;

  // Group by hash
  const groups = new Map();
  for (const r of data || []) {
    const arr = groups.get(r.description_hash) || [];
    arr.push(r);
    groups.set(r.description_hash, arr);
  }

  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`[dedup-desc] ${table}: ${groups.size} unique hashes · ${dupGroups.length} groups with duplicates`);

  let archivedTotal = 0;
  for (const [hash, rows] of dupGroups) {
    const winner = pickWinner(rows);
    const losers = rows.filter((r) => r.id !== winner.id);
    const slugs = losers.map((r) => r.slug);
    console.log(`  [hash ${hash.slice(0, 8)}…] keep ${winner.slug} (★${winner.github_stars || 0}) drop ${losers.length}: ${slugs.slice(0, 5).join(", ")}${slugs.length > 5 ? "…" : ""}`);
    if (opts.apply) {
      const ids = losers.map((r) => r.id);
      if (opts.delete) {
        const { error: dErr } = await sb.from(table).delete().in("id", ids);
        if (dErr) console.warn(`    delete failed: ${dErr.message}`);
        else archivedTotal += ids.length;
      } else {
        const { error: uErr } = await sb.from(table).update({ is_archived: true }).in("id", ids);
        if (uErr) {
          // is_archived column might not exist yet → fallback to delete
          if (uErr.message.includes("is_archived")) {
            console.warn(`    is_archived column missing — falling back to delete`);
            const { error: dErr } = await sb.from(table).delete().in("id", ids);
            if (dErr) console.warn(`    delete failed: ${dErr.message}`);
            else archivedTotal += ids.length;
          } else {
            console.warn(`    update failed: ${uErr.message}`);
          }
        } else {
          archivedTotal += ids.length;
        }
      }
    }
  }
  console.log(`[dedup-desc] ${table}: ${opts.apply ? (opts.delete ? "deleted" : "archived") : "would archive"} ${archivedTotal} rows`);
  return archivedTotal;
}

async function main() {
  const opts = parseArgs(process.argv);
  const sb = makeSupabase();
  let total = 0;
  if (opts.kind === "skill" || opts.kind === "both") {
    total += await processTable(sb, "skills", opts);
  }
  if (opts.kind === "claude_md" || opts.kind === "both") {
    total += await processTable(sb, "claude_md_files", opts);
  }
  console.log(`[dedup-desc] DONE · ${total} rows ${opts.apply ? (opts.delete ? "deleted" : "archived") : "would be archived (re-run with --apply)"}`);
}

main().catch((err) => {
  console.error(`[dedup-desc] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
