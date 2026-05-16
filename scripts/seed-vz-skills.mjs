#!/usr/bin/env node
import "./_env.mjs";

/**
 * Seed Versuz first-party "Featured" skills into the registry.
 *
 * These are the vz-* SKILL.md files we author + curate ourselves. They go in
 * at tier='featured', verification_level=4, with author_user_id set to the
 * Versuz admin (env SEED_AUTHOR_USER_ID) so they appear as "Yours" in admin.
 *
 * 100% of revenue stays with Versuz (no Connect destination_charges split,
 * because the seller IS Versuz). Read the SKILL.md content from disk so we
 * can iterate on the markdown without re-running this script for every change
 * (re-run = re-upsert).
 *
 * Usage :
 *   node scripts/seed-vz-skills.mjs                # upsert all
 *   node scripts/seed-vz-skills.mjs --dry-run      # just print what would land
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
import matter from "gray-matter";
import { contentHash } from "./_hash.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source lives under .private/vz-skills/ (git-ignored). Customers buy the
// markdown via Stripe, the file itself never ships to the public repo.
const VZ_SKILLS_DIR = path.resolve(__dirname, "..", ".private", "vz-skills");

const SKILLS = [
  {
    folder: "vz-changelog",
    category: "shell",
    price_usd: 0.99,
    description: "Generate semantic changelog from git history using Conventional Commits. Groups by type, links PRs and SHAs, infers semver bump.",
  },
  {
    folder: "vz-pdf-extract",
    category: "document",
    price_usd: 1.99,
    description: "Extract structured text, tables, and form fields from PDFs into JSON. Three-tier fallback (pdfplumber → pdfminer → Tesseract OCR) with deterministic schema and per-page provenance.",
  },
  {
    folder: "vz-sql-migrate",
    category: "sql",
    price_usd: 1.99,
    description: "Production-safe Postgres migrations with explicit forward + rollback, lock-aware DDL, idempotence checks. Catches the classic mistakes before they ship.",
  },
  {
    folder: "vz-stripe-connect",
    category: "code",
    price_usd: 2.99,
    description: "Wire Stripe Connect Express + destination charges + webhooks into Next.js + Supabase, with all the gotchas (raw body, signature verification, idempotency, RLS, refund + dispute handling).",
  },
  {
    folder: "vz-readme-gen",
    category: "document",
    price_usd: 3.99,
    description: "Generate an opinionated, accurate README.md by reading package.json + git log + LICENSE + folder layout. Detects framework, infers commands, derives pitch from recent commits. Output ships as-is.",
  },
  {
    folder: "vz-vercel-deploy",
    category: "devops",
    price_usd: 5.99,
    description: "Take a Next.js / Vite / Astro / SvelteKit / Remix project from local-only to live on Vercel in one pass. Framework detection, env var sync, GitHub auto-deploys, domain setup with the Cloudflare proxy-off warning.",
  },
  {
    folder: "vz-supabase-migration",
    category: "sql",
    price_usd: 4.99,
    description: "Author and apply a Postgres migration on Supabase the production-safe way. Footgun checklist (unsafe defaults, RLS drift, missing FK indexes), atomic apply via CLI or MCP, TypeScript types regenerated automatically.",
  },
];

const isDryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorId = process.env.SEED_AUTHOR_USER_ID;

if (!url || !serviceKey) {
  console.error("[seed-vz] missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!authorId && !isDryRun) {
  console.error("[seed-vz] missing SEED_AUTHOR_USER_ID — set it in .env.local to the Versuz admin user UUID");
  console.error("         Run with --dry-run to preview without it.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function loadSkill({ folder, category, price_usd, description }) {
  const filePath = path.join(VZ_SKILLS_DIR, folder, "SKILL.md");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const name = fm.name || folder;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64);

  return {
    slug,
    name,
    description: fm.description || description,
    category,
    tier: "featured",
    price_usd,
    verification_level: 4,            // featured tier
    verified_at: new Date().toISOString(),
    author_user_id: authorId,
    github_url: `https://versuz.dev/skills/${slug}`,  // canonical first-party URL
    github_stars: 0,                                   // not on github
    skill_md_content: raw,
    content_hash: contentHash(raw),
    metadata: {
      author: "versuz",
      owner: "versuz",
      repo: folder,
      path: "SKILL.md",
      tools: Array.isArray(fm.tools) ? fm.tools : [],
      model: fm.model || null,
      license: fm.license || "Versuz Featured",
      classifier_confidence: 1.0,
      skill_type: "minimal",
      bundle_files: [],
      bundle_size_bytes: 0,
      source: "vz-first-party",
    },
  };
}

async function main() {
  console.log(`[seed-vz] loading ${SKILLS.length} skills from ${VZ_SKILLS_DIR}`);
  const rows = [];
  for (const s of SKILLS) {
    try {
      const row = await loadSkill(s);
      rows.push(row);
      console.log(`  ✓ ${row.slug} → ${row.category} · $${row.price_usd} · ${row.skill_md_content.length} chars`);
    } catch (err) {
      console.error(`  ✗ ${s.folder} : ${err.message}`);
    }
  }

  if (isDryRun) {
    console.log("\n[seed-vz] --dry-run set — would upsert :");
    for (const r of rows) console.log(`  - ${r.slug} (tier=${r.tier}, price=$${r.price_usd}, ver=${r.verification_level})`);
    return;
  }

  const { error, count } = await sb.from("skills").upsert(rows, {
    onConflict: "slug",
    count: "exact",
  });
  if (error) throw new Error(`upsert : ${error.message}`);
  console.log(`\n[seed-vz] DONE · upserted ${count} featured skills`);
  console.log(`[seed-vz] visible at /marketplace?type=skills&tier=featured`);
}

main().catch((err) => {
  console.error(`[seed-vz] FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
