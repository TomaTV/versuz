/**
 * grep.app public search adapter — DEPRECATED.
 *
 * grep.app est désormais derrière **Vercel Security Checkpoint** (JS-based
 * anti-bot challenge). Les scripts headless reçoivent du HTML challenge au
 * lieu de JSON → impossible à automatiser sans browser headless.
 *
 * Tentatives qui ne passent PAS la barrière :
 *   - Bon User-Agent + Referer
 *   - Délai entre requêtes
 *   - Headers Mozilla complets
 *
 * Garde le code pour référence + au cas où ils retirent la protection un
 * jour. Si tu veux vraiment scraper grep.app, il faut Playwright en mode
 * non-headless (lourd, lent, fragile).
 *
 * Alternatives qui marchent :
 *   - Sourcegraph (./sourcegraph.mjs) — fonctionne en stream, no challenge
 *   - searchcode.com (à explorer, voir TODO)
 */

const GREP_BASE = "https://grep.app/api/search";

/**
 * Search grep.app for files matching the query + filename filter.
 *
 *   q          → string à matcher dans le content
 *   filename   → e.g. "SKILL.md" pour filtrer par nom de fichier
 *   maxPages   → cap pagination (default 10)
 *
 * Returns array of { owner, repo, path, branch }.
 */
export async function searchGrepApp({ q = "", filename = null, maxPages = 10, signal }) {
  const matches = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(GREP_BASE);
    if (q) url.searchParams.set("q", q);
    if (filename) url.searchParams.append("filter[file.name][]", filename);
    url.searchParams.set("page", String(page));
    url.searchParams.set("format", "e");

    let res;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "versuz-scraper/0.1 (grep.app)",
        },
        signal,
      });
    } catch (err) {
      throw new Error(`[grep.app] network: ${err.message}`);
    }
    if (!res.ok) {
      if (res.status === 429) {
        // Backoff respectueux. grep.app pas un service de prod, on s'arrête.
        console.warn(`[grep.app] rate-limited (429) at page ${page}, stopping`);
        break;
      }
      throw new Error(`[grep.app] ${res.status} ${res.statusText} at page ${page}`);
    }
    let data;
    try { data = await res.json(); } catch (e) {
      throw new Error(`[grep.app] invalid JSON at page ${page}: ${e.message}`);
    }
    const hits = data?.hits?.hits || [];
    if (hits.length === 0) break;

    for (const h of hits) {
      const src = h._source || h;
      const repo = src.repo?.raw || src.repo;
      const path = src.path?.raw || src.path;
      const branch = src.branch?.raw || src.branch || "HEAD";
      if (!repo || !path) continue;
      const ghMatch = String(repo).match(/^([^/]+)\/([^/]+)$/);
      if (!ghMatch) continue;
      const key = `${ghMatch[1]}/${ghMatch[2]}/${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        owner: ghMatch[1],
        repo: ghMatch[2],
        path,
        branch,
        source: "grep.app",
      });
    }

    // grep.app respect : 1.2s entre pages
    await new Promise((r) => setTimeout(r, 1200));

    // Stop if we got less than a full page
    if (hits.length < 10) break;
  }

  return matches;
}
