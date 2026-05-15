#!/usr/bin/env node
import "./_env.mjs";

/**
 * ⚠ LEGACY (post-R2 migration mai 2026) — résolu par R2 (pas de WAF block
 *   chez Cloudflare pour les contenus security/pentest). Code mort.
 *
 * Rescue the ~70 rows that the main migrate script couldn't push to Storage
 * because of slug-derived path issues (slug too long, illegal chars,
 * collision, etc.). We bypass the slug entirely and use the UUID `id` as
 * the Storage filename — always valid, always unique, always under the
 * 1024-byte path limit.
 *
 * Usage :
 *   node scripts/migrate-stragglers.mjs              # dry run preview
 *   node scripts/migrate-stragglers.mjs --apply      # actually upload + stamp
 *
 * Idempotent : the filter `content_path IS NULL AND content IS NOT NULL`
 * means re-running only picks up rows that still failed. Safe to spam.
 *
 * The frontend code resolves `content_path` literally — it doesn't care
 * whether the filename is the slug or the UUID. So this fix is transparent
 * to readers of the content.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "content";
const MAX_FILE_BYTES = 1024 * 1024; // bucket fileSizeLimit

function parseArgs() {
  return { apply: process.argv.includes("--apply") };
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function rescue(sb, { table, contentCol, prefix, apply }) {
  // Fetch ALL stragglers — there's only ~70, no pagination needed.
  const { data, error } = await sb
    .from(table)
    .select(`id, slug, ${contentCol}`)
    .is("content_path", null)
    .not(contentCol, "is", null)
    .order("id", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log(`[stragglers] ${table} : nothing pending. Skipping.`);
    return { migrated: 0, oversized: 0, failed: 0 };
  }

  console.log(`[stragglers] ${table} : ${data.length} pending rows`);

  let migrated = 0;
  let oversized = 0;
  let failed = 0;

  for (const row of data) {
    const body = row[contentCol];
    const bytes = Buffer.byteLength(body, "utf8");

    if (bytes > MAX_FILE_BYTES) {
      console.log(
        `  ⊘ ${row.slug.slice(0, 60)} · ${bytes} bytes > ${MAX_FILE_BYTES} (skip, keep inline)`
      );
      oversized++;
      continue;
    }

    // UUID-based path : always valid, never collides, always under 1024 bytes.
    const path = `${prefix}/${row.id}.md`;

    if (!apply) {
      console.log(
        `  · ${row.slug.slice(0, 60)} → ${path} (${bytes}B) [dry-run]`
      );
      continue;
    }

    // Convert to Buffer explicitly. Some rows have content that breaks
    // Supabase Storage's string-upload path (likely embedded null bytes or
    // weird UTF-8 sequences). Forcing a Buffer + Uint8Array gives a clean
    // binary upload that Storage MIME detection accepts.
    const buf = new Uint8Array(Buffer.from(body, "utf8"));

    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: "text/markdown; charset=utf-8",
      upsert: true,
      cacheControl: "3600",
    });
    if (upErr) {
      const firstChars = body.slice(0, 80).replace(/\s+/g, " ");
      const nullBytes = (body.match(/\0/g) || []).length;
      console.warn(
        `  ✗ ${row.slug.slice(0, 50)} (${bytes}B, nullBytes=${nullBytes}) : ${upErr.message}\n     preview: ${firstChars}`
      );
      failed++;
      continue;
    }
    const { error: dbErr } = await sb
      .from(table)
      .update({ content_path: path })
      .eq("id", row.id);
    if (dbErr) {
      console.warn(`  ✗ stamp ${row.slug} : ${dbErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ✓ ${row.slug.slice(0, 60)} → ${path}`);
    migrated++;
  }

  return { migrated, oversized, failed };
}

async function main() {
  const { apply } = parseArgs();
  const sb = makeSupabase();
  console.log(
    `[stragglers] starting · ${apply ? "APPLY MODE" : "DRY RUN (add --apply to commit)"}\n`
  );

  const sk = await rescue(sb, {
    table: "skills",
    contentCol: "skill_md_content",
    prefix: "skills",
    apply,
  });
  console.log(
    `[stragglers] skills · migrated ${sk.migrated} · oversized ${sk.oversized} · failed ${sk.failed}\n`
  );

  const cm = await rescue(sb, {
    table: "claude_md_files",
    contentCol: "content",
    prefix: "claude-md",
    apply,
  });
  console.log(
    `[stragglers] claude_md_files · migrated ${cm.migrated} · oversized ${cm.oversized} · failed ${cm.failed}\n`
  );

  console.log(
    apply
      ? "[stragglers] DONE. Stragglers rescued. The ~few oversized files keep their inline content as fallback."
      : "[stragglers] DRY RUN complete. Re-run with --apply to commit."
  );
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
