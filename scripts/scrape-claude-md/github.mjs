/**
 * GitHub search & fetch for CLAUDE.md files.
 *
 * Mirrors scripts/scrape/github.mjs, but searches `filename:CLAUDE.md` and
 * additionally lists the repo's top-level files so we can sniff stack
 * (package.json → JS/TS, pyproject.toml → Python, etc.) for project-type
 * classification.
 */

import { Octokit } from "@octokit/rest";
import { makeRotatingOctokit, tokenCount } from "../_github-tokens.mjs";

// GitHub code-search: 10 req/min hard cap. 6.5s gap between pages keeps us
// safely under, plus 403/429 backoff via withBackoff() below.
//
// Multi-token : GITHUB_TOKENS=t1,t2,t3 → rotation auto, N× quota effectif.
const SLEEP_MS = 6500;
const MAX_BACKOFF_MS = 90_000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function makeOctokit(token) {
  if (token) {
    return new Octokit({ auth: token, userAgent: "versuz-scraper/0.1" });
  }
  const tc = tokenCount();
  if (tc === 0) {
    throw new Error(
      "[scrape-claude-md] GITHUB_TOKEN(S) missing. Add GITHUB_TOKEN=ghp_xxx or GITHUB_TOKENS=t1,t2,t3 to .env.local."
    );
  }
  if (tc > 1) console.log(`[scrape-claude-md] ${tc} tokens en rotation`);
  return makeRotatingOctokit();
}

async function withBackoff(fn, label = "search") {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.response?.status;
      // 422 = "Cannot access beyond the first 1000 results" — hard GitHub
      // ceiling on search.code. Stop cleanly, don't retry.
      if (status === 422) {
        console.log(`[scrape-claude-md] ${label} hit GitHub's 1000-result ceiling — stopping pagination`);
        return null;
      }
      if (status !== 403 && status !== 429) throw err;
      if (attempt === MAX_RETRIES) {
        console.warn(`[scrape-claude-md] ${label} gave up after ${MAX_RETRIES} retries (${status})`);
        return null;
      }
      const reset = Number(err.response?.headers?.["x-ratelimit-reset"]);
      const now = Math.floor(Date.now() / 1000);
      const waitMs = Number.isFinite(reset)
        ? Math.min(Math.max((reset - now) * 1000 + 500, 5000), MAX_BACKOFF_MS)
        : Math.min(15000 * (attempt + 1), MAX_BACKOFF_MS);
      console.warn(
        `[scrape-claude-md] ${label} rate-limited (${status}) — sleeping ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(waitMs);
    }
  }
  return null;
}

export async function searchClaudeMds(octokit, { keyword = "", maxPages = 3 } = {}) {
  const q = `filename:CLAUDE.md ${keyword}`.trim();
  const results = [];

  for (let page = 1; page <= maxPages; page++) {
    const resp = await withBackoff(
      () => octokit.search.code({ q, per_page: 100, page }),
      `search.code page=${page}`
    );
    if (!resp) break;
    const { data, status } = resp;
    if (status !== 200) break;
    for (const item of data.items) {
      // Only accept root-level CLAUDE.md (avoids nested ones in subdirs)
      if (item.path !== "CLAUDE.md") continue;
      results.push({
        owner: item.repository.owner.login,
        repo: item.repository.name,
        path: item.path,
        html_url: item.html_url,
        sha: item.sha,
      });
    }
    if (data.items.length < 100) break;
    await sleep(SLEEP_MS);
  }

  return results;
}

export async function fetchClaudeMdContent(octokit, { owner, repo, path }) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    headers: { accept: "application/vnd.github.raw" },
  });
  return typeof data === "string"
    ? data
    : Buffer.from(data.content, "base64").toString("utf-8");
}

export async function fetchRepoMeta(octokit, { owner, repo }) {
  const { data } = await octokit.repos.get({ owner, repo });
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
    language: data.language || null,
    topics: Array.isArray(data.topics) ? data.topics : [],
    open_issues: data.open_issues_count || 0,
  };
}

/**
 * List top-level files & directories in a repo. Used by the project-type
 * classifier to detect stack (package.json, pyproject.toml, etc.).
 */
export async function listRepoRoot(octokit, { owner, repo, ref }) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "", ref });
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({ name: item.name, type: item.type }));
  } catch {
    return [];
  }
}
