/**
 * GitHub token pool — round-robin entre N PATs via Proxy.
 *
 * Chaque token GitHub (PAT) a son propre bucket :
 *   - 5000 requêtes core API / heure
 *   - 30 requêtes code-search / minute (limite séparée, plus stricte)
 *
 * Configurer dans `.env.local` au choix :
 *   GITHUB_TOKENS=ghp_xxx,ghp_yyy,ghp_zzz    # csv, N tokens
 *   ou simplement GITHUB_TOKEN=ghp_xxx        # 1 token (legacy)
 *
 * Stratégie : on crée N Octokit instances (une par token, auth fixé à
 * construction → pas d'override par auth-token strategy) et on expose un
 * Proxy qui, à chaque accès top-level (octokit.repos, octokit.search, ...),
 * pioche la NEXT instance. Une call chain `await octokit.search.code(...)`
 * = un accès `.search` → un Octokit choisi → rotate cursor.
 *
 * Précédent essai (hook before-request) : le strategy auth-token écrasait
 * notre header au moment de fire la requête → un seul user ID hammered.
 * Cette approche est plus simple et garantie (auth set à construct).
 */

import { Octokit } from "@octokit/rest";

function readTokens() {
  const raw = process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const TOKENS = readTokens();
if (TOKENS.length === 0) {
  console.warn("[_github-tokens] no GITHUB_TOKEN(S) configured");
}

let cursor = 0;
function pickIndex(n) {
  const i = cursor % n;
  cursor = (cursor + 1) % n;
  return i;
}

export function tokenCount() {
  return TOKENS.length;
}

export function makeRotatingOctokit({ userAgent = "versuz-scraper/0.1" } = {}) {
  if (TOKENS.length === 0) {
    throw new Error(
      "[_github-tokens] No GitHub tokens configured. Set GITHUB_TOKEN or GITHUB_TOKENS=t1,t2,t3 in .env.local."
    );
  }
  if (TOKENS.length === 1) {
    // Pas la peine de proxy si un seul token
    return new Octokit({ auth: TOKENS[0], userAgent });
  }
  const instances = TOKENS.map((t) => new Octokit({ auth: t, userAgent }));
  // Proxy : chaque accès top-level (.repos, .search, .request, .paginate, .hook…)
  // bind à une instance fraîche. Le cursor avance globalement → distribution
  // round-robin sur l'ensemble des API calls de tous les workers concurrents.
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const inst = instances[pickIndex(instances.length)];
        const val = inst[prop];
        // Bind les fonctions (octokit.request est une function callable)
        if (typeof val === "function") return val.bind(inst);
        return val;
      },
    }
  );
}
