#!/usr/bin/env node
import "../_env.mjs";
/**
 * Aggregator scraper — complements GitHub Code Search.
 *
 * Why : GitHub Code Search has a hard 1000-result ceiling per query and 10
 * RPM rate limit. Curated awesome-* lists give us high-quality candidates
 * without hitting either.
 *
 * Strategy :
 *   1. Fetch raw README.md of each source in `sources.mjs`.
 *   2. Regex-extract every `github.com/{owner}/{repo}` URL → dedupe.
 *   3. For each unique repo, try to fetch SKILL.md AND CLAUDE.md from root.
 *   4. If found, classify + upsert via the same downstream as the main scrapers.
 *
 * Usage :
 *   node scripts/scrape-aggregators/index.mjs                  # both kinds
 *   node scripts/scrape-aggregators/index.mjs --kind=skill     # SKILL.md only
 *   node scripts/scrape-aggregators/index.mjs --kind=claude_md # CLAUDE.md only
 *   node scripts/scrape-aggregators/index.mjs --dry-run        # don't write
 *   node scripts/scrape-aggregators/index.mjs --force-update   # ignore SHA cache
 */

import { Octokit } from "@octokit/rest";
import { makeRotatingOctokit, tokenCount } from "../_github-tokens.mjs";
import { createClient } from "@supabase/supabase-js";
import { parseSkillMd } from "../scrape/parse.mjs";
import { classifySkill } from "../scrape/classify.mjs";
import { classifyProject } from "../scrape-claude-md/classify-project.mjs";
import { contentHash } from "../_hash.mjs";
import { purgeContentDuplicates } from "../_dedup.mjs";
import { SOURCES, GITHUB_TOPICS } from "./sources.mjs";
import { isOfficialOwner } from "../../src/lib/official-orgs.js";

function parseArgs(argv) {
  const out = { kind: null, dryRun: false, forceUpdate: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--force-update") out.forceUpdate = true;
    else if (arg.startsWith("--kind=")) out.kind = arg.slice(7);
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

function makeOctokit() {
  const tc = tokenCount();
  if (tc === 0) {
    throw new Error(
      "[scrape-aggregators] GITHUB_TOKEN(S) missing. Add GITHUB_TOKEN=ghp_xxx or GITHUB_TOKENS=t1,t2,t3 to .env.local."
    );
  }
  if (tc > 1) console.log(`[scrape-aggregators] ${tc} tokens en rotation`);
  return makeRotatingOctokit({ userAgent: "versuz-aggregators/0.1" });
}

const MAX_BACKOFF_MS = 90_000;
const MAX_RETRIES = 3;
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Wrap a GitHub call with backoff on 403/429. Reads X-RateLimit-Reset to
 * sleep precisely until the quota resets (capped at 90s — beyond that we
 * give up and let the caller decide).
 */
async function withBackoff(fn, label = "github") {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.response?.status;
      if (status !== 403 && status !== 429) throw err;
      if (attempt === MAX_RETRIES) {
        console.warn(`[scrape-aggregators] ${label} gave up after ${MAX_RETRIES} retries (${status})`);
        throw err;
      }
      const reset = Number(err.response?.headers?.["x-ratelimit-reset"]);
      const now = Math.floor(Date.now() / 1000);
      const waitMs = Number.isFinite(reset)
        ? Math.min(Math.max((reset - now) * 1000 + 500, 5000), MAX_BACKOFF_MS)
        : Math.min(15000 * (attempt + 1), MAX_BACKOFF_MS);
      console.warn(
        `[scrape-aggregators] ${label} rate-limited (${status}) — sleeping ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(waitMs);
    }
  }
}

/**
 * Extract every {owner, repo} pair from a markdown blob's GitHub URLs.
 * Filters out reserved / known-non-repo paths (issues, pulls, raw, etc.)
 * and the source's own owner/repo if known.
 */
const RESERVED_OWNERS = new Set([
  "topics", "search", "marketplace", "settings", "explore",
  "trending", "collections", "events", "notifications", "sponsors",
  "features", "pricing", "enterprise", "about", "site", "raw",
  "githubassets", "user-attachments",
]);

function extractRepos(markdown) {
  const seen = new Set();
  const out = [];
  // Match github.com/owner/repo (and stop at first / # ? after repo)
  const re = /github\.com\/([a-z0-9][a-z0-9-]{0,38})\/([a-z0-9._-]{1,100})/gi;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const owner = m[1];
    let repo = m[2];
    // Strip trailing .git, common in clone URLs
    repo = repo.replace(/\.git$/, "");
    if (RESERVED_OWNERS.has(owner.toLowerCase())) continue;
    // Skip badge / image URLs that look like repos
    if (repo.length < 2 || /^(blob|tree|commit|issues|pull|wiki|releases|actions|projects|graphs|network|pulse|community|raw|workflows)$/i.test(repo)) continue;
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ owner, repo });
  }
  return out;
}

async function fetchRaw(url) {
  const res = await fetch(url, { headers: { "user-agent": "versuz-aggregators/0.1" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/**
 * Try to fetch a single file from a repo's root. Returns
 * `{ content, sha }` if it exists, `null` if 404.
 */
async function tryFetchRootFile(octokit, { owner, repo, filename }) {
  try {
    const { data } = await withBackoff(
      () => octokit.repos.getContent({ owner, repo, path: filename }),
      `getContent ${owner}/${repo}/${filename}`
    );
    if (Array.isArray(data) || data.type !== "file") return null;
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { content, sha: data.sha, html_url: data.html_url };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function fetchRepoMeta(octokit, { owner, repo }) {
  const { data } = await withBackoff(
    () => octokit.repos.get({ owner, repo }),
    `repos.get ${owner}/${repo}`
  );
  return {
    full_name: data.full_name,
    html_url: data.html_url,
    description: data.description || "",
    stars: data.stargazers_count || 0,
    forks: data.forks_count || 0,
    default_branch: data.default_branch,
    owner_login: data.owner.login,
    license: data.license?.spdx_id || null,
    pushed_at: data.pushed_at,
    topics: Array.isArray(data.topics) ? data.topics : [],
    language: data.language || null,
    open_issues: data.open_issues_count || 0,
  };
}

async function listRepoRoot(octokit, { owner, repo, ref }) {
  try {
    const { data } = await withBackoff(
      () => octokit.repos.getContent({ owner, repo, path: "", ref }),
      `listRepoRoot ${owner}/${repo}`
    );
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({ name: item.name, type: item.type }));
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
}

async function loadKnownShas(sb, table) {
  if (!sb) return new Set();
  const { data, error } = await sb.from(table).select("metadata");
  if (error) return new Set();
  return new Set((data || []).map((r) => r.metadata?.sha).filter(Boolean));
}

function extractDescription(content) {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    return t.replace(/[*_`]/g, "");
  }
  return "";
}

async function processCandidate({ owner, repo, kinds, octokit, want, knownSkillShas, knownClaudeShas, repoMetaCache }) {
  // Intersect per-source kind hints with global --kind= flag
  const candidateKinds = new Set(
    [...kinds].filter((k) => (k === "skill" ? want.skill : want.claudeMd))
  );
  if (candidateKinds.size === 0) return null;

  // Single listRepoRoot call to discover what's actually at root — eliminates
  // blind 404s for files we know don't exist. We need rootFiles anyway for
  // CLAUDE.md classification, so this is essentially free.
  const rootFiles = await listRepoRoot(octokit, { owner, repo });
  const rootNames = new Set(rootFiles.map((f) => f.name));
  const hasSkillAtRoot = candidateKinds.has("skill") && rootNames.has("SKILL.md");
  const hasClaudeMdAtRoot = candidateKinds.has("claude_md") && rootNames.has("CLAUDE.md");
  if (!hasSkillAtRoot && !hasClaudeMdAtRoot) return null;

  const found = { skill: null, claudeMd: null };
  if (hasSkillAtRoot) {
    found.skill = await tryFetchRootFile(octokit, { owner, repo, filename: "SKILL.md" });
    if (found.skill && knownSkillShas.has(found.skill.sha)) found.skill = "known";
  }
  if (hasClaudeMdAtRoot) {
    found.claudeMd = await tryFetchRootFile(octokit, { owner, repo, filename: "CLAUDE.md" });
    if (found.claudeMd && knownClaudeShas.has(found.claudeMd.sha)) found.claudeMd = "known";
  }

  if (!found.skill && !found.claudeMd) return null;
  if (found.skill === "known" && found.claudeMd === "known") return { skipped: true };
  if (found.skill === "known" && !found.claudeMd) return { skipped: true };
  if (found.claudeMd === "known" && !found.skill) return { skipped: true };

  // Cache repo meta — we'll need it for both kinds
  const metaKey = `${owner}/${repo}`;
  if (!repoMetaCache.has(metaKey)) {
    repoMetaCache.set(metaKey, await fetchRepoMeta(octokit, { owner, repo }));
  }
  const repoMeta = repoMetaCache.get(metaKey);

  const result = { skillRow: null, claudeMdRow: null };

  if (found.skill && found.skill !== "known") {
    const parsed = parseSkillMd(found.skill.content);
    if (parsed.ok) {
      const cls = classifySkill(parsed);
      if (cls.id) {
        const slug = slugify(parsed.name);
        result.skillRow = {
          slug,
          name: parsed.name,
          description: parsed.description,
          github_url: repoMeta.html_url,
          github_stars: repoMeta.stars,
          category: cls.id,
          skill_md_content: found.skill.content,
          content_hash: contentHash(found.skill.content),
          is_official: isOfficialOwner(owner),
          metadata: {
            owner,
            repo,
            path: "SKILL.md",
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
            skill_type: "minimal",
            bundle_files: [],
            bundle_size_bytes: 0,
            sha: found.skill.sha,
            source: "aggregator",
          },
        };
      }
    }
  }

  if (found.claudeMd && found.claudeMd !== "known") {
    // rootFiles already fetched above — reuse it instead of re-calling
    const cls = classifyProject({
      rootFiles,
      content: found.claudeMd.content,
      language: repoMeta.language,
    });
    const slug = slugify(`${owner}-${repo}`);
    const description = extractDescription(found.claudeMd.content) || repoMeta.description || "";
    result.claudeMdRow = {
      slug,
      github_url: repoMeta.html_url,
      github_stars: repoMeta.stars,
      description: description.slice(0, 240),
      project_category: cls.id,
      content: found.claudeMd.content,
      content_hash: contentHash(found.claudeMd.content),
      is_official: isOfficialOwner(owner),
      metadata: {
        owner,
        repo,
        author: repoMeta.owner_login,
        license: repoMeta.license,
        forks: repoMeta.forks,
        topics: repoMeta.topics,
        language: repoMeta.language,
        open_issues: repoMeta.open_issues,
        classifier_confidence: cls.confidence,
        pushed_at: repoMeta.pushed_at,
        word_count_hint: found.claudeMd.content.split(/\s+/).length,
        sha: found.claudeMd.sha,
        source: "aggregator",
      },
    };
  }

  return result;
}

function dedupSkillsBySlug(rows) {
  const bySlug = new Map();
  for (const r of rows) {
    const existing = bySlug.get(r.slug);
    if (!existing || (r.github_stars || 0) > (existing.github_stars || 0)) {
      bySlug.set(r.slug, r);
    }
  }
  return [...bySlug.values()];
}

async function main() {
  const args = parseArgs(process.argv);
  const want = {
    skill: !args.kind || args.kind === "skill",
    claudeMd: !args.kind || args.kind === "claude_md",
  };
  console.log(`[scrape-aggregators] starting · ${JSON.stringify({ ...args, want })}`);

  const octokit = makeOctokit();
  const sb = args.dryRun ? null : makeSupabase();
  const knownSkillShas = args.forceUpdate ? new Set() : await loadKnownShas(sb, "skills");
  const knownClaudeShas = args.forceUpdate ? new Set() : await loadKnownShas(sb, "claude_md_files");
  if (knownSkillShas.size || knownClaudeShas.size) {
    console.log(`[scrape-aggregators] known SHAs : ${knownSkillShas.size} skills · ${knownClaudeShas.size} claude_md`);
  }

  // 1. EXTRACT candidates from all sources, tracking which kinds each source
  // expects so we don't waste API calls checking SKILL.md on a CLAUDE.md-only
  // source (and vice-versa). A repo seen in multiple sources accumulates the
  // union of their kinds.
  const allCandidates = new Map();
  for (const src of SOURCES) {
    try {
      console.log(`[scrape-aggregators] fetching ${src.name} → ${src.url}`);
      const md = await fetchRaw(src.url);
      const repos = extractRepos(md);
      const sourceKinds = src.kinds || ["skill", "claude_md"];
      console.log(`[scrape-aggregators]   → ${repos.length} repo links extracted (kinds: ${sourceKinds.join("+")})`);
      for (const r of repos) {
        const key = `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`;
        const existing = allCandidates.get(key);
        if (existing) {
          for (const k of sourceKinds) existing.kinds.add(k);
        } else {
          allCandidates.set(key, { ...r, kinds: new Set(sourceKinds) });
        }
      }
    } catch (err) {
      console.warn(`[scrape-aggregators] source ${src.name} failed : ${err.message}`);
    }
  }
  // 1.b. EXTRACT additional candidates from GitHub topic search (30 RPM,
  // up to 1000 repos per topic). Much higher coverage than awesome-* lists.
  const TOPICS_MAX_PAGES = Number(process.env.GITHUB_TOPICS_MAX_PAGES || 3);
  for (const t of GITHUB_TOPICS) {
    try {
      console.log(`[scrape-aggregators] github topic search → "${t.topic}" (max ${TOPICS_MAX_PAGES * 100} repos)`);
      let pageCount = 0;
      for (let page = 1; page <= TOPICS_MAX_PAGES; page++) {
        const resp = await withBackoff(
          () => octokit.search.repos({ q: `topic:${t.topic}`, per_page: 100, page, sort: "stars", order: "desc" }),
          `search.repos topic:${t.topic} page=${page}`
        );
        if (!resp || resp.status !== 200) break;
        const items = resp.data.items || [];
        if (items.length === 0) break;
        for (const item of items) {
          const owner = item.owner?.login;
          const repo = item.name;
          if (!owner || !repo) continue;
          const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
          const existing = allCandidates.get(key);
          if (existing) {
            for (const k of t.kinds) existing.kinds.add(k);
          } else {
            allCandidates.set(key, { owner, repo, kinds: new Set(t.kinds) });
          }
          pageCount += 1;
        }
        if (items.length < 100) break;
        // Pace : repo search is 30 RPM = 2s gap minimum between calls
        await sleep(2200);
      }
      console.log(`[scrape-aggregators]   → topic:${t.topic} extracted ${pageCount} repos (kinds: ${t.kinds.join("+")})`);
    } catch (err) {
      console.warn(`[scrape-aggregators] topic ${t.topic} failed : ${err.message}`);
    }
  }

  const candidates = [...allCandidates.values()];
  console.log(`[scrape-aggregators] ${candidates.length} unique repo candidates from ${SOURCES.length} awesome-lists + ${GITHUB_TOPICS.length} GitHub topics`);

  // 2. PROCESS each candidate (concurrency 2 — repos.getContent is on the
  // 5000/h core quota, but we hit it fast with 1000+ candidates × multiple
  // calls. Backoff handles 403, but better to pace ourselves.)
  //
  // Upsert in BATCHES so a mid-run Ctrl+C / crash doesn't lose work. Flush
  // tous les 5 candidates processed → progrès visible quasi-temps réel sur
  // la landing/marketplace sans flooder Postgres. Re-run skip-by-SHA.
  // Configurable via SCRAPE_BATCH_SIZE (1 = full real-time, 20 = grosse perf).
  const skillRows = [];
  const claudeMdRows = [];
  const repoMetaCache = new Map();
  let cursor = 0;
  let skipped = 0;
  let totalSkillsUpserted = 0;
  let totalClaudeMdUpserted = 0;
  const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY || 2);
  // Default 1 = true real-time : every item found is upserted immediately,
  // so it appears on /marketplace within seconds. Bump to 5-20 if you want
  // fewer DB roundtrips at the cost of slower visibility.
  const BATCH_SIZE = Number(process.env.SCRAPE_BATCH_SIZE || 1);

  async function flushBatches(force = false) {
    if (args.dryRun || !sb) return;
    if (!force && skillRows.length < BATCH_SIZE && claudeMdRows.length < BATCH_SIZE) return;
    if (skillRows.length > 0) {
      const batch = skillRows.splice(0);
      const bySlug = new Map();
      for (const r of batch) {
        const ex = bySlug.get(r.slug);
        if (!ex || (r.github_stars || 0) > (ex.github_stars || 0)) bySlug.set(r.slug, r);
      }
      const deduped = [...bySlug.values()];
      const { data: existing } = await sb.from("skills").select("slug, content_hash").not("content_hash", "is", null);
      const hashToSlug = new Map((existing || []).map((r) => [r.content_hash, r.slug]));
      const filtered = deduped.filter((r) => {
        const dup = hashToSlug.get(r.content_hash);
        if (dup && dup !== r.slug) {
          console.log(`[scrape-aggregators] skip ${r.slug} — content dup of ${dup}`);
          return false;
        }
        return true;
      });
      if (filtered.length) {
        const { error, count } = await sb.from("skills").upsert(filtered, { onConflict: "slug", count: "exact" });
        if (error) console.warn(`[scrape-aggregators] skill upsert err : ${error.message}`);
        else {
          totalSkillsUpserted += count || filtered.length;
          console.log(`[scrape-aggregators] ✓ flushed ${count || filtered.length} skills (total ${totalSkillsUpserted})`);
        }
      }
    }
    if (claudeMdRows.length > 0) {
      const batch = claudeMdRows.splice(0);
      const bySlug = new Map();
      for (const r of batch) {
        const ex = bySlug.get(r.slug);
        if (!ex || (r.github_stars || 0) > (ex.github_stars || 0)) bySlug.set(r.slug, r);
      }
      const deduped = [...bySlug.values()];
      const { data: existing } = await sb.from("claude_md_files").select("slug, content_hash").not("content_hash", "is", null);
      const hashToSlug = new Map((existing || []).map((r) => [r.content_hash, r.slug]));
      const filtered = deduped.filter((r) => {
        const dup = hashToSlug.get(r.content_hash);
        if (dup && dup !== r.slug) {
          console.log(`[scrape-aggregators] skip claude_md ${r.slug} — content dup of ${dup}`);
          return false;
        }
        return true;
      });
      if (filtered.length) {
        const { error, count } = await sb.from("claude_md_files").upsert(filtered, { onConflict: "slug", count: "exact" });
        if (error) console.warn(`[scrape-aggregators] claude_md upsert err : ${error.message}`);
        else {
          totalClaudeMdUpserted += count || filtered.length;
          console.log(`[scrape-aggregators] ✓ flushed ${count || filtered.length} claude_md (total ${totalClaudeMdUpserted})`);
        }
      }
    }
  }

  // Trap SIGINT so Ctrl+C still flushes the current batch before exiting
  let sigintHandled = false;
  process.on("SIGINT", async () => {
    if (sigintHandled) process.exit(130);
    sigintHandled = true;
    console.log("\n[scrape-aggregators] SIGINT — flushing current batch before exit…");
    try { await flushBatches(true); } catch (e) { console.warn(e.message); }
    process.exit(130);
  });

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= candidates.length) return;
      const c = candidates[i];
      try {
        const r = await processCandidate({
          owner: c.owner,
          repo: c.repo,
          kinds: c.kinds,
          octokit,
          want,
          knownSkillShas,
          knownClaudeShas,
          repoMetaCache,
        });
        if (!r) continue;
        if (r.skipped) {
          skipped += 1;
          continue;
        }
        if (r.skillRow) {
          skillRows.push(r.skillRow);
          console.log(`[scrape-aggregators] kept skill ${c.owner}/${c.repo} → ${r.skillRow.category} (★${r.skillRow.github_stars})`);
        }
        if (r.claudeMdRow) {
          claudeMdRows.push(r.claudeMdRow);
          console.log(`[scrape-aggregators] kept claude_md ${c.owner}/${c.repo} → ${r.claudeMdRow.project_category} (★${r.claudeMdRow.github_stars})`);
        }
        // Flush periodically so a Ctrl+C / crash doesn't lose work
        if (skillRows.length >= BATCH_SIZE || claudeMdRows.length >= BATCH_SIZE) {
          await flushBatches();
        }
      } catch (err) {
        // Don't abort the whole run on a single repo failure
        if (err.status === 404) continue;
        console.warn(`[scrape-aggregators] error on ${c.owner}/${c.repo} — ${err.status || ""} ${err.message}`);
      }
    }
  }

  console.log(`[scrape-aggregators] processing ${candidates.length} candidates · concurrency=${CONCURRENCY}`);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[scrape-aggregators] ${skillRows.length} skills · ${claudeMdRows.length} claude_md · ${skipped} skipped (sha unchanged) · ${dt}s`
  );

  // 3. FINAL FLUSH — anything left in the batches
  if (args.dryRun) {
    console.log(`[scrape-aggregators] --dry-run set — would have upserted ${skillRows.length + claudeMdRows.length} rows`);
    return;
  }
  if (!sb) {
    console.log(`[scrape-aggregators] Supabase env missing — would have upserted ${skillRows.length + claudeMdRows.length} rows`);
    return;
  }
  await flushBatches(true);
  // Auto-purge any pre-existing dups from across all batches
  const sPurge = await purgeContentDuplicates(sb, "skills");
  const cPurge = await purgeContentDuplicates(sb, "claude_md_files");
  if (sPurge.deleted > 0 || cPurge.deleted > 0) {
    console.log(`[scrape-aggregators] auto-purged ${sPurge.deleted} skills + ${cPurge.deleted} claude_md duplicate(s)`);
  }
  console.log(
    `[scrape-aggregators] DONE · ${totalSkillsUpserted} skills + ${totalClaudeMdUpserted} claude_md upserted across all batches`
  );
}

main().catch((err) => {
  console.error(`[scrape-aggregators] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
