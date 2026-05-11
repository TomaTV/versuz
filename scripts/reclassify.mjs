#!/usr/bin/env node
import "./_env.mjs";

/**
 * Bulk reclassify — re-run le keyword classifier sur tous les items en DB
 * (ou filtrés) pour les déplacer dans leur vraie catégorie après un bump
 * des keywords dans `scripts/scrape/classify.mjs` ou
 * `scripts/scrape-claude-md/classify-project.mjs`.
 *
 * Usage :
 *   node scripts/reclassify.mjs                    # tout (skills + claude_md)
 *   node scripts/reclassify.mjs --kind=skill       # skills uniquement
 *   node scripts/reclassify.mjs --kind=claude_md   # claude_md uniquement
 *   node scripts/reclassify.mjs --only-other       # ne reclassifie que les 'other'
 *   node scripts/reclassify.mjs --dry-run          # affiche sans écrire
 */

import { createClient } from "@supabase/supabase-js";
import { classifySkill } from "./scrape/classify.mjs";
import { classifyProject } from "./scrape-claude-md/classify-project.mjs";

function parseArgs(argv) {
  const out = { kind: "all", onlyOther: false, dryRun: false, batch: 500 };
  for (const tok of argv) {
    if (tok === "--dry-run") out.dryRun = true;
    else if (tok === "--only-other") out.onlyOther = true;
    else if (tok.startsWith("--kind=")) out.kind = tok.split("=")[1];
    else if (tok.startsWith("--batch=")) out.batch = Number(tok.split("=")[1]) || 500;
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[reclassify] missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function reclassifySkills(sb, args) {
  console.log("[reclassify] === skills ===");
  let from = 0;
  let totalProcessed = 0;
  let totalMoved = 0;
  const transitions = new Map(); // "old→new" → count

  while (true) {
    let q = sb
      .from("skills")
      .select("id, slug, name, description, category, skill_md_content, metadata")
      .order("id", { ascending: true })
      .range(from, from + args.batch - 1);
    if (args.onlyOther) q = q.eq("category", "other");
    const { data, error } = await q;
    if (error) { console.error(`[reclassify] fetch err : ${error.message}`); break; }
    if (!data || data.length === 0) break;

    const updates = [];
    for (const item of data) {
      const cls = classifySkill({
        name: item.name,
        description: item.description,
        body: item.skill_md_content,
        tools: item.metadata?.tools || [],
      });
      const newCat = cls?.id || "other";
      if (newCat !== item.category) {
        transitions.set(`${item.category}→${newCat}`, (transitions.get(`${item.category}→${newCat}`) || 0) + 1);
        totalMoved += 1;
        updates.push({ id: item.id, newCat });
      }
      totalProcessed += 1;
    }

    if (!args.dryRun && updates.length > 0) {
      // Update by groupes par target category (1 UPDATE par groupe)
      const groups = new Map();
      for (const u of updates) {
        if (!groups.has(u.newCat)) groups.set(u.newCat, []);
        groups.get(u.newCat).push(u.id);
      }
      for (const [cat, ids] of groups) {
        const { error: updErr } = await sb.from("skills").update({ category: cat }).in("id", ids);
        if (updErr) console.warn(`[reclassify]   update ${cat} (${ids.length}) failed : ${updErr.message}`);
      }
    }

    console.log(`[reclassify] batch ${from}-${from + data.length - 1} : ${updates.length} moved`);
    if (data.length < args.batch) break;
    from += args.batch;
  }

  console.log(`[reclassify] skills DONE : ${totalProcessed} processed, ${totalMoved} moved`);
  for (const [k, v] of [...transitions.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k} : ${v}`);
  }
}

async function reclassifyClaudeMd(sb, args) {
  console.log("[reclassify] === claude_md ===");
  let from = 0;
  let totalProcessed = 0;
  let totalMoved = 0;
  const transitions = new Map();

  while (true) {
    let q = sb
      .from("claude_md_files")
      .select("id, slug, project_category, content, metadata")
      .order("id", { ascending: true })
      .range(from, from + args.batch - 1);
    if (args.onlyOther) q = q.eq("project_category", "other");
    const { data, error } = await q;
    if (error) { console.error(`[reclassify] fetch err : ${error.message}`); break; }
    if (!data || data.length === 0) break;

    const updates = [];
    for (const item of data) {
      const cls = classifyProject({
        rootFiles: [],
        content: item.content,
        language: item.metadata?.language,
      });
      const newCat = cls?.id || "other";
      if (newCat !== item.project_category) {
        transitions.set(`${item.project_category}→${newCat}`, (transitions.get(`${item.project_category}→${newCat}`) || 0) + 1);
        totalMoved += 1;
        updates.push({ id: item.id, newCat });
      }
      totalProcessed += 1;
    }

    if (!args.dryRun && updates.length > 0) {
      const groups = new Map();
      for (const u of updates) {
        if (!groups.has(u.newCat)) groups.set(u.newCat, []);
        groups.get(u.newCat).push(u.id);
      }
      for (const [cat, ids] of groups) {
        const { error: updErr } = await sb.from("claude_md_files").update({ project_category: cat }).in("id", ids);
        if (updErr) console.warn(`[reclassify]   update ${cat} (${ids.length}) failed : ${updErr.message}`);
      }
    }

    console.log(`[reclassify] batch ${from}-${from + data.length - 1} : ${updates.length} moved`);
    if (data.length < args.batch) break;
    from += args.batch;
  }

  console.log(`[reclassify] claude_md DONE : ${totalProcessed} processed, ${totalMoved} moved`);
  for (const [k, v] of [...transitions.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k} : ${v}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[reclassify] kind=${args.kind} onlyOther=${args.onlyOther} dryRun=${args.dryRun}`);
  const sb = makeSupabase();
  if (args.kind === "all" || args.kind === "skill") await reclassifySkills(sb, args);
  if (args.kind === "all" || args.kind === "claude_md") await reclassifyClaudeMd(sb, args);
  console.log("[reclassify] all done");
}

main().catch((e) => { console.error("[reclassify] fatal :", e); process.exit(1); });
