#!/usr/bin/env node
import "./_env.mjs";

/**
 * Seed Versuz first-party "Featured" CLAUDE.md files into the registry.
 *
 * These are the vz-* CLAUDE.md templates we author + curate ourselves. They
 * go in at tier='featured', verification_level=4, with author_user_id set
 * to the Versuz admin (env SEED_AUTHOR_USER_ID) so they appear as "Yours"
 * in admin.
 *
 * 100% of revenue stays with Versuz (no Connect destination_charges split).
 * Reads the CLAUDE.md content from disk so we can iterate on the markdown
 * without re-running this script for every change (re-run = re-upsert).
 *
 * Usage :
 *   node scripts/seed-vz-claude-md.mjs                # upsert all
 *   node scripts/seed-vz-claude-md.mjs --dry-run      # just print what would land
 *
 * Env required :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_AUTHOR_USER_ID                            # uuid of the Versuz admin user
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { contentHash } from "./_hash.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source lives under .private/vz-claude-md/ (git-ignored). Customers buy
// the markdown via Stripe, the file itself never ships to the public repo.
const VZ_CLAUDE_MD_DIR = path.resolve(__dirname, "..", ".private", "vz-claude-md");

const FILES = [
  {
    folder: "vz-nextjs-starter",
    project_category: "nextjs",
    price_usd: 9.99,
    slug: "vz-nextjs-starter",
    name: "Versuz Next.js Starter Context",
    description: "Production-grade CLAUDE.md for any Next.js 16 + React 19 + TypeScript + Tailwind v4 + Supabase + Vercel project. Encodes the senior-team 2026 defaults : server-first, end-to-end types, RLS everywhere, perf budgets, async params, no silent fallbacks. Drop at repo root, tweak the identity section, ship features.",
  },
];

const isDryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorId = process.env.SEED_AUTHOR_USER_ID;

if (!url || !serviceKey) {
  console.error("[seed-vz-md] missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!authorId && !isDryRun) {
  console.error("[seed-vz-md] missing SEED_AUTHOR_USER_ID — set it in .env.local to the Versuz admin user UUID");
  console.error("            Run with --dry-run to preview without it.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function loadFile({ folder, project_category, price_usd, slug, name, description }) {
  const filePath = path.join(VZ_CLAUDE_MD_DIR, folder, "CLAUDE.md");
  const raw = await fs.readFile(filePath, "utf-8");

  return {
    slug,
    description,
    project_category,
    tier: "featured",
    price_usd,
    verification_level: 4,            // featured tier
    verified_at: new Date().toISOString(),
    author_user_id: authorId,
    github_url: `https://versuz.dev/claude-md/${project_category}/${slug}`,
    github_stars: 0,
    word_count: raw.split(/\s+/).filter(Boolean).length,
    byte_count: Buffer.byteLength(raw, "utf8"),
    content: raw,
    content_hash: contentHash(raw),
    metadata: {
      author: "versuz",
      owner: "versuz",
      repo: folder,
      path: "CLAUDE.md",
      license: "Versuz Featured",
      classifier_confidence: 1.0,
      source: "vz-first-party",
      title: name,
    },
  };
}

async function main() {
  console.log(`[seed-vz-md] loading ${FILES.length} CLAUDE.md from ${VZ_CLAUDE_MD_DIR}`);
  const rows = [];
  for (const f of FILES) {
    try {
      const row = await loadFile(f);
      rows.push(row);
      console.log(`  ✓ ${row.slug} → ${row.project_category} · $${row.price_usd} · ${row.byte_count} bytes · ${row.word_count} words`);
    } catch (err) {
      console.error(`  ✗ ${f.folder} : ${err.message}`);
    }
  }

  if (isDryRun) {
    console.log("\n[seed-vz-md] --dry-run set — would upsert :");
    for (const r of rows) console.log(`  - ${r.slug} (tier=${r.tier}, price=$${r.price_usd}, ver=${r.verification_level})`);
    return;
  }

  const { error, count } = await sb.from("claude_md_files").upsert(rows, {
    onConflict: "slug",
    count: "exact",
  });
  if (error) throw new Error(`upsert : ${error.message}`);
  console.log(`\n[seed-vz-md] DONE · upserted ${count} featured CLAUDE.md`);
  console.log(`[seed-vz-md] visible at /marketplace?type=claude-md&tier=featured`);
}

main().catch((err) => {
  console.error(`[seed-vz-md] FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
