#!/usr/bin/env node
import "./_env.mjs";

/**
 * Reclassify all skills (and optionally claude_md_files) with classifier v3
 * (multi-catégorie). Populate :
 *   - `categories` JSONB array — tous les buckets matchés, ordonnés desc
 *   - `category` (primary) — bucket leader
 *
 * Idempotent : peut être re-run sans risque. Itère en batch de 500.
 *
 *   node scripts/reclassify-all.mjs                  # skills + claude_md
 *   node scripts/reclassify-all.mjs --kind=skill
 *   node scripts/reclassify-all.mjs --kind=claude_md
 *   node scripts/reclassify-all.mjs --only-other     # only re-classify 'other' bucket
 *   node scripts/reclassify-all.mjs --dry-run        # print what would change, no write
 */

import { createClient } from "@supabase/supabase-js";
import { classifySkill } from "./scrape/classify.mjs";
import { classifyProject } from "./scrape-claude-md/classify-project.mjs";

const BATCH = 500;

function parseArgs(argv) {
  const out = { kind: "both", onlyOther: false, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--only-other") out.onlyOther = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function* iterateTable(sb, table, opts, catCol) {
  // Each table has different schema :
  //  - skills.skill_md_content + skills.name (display name)
  //  - claude_md_files.content (no "name" column — the file is identified
  //    only by slug + repo metadata)
  // Selecting non-existent columns crashes Postgres so we vary the SELECT.
  const contentCol = table === "skills" ? "skill_md_content" : "content";
  const cols =
    table === "skills"
      ? `id, ${catCol}, name, description, ${contentCol}, metadata, categories`
      : `id, ${catCol}, description, ${contentCol}, metadata, categories`;
  let from = 0;
  while (true) {
    let q = sb
      .from(table)
      .select(cols)
      .order("id", { ascending: true })
      .range(from, from + BATCH - 1);
    if (opts.onlyOther) q = q.eq(catCol, "other");
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return;
    yield data;
    if (data.length < BATCH) return;
    from += BATCH;
  }
}

async function reclassifySkills(sb, opts) {
  let scanned = 0, changed = 0, updated = 0;
  for await (const batch of iterateTable(sb, "skills", opts, "category")) {
    const updates = [];
    for (const row of batch) {
      scanned += 1;
      const cls = classifySkill({
        name: row.name || "",
        description: row.description || "",
        body: row.skill_md_content || "",
        tools: row.metadata?.tools || [],
      });
      const newPrimary = cls.id;
      const newCats = cls.categories && cls.categories.length > 0 ? cls.categories : [cls.id];
      const existingCats = Array.isArray(row.categories) ? row.categories : [];
      const sameCats =
        existingCats.length === newCats.length &&
        existingCats.every((c, i) => c === newCats[i]);
      if (row[`category`] === newPrimary && sameCats) continue;
      changed += 1;
      updates.push({ id: row.id, category: newPrimary, categories: newCats });
    }
    if (updates.length === 0) continue;
    if (opts.dryRun) {
      console.log(`[reclassify] [dry-run] would update ${updates.length} rows in skills (batch)`);
      console.log(updates.slice(0, 3));
    } else {
      // Parallel UPDATEs — 25 workers consuming the queue. Each row update
      // hits a different ID so no lock contention. 20-30× speedup over
      // sequential. Supabase REST API handles ~50 concurrent fine.
      const queue = updates.slice();
      const workers = Array.from({ length: 25 }, async () => {
        while (queue.length) {
          const u = queue.shift();
          if (!u) break;
          const { error } = await sb.from("skills").update({ category: u.category, categories: u.categories }).eq("id", u.id);
          if (error) {
            console.warn(`[reclassify] skill ${u.id} : ${error.message}`);
            continue;
          }
          updated += 1;
        }
      });
      await Promise.all(workers);
      console.log(`[reclassify] skills batch updated · scanned=${scanned} changed=${changed} updated=${updated}`);
    }
  }
  console.log(`[reclassify] skills DONE · scanned ${scanned} · changed ${changed} · updated ${updated}`);
}

async function reclassifyClaudeMds(sb, opts) {
  let scanned = 0, changed = 0, updated = 0;
  for await (const batch of iterateTable(sb, "claude_md_files", opts, "project_category")) {
    const updates = [];
    for (const row of batch) {
      scanned += 1;
      const cls = classifyProject({
        rootFiles: [],
        content: row.content || "",
        language: row.metadata?.language || null,
      });
      const newPrimary = cls.id;
      // classifyProject ne retourne pas categories[] aujourd'hui — emit single
      const newCats = [newPrimary];
      const existingCats = Array.isArray(row.categories) ? row.categories : [];
      const sameCats =
        existingCats.length === newCats.length &&
        existingCats.every((c, i) => c === newCats[i]);
      if (row.project_category === newPrimary && sameCats) continue;
      changed += 1;
      updates.push({ id: row.id, project_category: newPrimary, categories: newCats });
    }
    if (opts.dryRun) {
      console.log(`[reclassify] [dry-run] would update ${updates.length} rows in claude_md_files (batch)`);
    } else {
      // Parallel UPDATEs — see reclassifySkills for rationale.
      const queue = updates.slice();
      const workers = Array.from({ length: 25 }, async () => {
        while (queue.length) {
          const u = queue.shift();
          if (!u) break;
          const { error } = await sb.from("claude_md_files").update({ project_category: u.project_category, categories: u.categories }).eq("id", u.id);
          if (error) {
            console.warn(`[reclassify] claude_md ${u.id} : ${error.message}`);
            continue;
          }
          updated += 1;
        }
      });
      await Promise.all(workers);
      console.log(`[reclassify] claude_md batch · scanned=${scanned} changed=${changed} updated=${updated}`);
    }
  }
  console.log(`[reclassify] claude_md DONE · scanned ${scanned} · changed ${changed} · updated ${updated}`);
}

async function main() {
  const opts = parseArgs(process.argv);
  const sb = makeSupabase();
  if (opts.kind === "skill" || opts.kind === "both") {
    await reclassifySkills(sb, opts);
  }
  if (opts.kind === "claude_md" || opts.kind === "both") {
    await reclassifyClaudeMds(sb, opts);
  }
}

main().catch((err) => {
  console.error(`[reclassify] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
