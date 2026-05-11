#!/usr/bin/env node
import "../_env.mjs";
/**
 * Versuz CLAUDE.md scraper.
 *
 *   npm run scrape:claude-md
 *   npm run scrape:claude-md -- --category=nextjs --keyword=react --max-pages=2
 *   npm run scrape:claude-md -- --dry-run --output=claude-mds.json
 *
 * Mirrors scripts/scrape/index.mjs but for CLAUDE.md files.
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  makeOctokit,
  searchClaudeMds,
  fetchClaudeMdContent,
  fetchRepoMeta,
  listRepoRoot,
} from "./github.mjs";
import { classifyProject } from "./classify-project.mjs";
import { createClient } from "@supabase/supabase-js";
import { contentHash } from "../_hash.mjs";
import { purgeContentDuplicates } from "../_dedup.mjs";
import { isOfficialOwner } from "../../src/lib/official-orgs.js";

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

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadKnownShas(sb) {
  if (!sb) return new Set();
  const { data, error } = await sb.from("claude_md_files").select("metadata");
  if (error) return new Set();
  return new Set((data || []).map((r) => r.metadata?.sha).filter(Boolean));
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[scrape-claude-md] starting · ${JSON.stringify(args)}`);

  const octokit = makeOctokit();
  const sb = args.dryRun ? null : makeSupabase();
  const knownShas = args.forceUpdate ? new Set() : await loadKnownShas(sb);
  if (args.forceUpdate) {
    console.log(`[scrape-claude-md] --force-update set — re-fetching all repos (existing SHAs ignored)`);
  } else if (knownShas.size) {
    console.log(`[scrape-claude-md] ${knownShas.size} already in DB — will skip unchanged`);
  }

  console.log("[scrape-claude-md] searching GitHub…");
  const candidates = await searchClaudeMds(octokit, {
    keyword: args.keyword,
    maxPages: args.maxPages,
  });
  console.log(`[scrape-claude-md] found ${candidates.length} candidates`);

  const rows = [];
  const seenSlugs = new Set();

  // Memoise repos.get + listRepoRoot per owner/repo. Each CLAUDE.md is at the
  // repo root so duplicates are rare, but the cache also covers `--force-update`
  // re-runs and protects against duplicate candidates from the search index.
  const repoMetaCache = new Map();
  const rootFilesCache = new Map();
  const fetchRepoMetaCached = (c) => {
    const key = `${c.owner}/${c.repo}`;
    if (!repoMetaCache.has(key)) repoMetaCache.set(key, fetchRepoMeta(octokit, c));
    return repoMetaCache.get(key);
  };
  const listRepoRootCached = (owner, repo, ref) => {
    const key = `${owner}/${repo}@${ref}`;
    if (!rootFilesCache.has(key)) {
      rootFilesCache.set(key, listRepoRoot(octokit, { owner, repo, ref }));
    }
    return rootFilesCache.get(key);
  };

  const candidatesToFetch = candidates.filter((c) => !knownShas.has(c.sha));
  const skipped = candidates.length - candidatesToFetch.length;

  const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY || 6);
  let cursor = 0;

  async function processOne(c) {
    try {
      const [content, repoMeta] = await Promise.all([
        fetchClaudeMdContent(octokit, c),
        fetchRepoMetaCached(c),
      ]);
      const rootFiles = await listRepoRootCached(c.owner, c.repo, repoMeta.default_branch);
      const cls = classifyProject({
        rootFiles,
        content,
        language: repoMeta.language,
      });
      if (args.category && cls.id !== args.category) return;

      const slugBase = slugify(`${c.owner}-${c.repo}`);
      let slug = slugBase;
      if (seenSlugs.has(slug)) slug = `${slugBase}-${c.sha.slice(0, 6)}`;
      seenSlugs.add(slug);

      const description = extractDescription(content) || repoMeta.description;

      rows.push({
        slug,
        github_url: repoMeta.html_url,
        github_stars: repoMeta.stars,
        description: description.slice(0, 240),
        project_category: cls.id,
        content,
        content_hash: contentHash(content),
        is_official: isOfficialOwner(c.owner),
        metadata: {
          owner: c.owner,
          repo: c.repo,
          author: repoMeta.owner_login,
          license: repoMeta.license,
          forks: repoMeta.forks,
          topics: repoMeta.topics,
          language: repoMeta.language,
          open_issues: repoMeta.open_issues,
          classifier_confidence: cls.confidence,
          pushed_at: repoMeta.pushed_at,
          word_count_hint: content.split(/\s+/).length,
          sha: c.sha,
        },
      });
      console.log(
        `[scrape-claude-md] kept ${c.owner}/${c.repo} → ${cls.id} (conf ${cls.confidence.toFixed(2)}, ★${repoMeta.stars})`
      );

      // Real-time drip : flush rows incrementally so items appear on
      // /marketplace within seconds. SCRAPE_BATCH=0 = old behavior.
      const batch = Number(process.env.SCRAPE_BATCH || 5);
      if (batch > 0 && !args.dryRun && sb && rows.length >= batch) {
        const flush = rows.splice(0);
        try {
          const bySlug = new Map();
          for (const r of flush) {
            const ex = bySlug.get(r.slug);
            if (!ex || (r.github_stars || 0) > (ex.github_stars || 0)) bySlug.set(r.slug, r);
          }
          const deduped = [...bySlug.values()];
          const { error, count } = await sb
            .from("claude_md_files")
            .upsert(deduped, { onConflict: "slug", count: "exact" });
          if (error) {
            console.warn(`[scrape-claude-md] live flush err : ${error.message} — keeping rows for final batch`);
            rows.unshift(...flush);
          } else {
            totalUpserted += count || deduped.length;
            console.log(`[scrape-claude-md] ✓ live flush ${count || deduped.length} (total ${totalUpserted})`);
          }
        } catch (e) {
          console.warn(`[scrape-claude-md] live flush err : ${e.message}`);
          rows.unshift(...flush);
        }
      }
    } catch (err) {
      console.warn(`[scrape-claude-md] error on ${c.html_url} — ${err.message}`);
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
    `[scrape-claude-md] processing ${candidatesToFetch.length} candidates · concurrency=${CONCURRENCY}`
  );
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(
    `[scrape-claude-md] ${rows.length} rows ready · ${skipped} skipped (sha unchanged) · ${dt}s · ${repoMetaCache.size} unique repos`
  );

  if (args.output) {
    const outPath = path.resolve(process.cwd(), args.output);
    await fs.writeFile(outPath, JSON.stringify(rows, null, 2));
    console.log(`[scrape-claude-md] wrote ${rows.length} rows to ${outPath}`);
  }
  if (!args.dryRun && sb) {
    // Dedup by slug — different repos can produce the same slug
    // (`owner-repo`). Postgres ON CONFLICT DO UPDATE refuses to update the
    // same row twice in one statement. Keep the highest-stars candidate.
    const bySlug = new Map();
    for (const r of rows) {
      const existing = bySlug.get(r.slug);
      if (!existing || (r.github_stars || 0) > (existing.github_stars || 0)) {
        bySlug.set(r.slug, r);
      }
    }
    const deduped = [...bySlug.values()];
    const collapsed = rows.length - deduped.length;
    if (collapsed > 0) {
      console.log(`[scrape-claude-md] collapsed ${collapsed} duplicate slug(s) before upsert`);
    }
    // Filter exact content duplicates (same SHA, different repo)
    const { data: existing } = await sb
      .from("claude_md_files")
      .select("slug, content_hash")
      .not("content_hash", "is", null);
    const hashToSlug = new Map((existing || []).map((r) => [r.content_hash, r.slug]));
    const filtered = deduped.filter((r) => {
      const dupSlug = hashToSlug.get(r.content_hash);
      if (dupSlug && dupSlug !== r.slug) {
        console.log(`[scrape-claude-md] skip ${r.slug} — exact content duplicate of ${dupSlug}`);
        return false;
      }
      return true;
    });
    const removed = deduped.length - filtered.length;
    if (removed > 0) {
      console.log(`[scrape-claude-md] dropped ${removed} content-duplicate row(s)`);
    }
    if (!filtered.length) {
      console.log(`[scrape-claude-md] nothing to upsert after dedup`);
      return;
    }
    const { error, count } = await sb
      .from("claude_md_files")
      .upsert(filtered, { onConflict: "slug", count: "exact" });
    if (error) throw new Error(`[upsert] ${error.message}`);
    console.log(`[scrape-claude-md] upserted ${count} rows`);
    const { deleted } = await purgeContentDuplicates(sb, "claude_md_files");
    if (deleted > 0) console.log(`[scrape-claude-md] auto-purged ${deleted} content duplicate(s)`);
  } else if (!args.dryRun) {
    console.log(`[scrape-claude-md] Supabase env missing — would have upserted ${rows.length}`);
  } else {
    console.log("[scrape-claude-md] --dry-run set — skipping write");
  }
}

function extractDescription(content) {
  // First non-empty, non-heading line, up to 240 chars
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    return t.replace(/[*_`]/g, "");
  }
  return "";
}

main().catch((err) => {
  console.error(`[scrape-claude-md] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
