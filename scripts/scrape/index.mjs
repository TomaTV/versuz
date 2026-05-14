#!/usr/bin/env node
import "../_env.mjs";
/**
 * Versuz scraper — orchestrator.
 *
 *   npm run scrape                       # all categories
 *   npm run scrape -- --category=document
 *   npm run scrape -- --keyword=pdf --max-pages=2
 *   npm run scrape -- --dry-run          # don't write to Supabase
 *   npm run scrape -- --output=skills.json   # also dump to a JSON file
 *
 * Writes scraped skills to Supabase (`skills` table) and prints a summary.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  makeOctokit,
  searchSkills,
  fetchSkillContent,
  fetchRepoMeta,
  listSkillBundle,
} from "./github.mjs";
import { parseSkillMd } from "./parse.mjs";
import { classifySkill } from "./classify.mjs";
import { makeSupabase, upsertSkills } from "./upsert.mjs";
import { isOfficialOwner } from "../../src/lib/official-orgs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {
    category: null,
    keyword: "",
    maxPages: 2,
    dryRun: false,
    output: null,
    forceUpdate: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--force-update") out.forceUpdate = true;
    else if (arg.startsWith("--category=")) out.category = arg.slice(11);
    else if (arg.startsWith("--keyword=")) out.keyword = arg.slice(10);
    else if (arg.startsWith("--max-pages=")) out.maxPages = Number(arg.slice(12)) || 2;
    else if (arg.startsWith("--output=")) out.output = arg.slice(9);
  }
  return out;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function loadKnownSkillShas(sb) {
  if (!sb) return new Set();
  const { data, error } = await sb.from("skills").select("metadata");
  if (error) return new Set();
  return new Set((data || []).map((r) => r.metadata?.sha).filter(Boolean));
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[scrape] starting · ${JSON.stringify(args)}`);

  const octokit = makeOctokit();
  const sb = args.dryRun ? null : makeSupabase();
  const knownShas = args.forceUpdate ? new Set() : await loadKnownSkillShas(sb);
  if (args.forceUpdate) {
    console.log(`[scrape] --force-update set — re-fetching all repos (existing SHAs ignored)`);
  } else if (knownShas.size) {
    console.log(`[scrape] ${knownShas.size} skills already in DB — will skip unchanged ones`);
  }

  // 1. SEARCH
  console.log("[scrape] searching GitHub for SKILL.md files…");
  const candidates = await searchSkills(octokit, {
    keyword: args.keyword,
    maxPages: args.maxPages,
  });
  console.log(`[scrape] found ${candidates.length} candidates`);

  // 2. FETCH + PARSE + CLASSIFY (parallelised + repo-meta memoised)
  const rows = [];
  const seenSlugs = new Set();
  let skipped = 0;

  // Memoise repos.get per owner/repo: many candidates share the same repo
  // (anthropic-skills hosts dozens of SKILL.md). Without this we'd burn the
  // 5000/h core API budget on duplicates.
  const repoMetaCache = new Map();
  const fetchRepoMetaCached = (c) => {
    const key = `${c.owner}/${c.repo}`;
    if (!repoMetaCache.has(key)) {
      repoMetaCache.set(key, fetchRepoMeta(octokit, c));
    }
    return repoMetaCache.get(key);
  };

  const candidatesToFetch = candidates.filter((c) => !knownShas.has(c.sha));
  skipped = candidates.length - candidatesToFetch.length;

  const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY || 6);
  let cursor = 0;

  async function processOne(c) {
    try {
      const [content, repoMeta] = await Promise.all([
        fetchSkillContent(octokit, c),
        fetchRepoMetaCached(c),
      ]);
      const bundle = await listSkillBundle(octokit, {
        owner: c.owner,
        repo: c.repo,
        path: c.path,
        ref: repoMeta.default_branch,
      });
      const skillType = bundle.length === 0 ? "minimal" : "bundled";
      const bundleSize = bundle.reduce((sum, f) => sum + (f.size || 0), 0);
      const parsed = parseSkillMd(content);
      if (!parsed.ok) {
        console.warn(`[scrape] skip ${c.html_url} — ${parsed.error}`);
        return;
      }
      const cls = classifySkill(parsed);
      if (!cls.id) {
        console.warn(`[scrape] skip ${parsed.name} — no category match`);
        return;
      }
      if (args.category && cls.id !== args.category) return;

      let slug = slugify(parsed.name);
      if (seenSlugs.has(slug)) slug = slugify(`${parsed.name}-${c.owner}`);
      seenSlugs.add(slug);

      rows.push({
        slug,
        name: parsed.name,
        description: parsed.description,
        github_url: repoMeta.html_url,
        github_stars: repoMeta.stars,
        category: cls.id,
        categories: cls.categories || [cls.id],
        skill_md_content: content,
        is_official: isOfficialOwner(c.owner),
        license_spdx: repoMeta.license || null,
        metadata: {
          owner: c.owner,
          repo: c.repo,
          path: c.path,
          author: repoMeta.owner_login,
          license: repoMeta.license,
          forks: repoMeta.forks,
          topics: repoMeta.topics,
          language: repoMeta.language,
          open_issues: repoMeta.open_issues,
          tools: parsed.tools,
          model: parsed.model,
          classifier_confidence: cls.confidence,
          pushed_at: repoMeta.pushed_at,
          skill_type: skillType,
          bundle_files: bundle.map((f) => ({ name: f.name, type: f.type, size: f.size })),
          bundle_size_bytes: bundleSize,
          sha: c.sha,
        },
      });
      console.log(
        `[scrape] kept ${parsed.name} → ${cls.id} (${skillType}, conf ${cls.confidence.toFixed(2)}, ★${repoMeta.stars})`
      );

      // Real-time drip : flush rows incrementally so items appear on
      // /marketplace within seconds. Set SCRAPE_BATCH=0 to keep the old
      // behavior (one big upsert at the end).
      const batch = Number(process.env.SCRAPE_BATCH || 5);
      if (batch > 0 && !args.dryRun && sb && rows.length >= batch) {
        const flush = rows.splice(0);
        try {
          const r = await upsertSkills(sb, flush);
          if (!r.skipped) {
            totalUpserted += r.count || flush.length;
            console.log(`[scrape] ✓ live flush ${r.count || flush.length} (total ${totalUpserted})`);
          }
        } catch (e) {
          console.warn(`[scrape] live flush err : ${e.message} — keeping rows for final batch`);
          rows.unshift(...flush);
        }
      }
    } catch (err) {
      console.warn(`[scrape] error on ${c.html_url} — ${err.message}`);
    }
  }

  let totalUpserted = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= candidatesToFetch.length) return;
      await processOne(candidatesToFetch[i]);
    }
  }

  console.log(
    `[scrape] processing ${candidatesToFetch.length} candidates · concurrency=${CONCURRENCY}`
  );
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(
    `[scrape] ${rows.length} skills passed all gates · ${skipped} skipped (sha unchanged) · ${dt}s · ${repoMetaCache.size} unique repos fetched`
  );

  // 3. WRITE
  if (args.output) {
    const outPath = path.resolve(process.cwd(), args.output);
    await fs.writeFile(outPath, JSON.stringify(rows, null, 2));
    console.log(`[scrape] wrote ${rows.length} skills to ${outPath}`);
  }
  if (!args.dryRun) {
    if (rows.length > 0) {
      const result = await upsertSkills(sb, rows);
      if (result.skipped) {
        console.log(`[scrape] Supabase not configured — skipped ${result.count} upserts.`);
      } else {
        totalUpserted += result.count || rows.length;
        console.log(`[scrape] final flush ${result.count || rows.length} rows`);
      }
    }
    console.log(`[scrape] ${totalUpserted} rows upserted across all live flushes`);
  } else {
    console.log("[scrape] --dry-run set — skipping Supabase write");
  }

  console.log("[scrape] done.");
}

main().catch((err) => {
  console.error(`[scrape] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
