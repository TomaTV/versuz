/**
 * GitHub search & fetch for SKILL.md files.
 *
 * Strategy:
 *   1. Use the GitHub code-search API to find repos containing a `SKILL.md`
 *      file (optionally filtered by category keyword in path/content).
 *   2. For each hit, fetch:
 *        - the raw SKILL.md content
 *        - repo metadata (stars, description, owner)
 *   3. Return a normalised array of candidate skills.
 *
 * Auth: requires GITHUB_TOKEN (read scope is enough).
 *
 * Rate limit: code-search is 30 req/min for authed users. We sleep between
 * pages and abort on 4xx/5xx instead of retrying — re-run gets a fresh
 * snapshot.
 */

import { Octokit } from "@octokit/rest";
import { makeRotatingOctokit, tokenCount } from "../_github-tokens.mjs";

// GitHub code-search is *strict*: 10 req/min for authed users (separate from the
// 5000/h core quota). Sleep 6.5s between pages to stay under, and back off
// gracefully on 403/429 by reading X-RateLimit-Reset.
//
// Si plusieurs tokens sont configurés (GITHUB_TOKENS csv), chaque token a son
// propre bucket 5000/h core + 30/min code-search → N tokens = N× capacité.
const SLEEP_MS = 6500;
const MAX_BACKOFF_MS = 90_000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function makeOctokit(token) {
  // Legacy single-token path (caller passe un token explicite) — gardé pour
  // les call-sites qui n'ont pas migré.
  if (token) {
    return new Octokit({ auth: token, userAgent: "versuz-scraper/0.1" });
  }
  // Default : pool rotatif via _github-tokens.mjs
  const tc = tokenCount();
  if (tc === 0) {
    throw new Error(
      "[scrape/github] GITHUB_TOKEN(S) missing. Add GITHUB_TOKEN=ghp_xxx or GITHUB_TOKENS=t1,t2,t3 to .env.local."
    );
  }
  if (tc > 1) console.log(`[scrape/github] ${tc} tokens en rotation`);
  return makeRotatingOctokit();
}

/**
 * Wrap a GitHub call with rate-limit aware retry.
 * On 403/429, read X-RateLimit-Reset (epoch seconds) and sleep until then,
 * capped at 90s. Retry up to MAX_RETRIES, then return null so the caller can
 * stop gracefully instead of aborting the whole run.
 */
async function withBackoff(fn, label = "search") {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.response?.status;
      // 422 = "Cannot access beyond the first 1000 results" — hard GitHub
      // ceiling on search.code. Stop cleanly, don't retry.
      if (status === 422) {
        console.log(`[scrape/github] ${label} hit GitHub's 1000-result ceiling — stopping pagination`);
        return null;
      }
      if (status !== 403 && status !== 429) throw err;
      if (attempt === MAX_RETRIES) {
        console.warn(`[scrape/github] ${label} gave up after ${MAX_RETRIES} retries (${status})`);
        return null;
      }
      const reset = Number(err.response?.headers?.["x-ratelimit-reset"]);
      const now = Math.floor(Date.now() / 1000);
      const waitMs = Number.isFinite(reset)
        ? Math.min(Math.max((reset - now) * 1000 + 500, 5000), MAX_BACKOFF_MS)
        : Math.min(15000 * (attempt + 1), MAX_BACKOFF_MS);
      console.warn(
        `[scrape/github] ${label} rate-limited (${status}) — sleeping ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(waitMs);
    }
  }
  return null;
}

/**
 * Search GitHub for repos containing a SKILL.md file.
 *
 * @param {Octokit} octokit
 * @param {object} opts
 * @param {string} opts.keyword   — extra keyword (e.g. "pdf", "extract")
 * @param {number} opts.maxPages  — stop after this many pages (100/page)
 * @returns {Promise<Array<{owner, repo, path, html_url, sha}>>}
 */
export async function searchSkills(octokit, { keyword = "", maxPages = 3 } = {}) {
  const q = `filename:SKILL.md ${keyword}`.trim();
  const results = [];

  for (let page = 1; page <= maxPages; page++) {
    const resp = await withBackoff(
      () => octokit.search.code({ q, per_page: 100, page }),
      `search.code page=${page}`
    );
    if (!resp) break; // gave up after retries — stop, return what we have
    const { data, status } = resp;
    if (status !== 200) break;
    for (const item of data.items) {
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

/**
 * Fetch the raw text content of a SKILL.md file.
 */
export async function fetchSkillContent(octokit, { owner, repo, path }) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    headers: { accept: "application/vnd.github.raw" },
  });
  // When `accept: raw` is set, octokit returns the content as a string.
  return typeof data === "string" ? data : Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * Fetch repo metadata (stars, description, default branch).
 */
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
    topics: Array.isArray(data.topics) ? data.topics : [],
    language: data.language || null,
    open_issues: data.open_issues_count || 0,
  };
}

/**
 * List sibling files in the SKILL.md's directory. Used to detect whether
 * the skill is "minimal" (just SKILL.md) or "bundled" (with supporting
 * files: scripts, references, additional .md docs, etc.).
 */
export async function listSkillBundle(octokit, { owner, repo, path: skillPath, ref }) {
  const dir = skillPath.includes("/") ? skillPath.slice(0, skillPath.lastIndexOf("/")) : "";
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: dir, ref });
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item.path !== skillPath) // exclude SKILL.md itself
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type, // "file" | "dir"
        size: item.size || 0,
      }));
  } catch {
    return [];
  }
}
