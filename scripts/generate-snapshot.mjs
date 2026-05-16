#!/usr/bin/env node
import "./_env.mjs";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Regenerates src/lib/fixtures/snapshot.js with the current top 30 skills +
 * top 30 CLAUDE.md from the live DB. Used as a static fallback by
 * getPaginatedItemsInternal when Supabase queries error out.
 *
 * Run by hand every ~2 weeks (or after a big content drop) :
 *   node scripts/generate-snapshot.mjs
 *
 * Commit the regenerated snapshot.js. The marketplace page falls back to
 * this data automatically — no other wiring needed.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "../src/lib/fixtures/snapshot.js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[snapshot] NEXT_PUBLIC_SUPABASE_URL + a key required");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const SKILL_COLS = [
  "id", "slug", "name", "description", "category", "github_url",
  "github_stars", "byte_count", "tier", "price_usd", "verification_level",
  "is_official", "source", "license_spdx", "quality_score", "bench_tier",
  "top_rank_streak_days",
].join(", ");

const CLAUDE_MD_COLS = [
  "id", "slug", "description", "project_category", "github_url",
  "github_stars", "word_count", "byte_count", "tier", "price_usd",
  "verification_level", "is_official", "source", "license_spdx",
  "quality_score", "bench_tier", "top_rank_streak_days",
].join(", ");

async function fetchTopSkills() {
  const { data, error } = await sb
    .from("skills")
    .select(SKILL_COLS)
    .eq("is_archived", false)
    .not("quality_score", "is", null)
    .order("tier", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("quality_score", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

async function fetchTopClaudeMds() {
  const { data, error } = await sb
    .from("claude_md_files")
    .select(CLAUDE_MD_COLS)
    .or("is_archived.is.null,is_archived.eq.false")
    .not("quality_score", "is", null)
    .or("word_count.gte.40,word_count.is.null")
    .order("tier", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("quality_score", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

function escapeStr(s) {
  if (s == null) return "null";
  return JSON.stringify(String(s));
}

function rowToLiteral(row) {
  const entries = Object.entries(row).map(([k, v]) => {
    if (v === null || v === undefined) return `${k}: null`;
    if (typeof v === "number") return `${k}: ${v}`;
    if (typeof v === "boolean") return `${k}: ${v}`;
    return `${k}: ${escapeStr(v)}`;
  });
  return `  { ${entries.join(", ")} }`;
}

async function main() {
  console.log("[snapshot] fetching top 30 skills…");
  const skills = await fetchTopSkills();
  console.log(`[snapshot] got ${skills.length} skills`);

  console.log("[snapshot] fetching top 30 CLAUDE.md…");
  const claudeMds = await fetchTopClaudeMds();
  console.log(`[snapshot] got ${claudeMds.length} CLAUDE.md`);

  const today = new Date().toISOString().slice(0, 10);
  const content = `/**
 * Static fallback snapshot — top 30 skills + top 30 CLAUDE.md.
 *
 * Used by \`getPaginatedItemsInternal\` when the live Supabase query errors
 * out (statement_timeout, 5xx, etc.). Visitors see a realistic marketplace
 * grid with actual ranked items instead of an empty state.
 *
 * Snapshot date : ${today}. Regenerate with :
 *   node scripts/generate-snapshot.mjs
 *
 * Stay raw — these are direct Supabase row shapes so the existing
 * \`mapSkillRow\` / \`mapClaudeMdRow\` can consume them unchanged.
 */

export const SNAPSHOT_SKILLS = [
${skills.map(rowToLiteral).join(",\n")},
];

export const SNAPSHOT_CLAUDE_MDS = [
${claudeMds.map(rowToLiteral).join(",\n")},
];
`;

  writeFileSync(OUT, content, "utf8");
  console.log(`[snapshot] wrote ${OUT}`);
}

main().catch((err) => {
  console.error("[snapshot] failed :", err.message);
  process.exit(1);
});
