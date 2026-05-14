/**
 * Sourcegraph public search adapter.
 *
 * Endpoint : https://sourcegraph.com/.api/search/stream
 * Pas d'auth requise pour les queries publiques. Rate limit beaucoup plus
 * généreux que GitHub Code Search (~5000 req/h sans auth).
 *
 * Format : SSE (Server-Sent Events). On parse line-by-line, on extrait
 * les events `matched` qui contiennent { type: 'content', repository, path }.
 *
 * Doc : https://docs.sourcegraph.com/api/stream_api
 */

const SG_BASE = "https://sourcegraph.com/.api/search/stream";

/**
 * Search Sourcegraph for files matching the query.
 * Returns array of { owner, repo, path, branch } pour les matches GitHub.
 *
 * Query examples :
 *   "file:SKILL.md repo:^github.com"   → tous les SKILL.md sur GitHub public
 *   "file:CLAUDE.md repo:^github.com"
 *   "file:SKILL.md repo:^github.com mcp"  → SKILL.md mentionnant mcp
 *
 * SG limite chaque query à `count` matches (max ~5000). Use `count=all` pour
 * tout récupérer en un seul stream.
 */
export async function searchSourcegraph({ query, count = 10000, signal }) {
  const url = new URL(SG_BASE);
  url.searchParams.set("q", `${query} count:${count}`);
  url.searchParams.set("v", "V3");
  url.searchParams.set("t", "literal");
  url.searchParams.set("display", String(count));

  const res = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
      "User-Agent": "versuz-scraper/0.1 (sourcegraph)",
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`[sourcegraph] ${res.status} ${res.statusText}`);
  }

  const matches = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events séparés par double newline. Chaque event a une ligne
    // `event: <name>` puis `data: <json>`.
    const events = buffer.split("\n\n");
    buffer = events.pop() || ""; // keep incomplete trailing event

    for (const ev of events) {
      const lines = ev.split("\n");
      let eventName = null;
      let dataStr = null;
      for (const line of lines) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr = line.slice(6);
      }
      if (eventName !== "matches" || !dataStr) continue;
      let payload;
      try { payload = JSON.parse(dataStr); } catch { continue; }
      if (!Array.isArray(payload)) continue;
      for (const m of payload) {
        // type can be: content, path, symbol, repo, commit, file…
        // On veut path/content matches qui ont repository + path.
        if (!m.repository || !m.path) continue;
        const ghMatch = m.repository.match(/^github\.com\/([^/]+)\/([^/]+)$/);
        if (!ghMatch) continue;
        matches.push({
          owner: ghMatch[1],
          repo: ghMatch[2],
          path: m.path,
          branch: m.branches?.[0] || "HEAD",
          // SG returns repoStars dans le payload des matches — on l'utilise
          // pour pré-filter avant de fetch content/meta (économie quota).
          stars: typeof m.repoStars === "number" ? m.repoStars : null,
          source: "sourcegraph",
        });
      }
    }
  }

  return matches;
}
