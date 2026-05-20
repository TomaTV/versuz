#!/usr/bin/env node
import "../_env.mjs";

import { listSkillBundle } from "../scrape/github.mjs";

/**
 * Versuz code-search scraper — orchestrateur Sourcegraph + grep.app.
 *
 * Pourquoi : GitHub Code Search plafonne à 30 req/min + 1000-result hard
 * ceiling. Sourcegraph et grep.app indexent du code public sans cette
 * limite (rate limit ~5000/h sans auth) → 3-5× la capacité de discovery.
 *
 * Flow :
 *   1. Query Sourcegraph + grep.app pour `file:SKILL.md` ou `file:CLAUDE.md`
 *   2. Dedup les matches par (owner, repo, path)
 *   3. Filter ce qu'on a déjà en DB (skip-by-slug → fast path)
 *   4. Fetch content via raw.githubusercontent.com (UNMETERED pour public)
 *   5. Fetch repo metadata via GitHub API (1 call/repo, rotation tokens)
 *   6. Parse + classify (réutilise scripts/scrape/parse.mjs + classify.mjs)
 *   7. Batch upsert avec content_hash dedup auto
 *
 * Usage :
 *   npm run scrape:codesearch                       # both sources, both kinds
 *   npm run scrape:codesearch -- --source=sourcegraph
 *   npm run scrape:codesearch -- --source=grepapp
 *   npm run scrape:codesearch -- --kind=skill --query=mcp
 *   npm run scrape:codesearch -- --dry-run
 *
 * Notes :
 *   - Skips repos déjà en DB par défaut (regarde `metadata.owner + metadata.repo`)
 *     Use --force-update pour re-fetch et re-classifier les existants.
 *   - Content fetch via raw.githubusercontent.com → pas de quota GitHub API
 *     consommé sur le fetch lui-même, juste sur le repo-meta (1 call/repo).
 */

import { createClient } from "@supabase/supabase-js";
import { searchSourcegraph } from "./sourcegraph.mjs";
import { searchGrepApp } from "./grepapp.mjs";
import { parseSkillMd } from "../scrape/parse.mjs";
import { classifySkill } from "../scrape/classify.mjs";
import { classifyProject } from "../scrape-claude-md/classify-project.mjs";
import { contentHash } from "../_hash.mjs";
import { purgeContentDuplicates } from "../_dedup.mjs";
import { offloadRowsToStorage } from "../_storage.mjs";
import { makeRotatingOctokit, tokenCount } from "../_github-tokens.mjs";
import { isOfficialOwner } from "../../src/lib/official-orgs.js";

function parseArgs(argv) {
  // source default = sourcegraph uniquement (grep.app bloqué Vercel anti-bot).
  // min-stars defaut = 50 → filter out les single-author throwaways. Set à 0
  // pour tout récupérer.
  // mode=single (default) → un seul scan. mode=exhaustive → chaîne toutes
  // les sub-queries (langs + keywords) pour atteindre le max.
  const out = { source: "sourcegraph", kind: "all", query: "", dryRun: false, forceUpdate: false, maxPages: 10, minStars: 50, mode: "single" };
  for (const tok of argv) {
    if (tok === "--dry-run") out.dryRun = true;
    else if (tok === "--force-update") out.forceUpdate = true;
    else if (tok === "--max") out.mode = "exhaustive";
    else if (tok.startsWith("--source=")) out.source = tok.split("=")[1];
    else if (tok.startsWith("--kind=")) out.kind = tok.split("=")[1];
    else if (tok.startsWith("--query=")) out.query = tok.split("=")[1];
    else if (tok.startsWith("--max-pages=")) out.maxPages = Number(tok.split("=")[1]) || 10;
    else if (tok.startsWith("--min-stars=")) out.minStars = Math.max(0, Number(tok.split("=")[1]) || 0);
    else if (tok.startsWith("--mode=")) out.mode = tok.split("=")[1];
  }
  return out;
}

// Sub-queries pour le mode exhaustive — chaque sous-query renvoie son propre
// lot ≤1000 chez SG. L'orchestrateur les chaîne. Skip-by-known fait le job
// de dédup entre runs successifs.
//
// Important : `lang:X` chez SG filtre la langue du FICHIER, pas du repo.
// Comme SKILL.md/CLAUDE.md sont toujours markdown, ces queries renvoient ~0
// match. On utilise donc uniquement des content-keywords ciblés sur le
// contenu réel des fichiers SKILL/CLAUDE.md.
const EXHAUSTIVE_QUERIES = [
  null,             // baseline no filter
  // Ecosystème agent / LLM
  "mcp",
  "agent",
  "claude",
  "anthropic",
  "openai",
  "gpt",
  "gemini",
  "llm",
  "rag",
  "tool",
  "function",
  // Tâches verticales
  "pdf",
  "sql",
  "database",
  "migration",
  "scraping",
  "testing",
  "deploy",
  "refactor",
  "review",
  "documentation",
  "api",
  "rest",
  "graphql",
  "auth",
  "stripe",
  "webhook",
  // Langs/stacks (filtre par contenu mentionnant le stack)
  "python",
  "typescript",
  "javascript",
  "react",
  "nextjs",
  "node",
  "rust",
  "golang",
  "kubernetes",
  "docker",
  "aws",
  "vercel",
  // Ajouts pour maximiser la découverte
  "workflow",
  "automation",
  "script",
  "cli",
  "bot",
  "integration",
  "plugin",
  "extension",
  "sdk",
  "library",
  "framework",
  "template",
  "boilerplate",
  "starter",
  "kit",
  "gcp",
  "azure",
  "vue",
  "angular",
  "svelte",
  "mysql",
  "postgres",
  "mongodb",
  "redis",
  "grpc",
  "websocket",
  "e2e",
  "unit",
  "ci",
  "cd",
  "pipeline",
  // Niches / frameworks spécifiques (non couverts)
  "langchain",
  "llamaindex",
  "autogen",
  "crewai",
  "dify",
  "flowise",
  "n8n",
  "zapier",
  "make",
  "ifttt",
  "homeassistant",
  "homebridge",
  "nodered",
  "obsidian",
  "notion",
  "figma",
  "sketch",
  "blender",
  "unity",
  "unreal",
  "godot",
  "shopify",
  "wordpress",
  "drupal",
  "magento",
  "webflow",
  "framer",
  "bubble",
  "outsystems",
  "retool",
  "airplane",
  "internal",
  "dashboard",
  "analytics",
  "bi",
  "etl",
  "data",
  "mlops",
  "jupyter",
  "colab",
  "huggingface",
  "transformers",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "vertex",
  "bedrock",
  "azure",
  "cognitive",
  "supabase",
  "prisma",
  "drizzle",
  "trpc",
  "tanstack",
  "shadcn",
  "radix",
  "tailwind",
  "storybook",
  "chromatic",
  "playwright",
  "cypress",
  "vitest",
  "jest",
  "mocha",
  "k6",
  "artillery",
  "locust",
  "fastapi",
  "flask",
  "django",
  "rails",
  "laravel",
  "symfony",
  "spring",
  "dotnet",
  "nestjs",
  "express",
  "hono",
  "elysia",
  "sveltekit",
  "remix",
  "astro",
  "solid",
  "qwik",
  "fresh",
  "bun",
  "deno",
  "tauri",
  "electron",
  "capacitor",
  "ionic",
  "reactnative",
  "flutter",
  "swiftui",
  "jetpack",
  "compose",
  "ktor",
];

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function fetchRaw(owner, repo, path, branch = "HEAD", defaultBranch = null) {
  // Try given branch, then the repo's actual default_branch (from API), then
  // main / master fallback. Critical for monorepos like openclaw/skills which
  // use a non-main default branch (e.g. `develop`, `next`, `trunk`) — without
  // this fix the scraper was 404'ing on ~80% of files inside them.
  const branches = [branch];
  if (defaultBranch && !branches.includes(defaultBranch)) branches.push(defaultBranch);
  for (const b of ["main", "master"]) {
    if (!branches.includes(b)) branches.push(b);
  }
  let lastStatus = 0;
  for (const b of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${path}`;
    const res = await fetch(url, {
      headers: { Accept: "text/plain", "User-Agent": "versuz-scraper/0.1" },
    });
    if (res.ok) return res.text();
    lastStatus = res.status;
  }
  throw new Error(`raw fetch ${lastStatus} for ${owner}/${repo}/${path}`);
}

async function fetchRepoMeta(octokit, owner, repo) {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      license: data.license?.spdx_id || null,
      topics: data.topics || [],
      language: data.language || null,
      open_issues: data.open_issues_count || 0,
      pushed_at: data.pushed_at || null,
      owner_login: data.owner?.login || owner,
      html_url: data.html_url,
      description: data.description || null,
      default_branch: data.default_branch || "main",
    };
  } catch (err) {
    if (err.status === 404 || err.status === 403) return null;
    throw err;
  }
}

function dedupMatches(matches) {
  const seen = new Set();
  const out = [];
  for (const m of matches) {
    const key = `${m.owner}/${m.repo}/${m.path}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

async function loadKnownRepos(sb, table, key) {
  if (!sb) return new Set();
  const out = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select("metadata, slug")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data) {
      const owner = r.metadata?.owner;
      const repo = r.metadata?.repo;
      if (owner && repo) out.add(`${String(owner).toLowerCase()}/${String(repo).toLowerCase()}`);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function processKind({ kind, args, sb, octokit }) {
  const filename = kind === "claude_md" ? "CLAUDE.md" : "SKILL.md";
  const table = kind === "claude_md" ? "claude_md_files" : "skills";

  // 1. Discovery
  const queryFragment = args.query ? ` ${args.query}` : "";
  // SG's stars filter syntax varies (has.stars / has.meta / repo.stars) et
  // certaines variantes silent-fail à 0 matches. On filter client-side via
  // `repoStars` retourné dans les matches (économise ~80% des fetches sans
  // bruit côté query).
  const sgQuery = `file:${filename} repo:^github\\.com.*$${queryFragment}`;
  const grepFilename = filename;

  const matches = [];
  if (args.source === "all" || args.source === "sourcegraph") {
    console.log(`[codesearch] querying Sourcegraph for ${filename}…`);
    try {
      const sg = await searchSourcegraph({ query: sgQuery, count: 1000 });
      console.log(`[codesearch]   sourcegraph → ${sg.length} matches`);
      matches.push(...sg);
    } catch (e) {
      console.warn(`[codesearch]   sourcegraph failed : ${e.message}`);
    }
  }
  if (args.source === "grepapp") {
    // grep.app est derrière Vercel anti-bot challenge — scripts headless ne
    // passent pas. Garde l'adapter en code mais explicite warn quand activé.
    console.warn(`[codesearch] grep.app est bloqué par Vercel anti-bot — skip.`);
    console.warn(`[codesearch] Use --source=sourcegraph (recommended) ou --source=all.`);
  }

  let unique = dedupMatches(matches);
  console.log(`[codesearch] ${unique.length} unique repo/path combos after dedup`);

  // Client-side min-stars filter — safety net si SG envoie quand même des
  // < 50 ★ (ex. parce que `has.stars` indispo, ou repoStars manquant).
  if (args.minStars > 0) {
    const before = unique.length;
    unique = unique.filter((m) => m.stars == null || m.stars >= args.minStars);
    if (unique.length < before) {
      console.log(`[codesearch] ${before - unique.length} dropped by min-stars=${args.minStars} pre-fetch`);
    }
  }

  if (unique.length === 0) return { kept: 0, skipped: 0, errors: 0 };

  // 2. Filter known repos (skip if already in DB)
  let candidates = unique;
  if (!args.forceUpdate) {
    const known = await loadKnownRepos(sb, table);
    candidates = unique.filter(
      (m) => !known.has(`${m.owner.toLowerCase()}/${m.repo.toLowerCase()}`)
    );
    console.log(`[codesearch] ${candidates.length} new (${unique.length - candidates.length} already in DB)`);
  }

  // 3. Per-candidate : fetch RAW FIRST (free & unlimited), then meta if needed.
  // This skips ~60-80% of GitHub API calls on dead repos or low-quality content.
  const rows = [];
  const repoMetaCache = new Map();
  let processed = 0;
  let errors = 0;

  for (const m of candidates) {
    processed += 1;
    try {
      // Try raw fetch FIRST without knowing default_branch (we try HEAD/main/master)
      let content;
      try {
        content = await fetchRaw(m.owner, m.repo, m.path, m.branch, null);
      } catch (rawErr) {
        // Raw failed (404/403) → repo dead or path invalid → skip without wasting API call
        continue;
      }
      // Quick content pre-filter (saves bandwidth & parse time)
      if (!content || content.length < 50) {
        continue;
      }
      // For skills: quick parse check before fetching meta
      if (kind === "skill") {
        const quickParsed = parseSkillMd(content);
        if (!quickParsed.ok) continue;
      }

      // Raw succeeded and content looks valid → NOW fetch metadata (stars, forks, etc.)
      const metaKey = `${m.owner}/${m.repo}`;
      if (!repoMetaCache.has(metaKey)) {
        repoMetaCache.set(metaKey, await fetchRepoMeta(octokit, m.owner, m.repo));
      }
      const repoMeta = repoMetaCache.get(metaKey);
      if (!repoMeta) {
        // Race condition: raw succeeded but repo now 404 (deleted during scrape)
        continue;
      }
      // Post-filter stars (now that we have real star count)
      if (args.minStars > 0 && (repoMeta.stars || 0) < args.minStars) {
        continue;
      }

      let row;
      if (kind === "skill") {
        const parsed = parseSkillMd(content);
        if (!parsed.ok) continue;
        const cls = classifySkill(parsed);
        const slug = slugify(parsed.name) || slugify(`${m.owner}-${m.repo}`);
        // Detect bundle files in the same directory as SKILL.md
        const bundle = await listSkillBundle(octokit, {
          owner: m.owner,
          repo: m.repo,
          path: m.path,
          ref: repoMeta.default_branch,
        });
        const skillType = bundle.length === 0 ? "minimal" : "bundled";
        const bundleSize = bundle.reduce((sum, f) => sum + (f.size || 0), 0);
        row = {
          slug,
          name: parsed.name,
          description: parsed.description,
          github_url: repoMeta.html_url,
          github_stars: repoMeta.stars,
          category: cls.id,
          categories: cls.categories || [cls.id],
          skill_md_content: content,
          content_hash: contentHash(content),
          is_official: isOfficialOwner(m.owner),
          license_spdx: repoMeta.license || null,
          metadata: {
            owner: m.owner,
            repo: m.repo,
            path: m.path,
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
            source: `codesearch:${m.source}`,
          },
        };
      } else {
        const cls = classifyProject({ rootFiles: [], content, language: repoMeta.language });
        const slug = slugify(`${m.owner}-${m.repo}`);
        const descMatch = content.match(/^#\s+(.+)$/m);
        const description = (descMatch?.[1] || repoMeta.description || `${m.owner}/${m.repo}`).slice(0, 240);
        row = {
          slug,
          github_url: repoMeta.html_url,
          github_stars: repoMeta.stars,
          description,
          project_category: cls.id,
          content,
          content_hash: contentHash(content),
          is_official: isOfficialOwner(m.owner),
          license_spdx: repoMeta.license || null,
          // word_count est une GENERATED column (migration 0002) calculée
          // automatiquement à partir de `content` — NE PAS écrire dedans.
          metadata: {
            owner: m.owner,
            repo: m.repo,
            author: repoMeta.owner_login,
            license: repoMeta.license,
            forks: repoMeta.forks,
            topics: repoMeta.topics,
            language: repoMeta.language,
            open_issues: repoMeta.open_issues,
            classifier_confidence: cls.confidence,
            pushed_at: repoMeta.pushed_at,
            source: `codesearch:${m.source}`,
          },
        };
      }
      rows.push(row);
      // Real-time drip : flush every 5 rows so items appear on /marketplace
      // within ~30s of being found instead of waiting for the whole scope.
      // Set SCRAPE_CS_BATCH=1 for instant visibility (one DB roundtrip per row).
      const csBatch = Number(process.env.SCRAPE_CS_BATCH || 5);
      if (rows.length >= csBatch) {
        console.log(`[codesearch]   processed ${processed}/${candidates.length} (${rows.length} kept)`);
        if (!args.dryRun && sb) await flush(rows, table, sb);
      }
    } catch (err) {
      errors += 1;
      if (errors < 5) console.warn(`[codesearch]   error on ${m.owner}/${m.repo}/${m.path} : ${err.message}`);
    }
  }

  // Final flush
  if (!args.dryRun && sb && rows.length > 0) {
    await flush(rows, table, sb);
  }

  console.log(`[codesearch] ${kind} done : ${processed} processed · ${errors} errors`);
  return { kept: rows.length, skipped: unique.length - candidates.length, errors };
}

async function flush(rows, table, sb) {
  if (rows.length === 0) return;
  // Dedup by slug AND by github_url before upsert — same repo can match 2
  // different paths (e.g. monorepo with multiple SKILL.md), and the slug
  // derivation rules can change between scrapes, leaving rows with same
  // github_url but new slug.
  const bySlug = new Map();
  for (const r of rows) {
    const existing = bySlug.get(r.slug);
    if (!existing || (r.github_stars || 0) > (existing.github_stars || 0)) {
      bySlug.set(r.slug, r);
    }
  }
  const byUrl = new Map();
  for (const r of bySlug.values()) {
    const key = String(r.github_url || "").toLowerCase();
    if (!key) {
      // No url — fall back to slug-keyed insert
      byUrl.set(r.slug, r);
      continue;
    }
    const existing = byUrl.get(key);
    if (!existing || (r.github_stars || 0) > (existing.github_stars || 0)) {
      byUrl.set(key, r);
    }
  }
  const batch = [...byUrl.values()];

  // Offload inline content → R2 (or Supabase Storage fallback) so DB stays
  // lean. Sets content_path + NULLs inline. Idempotent.
  const inlineKind = table === "skills" ? "skill" : "claude_md";
  await offloadRowsToStorage(batch, inlineKind, sb);

  // First try slug conflict (common case : fresh row or stable slug).
  let { error, count } = await sb
    .from(table)
    .upsert(batch, { onConflict: "slug", count: "exact" });
  if (error && error.code === "23505" && /github_url/.test(error.message)) {
    // Existing row with same github_url but different slug — retry on
    // github_url conflict so we update the existing row instead of inserting.
    const r2 = await sb
      .from(table)
      .upsert(batch, { onConflict: "github_url", count: "exact" });
    error = r2.error;
    count = r2.count;
  }

  if (error) {
    console.warn(`[codesearch]   upsert err : ${error.message}`);
  } else {
    console.log(`[codesearch]   upserted ${count ?? batch.length} → ${table}`);
  }
  rows.length = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[codesearch] source=${args.source} kind=${args.kind} query="${args.query}" force=${args.forceUpdate} dry=${args.dryRun}`);

  if (tokenCount() === 0) {
    console.error("[codesearch] GITHUB_TOKEN(S) missing — required for repo metadata fetch.");
    process.exit(1);
  }
  console.log(`[codesearch] ${tokenCount()} GitHub token(s) in rotation`);

  const sb = args.dryRun ? null : makeSupabase();
  if (!args.dryRun && !sb) {
    console.error("[codesearch] Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const octokit = makeRotatingOctokit({ userAgent: "versuz-codesearch/0.1" });

  const kinds = args.kind === "all" ? ["skill", "claude_md"] : [args.kind];
  const totals = { kept: 0, skipped: 0, errors: 0 };

  if (args.mode === "exhaustive") {
    // Soft deadline (injecté par scrape.mjs orchestrateur via env). Quand
    // atteint, on break entre passes pour exit 0 propre — le prochain cron
    // reprend là où on s'est arrêtés grâce à skip-by-known.
    const deadlineAt = Number(process.env.SCRAPE_DEADLINE_AT) || 0;
    const totalPasses = EXHAUSTIVE_QUERIES.length * kinds.length;
    console.log(`[codesearch] EXHAUSTIVE mode : ${EXHAUSTIVE_QUERIES.length} sub-queries × ${kinds.length} kind(s) = ${totalPasses} passes`);
    if (deadlineAt) {
      const minsLeft = Math.max(0, ((deadlineAt - Date.now()) / 60000)).toFixed(1);
      console.log(`[codesearch] honoring soft deadline : ${minsLeft} min remaining`);
    }
    let passNum = 0;
    let stoppedEarly = false;
    outer: for (const q of EXHAUSTIVE_QUERIES) {
      for (const kind of kinds) {
        if (deadlineAt && Date.now() >= deadlineAt) {
          console.log(`\n[codesearch] deadline reached at pass ${passNum}/${totalPasses} — stopping exhaustive loop (exit 0)`);
          stoppedEarly = true;
          break outer;
        }
        passNum += 1;
        console.log("");
        console.log(`[codesearch] ━━━ PASS ${passNum}/${totalPasses} · kind=${kind} · query="${q || "(no filter)"}" ━━━`);
        try {
          const r = await processKind({ kind, args: { ...args, query: q || "" }, sb, octokit });
          totals.kept += r.kept;
          totals.skipped += r.skipped;
          totals.errors += r.errors;
        } catch (e) {
          console.warn(`[codesearch] pass failed : ${e.message} — continuing`);
          totals.errors += 1;
        }
      }
    }
    if (stoppedEarly) {
      console.log(`[codesearch] completed ${passNum}/${totalPasses} passes before deadline`);
    }
  } else {
    for (const kind of kinds) {
      const r = await processKind({ kind, args, sb, octokit });
      totals.kept += r.kept;
      totals.skipped += r.skipped;
      totals.errors += r.errors;
    }
  }

  // Auto-purge content-hash duplicates after upsert
  if (sb) {
    for (const kind of kinds) {
      const table = kind === "claude_md" ? "claude_md_files" : "skills";
      try {
        const { deleted } = await purgeContentDuplicates(sb, table);
        if (deleted > 0) console.log(`[codesearch] purged ${deleted} content-hash duplicate(s) from ${table}`);
      } catch (e) {
        console.warn(`[codesearch] dedup skip : ${e.message}`);
      }
    }
  }

  console.log("");
  console.log(`[codesearch] DONE · ${totals.kept} kept · ${totals.skipped} skipped (already known) · ${totals.errors} errors`);
}

main().catch((err) => {
  console.error(`[codesearch] fatal : ${err.stack || err.message}`);
  process.exit(1);
});
