#!/usr/bin/env node
import "../_env.mjs";
/**
 * Seed the `tasks` table from `built-in-tasks.json`.
 *
 * Usage:
 *   npm run bench:seed-tasks               # all categories
 *   npm run bench:seed-tasks -- --kind=skill --category=document
 *   npm run bench:seed-tasks -- --dry-run
 *
 * Idempotent — uses (slug) UNIQUE constraint to skip already-inserted tasks.
 * The slug is derived deterministically from kind + category + title.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { kind: null, category: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
    else if (a.startsWith("--category=")) out.category = a.slice(11);
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const args = parseArgs(process.argv);
  const sb = args.dryRun ? null : makeSupabase();
  if (!args.dryRun && !sb) {
    console.error(
      "[seed-tasks] Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const raw = await fs.readFile(path.join(__dirname, "built-in-tasks.json"), "utf-8");
  const data = JSON.parse(raw);

  const rows = [];
  for (const kind of Object.keys(data)) {
    if (args.kind && args.kind !== kind) continue;
    for (const category of Object.keys(data[kind])) {
      if (args.category && args.category !== category) continue;
      for (const t of data[kind][category]) {
        const slug = slugify(`${kind}-${category}-${t.title}`);
        rows.push({
          slug,
          category,
          title: t.title,
          description: t.description,
          input_data: t.input_data || {},
          rubric: t.rubric || { signal: null, difficulty: t.difficulty || "medium" },
          difficulty: t.difficulty || "medium",
        });
      }
    }
  }

  console.log(`[seed-tasks] prepared ${rows.length} tasks`);
  if (args.dryRun) {
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    console.log(`... (${rows.length - 3} more)`);
    return;
  }

  // Upsert by slug — idempotent re-runs.
  const { error, count } = await sb
    .from("tasks")
    .upsert(rows, { onConflict: "slug", count: "exact" });
  if (error) {
    console.error(`[seed-tasks] insert failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`[seed-tasks] upserted ${count ?? rows.length} rows`);
}

main().catch((err) => {
  console.error(`[seed-tasks] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
