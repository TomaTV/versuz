import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Approximate token count for a piece of text. Without bundling a real BPE
 * tokenizer, we use a markdown/code-mix heuristic: ~3.7 chars/token. Close
 * enough to GPT/Claude tokenizers for display purposes — always prefixed with
 * a tilde so users know it's an estimate.
 */
export function approximateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 3.7));
}

/**
 * Format an integer token count compactly: 1234 → "1.2k", 950 → "950".
 */
export function formatTokenCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const OSI_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "MPL-2.0",
  "ISC",
  "Unlicense",
  "CC0-1.0",
  "AGPL-3.0",
]);

/**
 * Cold-start "prior" v3 (mai 2026) — quality-first algo.
 *
 * Le problème de v2 : un mega-repo (facebook/react 244k★) génère 20 SKILL.md
 * tous au même prior 1738 → flood visuel sur les premières pages, aucune
 * différentiation. v3 fixe ça via :
 *
 *   1. Quality score = PRIMAIRE (au lieu d'add-on) — si le judge a noté,
 *      on part de quality × 18 (range 0-1800), social signals deviennent
 *      des ajustements +/- 150.
 *   2. Stars/forks log scale + cap PLUS BAS (200/120 au lieu de 360/200) →
 *      le diff entre 100k et 1M ★ ne domine plus.
 *   3. Per-repo dampening : si N skills viennent du même repo, social
 *      contributions sont divisées par sqrt(N) (passé via `metadata.repoSkillCount`).
 *   4. Pénalité staleness plus forte (>2y → -60).
 *   5. Description length bonus continu (au lieu de cliff).
 *
 * Range : 600 (mauvais quality 0) → 2100 (top tier). Médiane attendue ~1300.
 *
 * NOT an Elo. Used pre-bench. Always rendered as "prior", never as "elo".
 */
export function computePrior(item) {
  if (!item) return null;
  const meta = item.metadata || {};

  // Per-repo dampening : si ce skill vient d'un repo avec N SKILL.md, on
  // dampe les social signals par sqrt(N). 1 file = 1.0× · 4 files = 0.5×
  // · 16 files = 0.25×.
  const repoSkillCount = Math.max(1, Number(meta.repoSkillCount || item.repoSkillCount || 1));
  const damp = 1 / Math.sqrt(repoSkillCount);

  // --- Primary signal : quality score (LLM-judged) ---
  // Si scoré (5-axis judge, 0-100, mean ~67) on l'utilise comme base.
  // 0 → 600 · 50 → 1300 · 67 → 1546 · 90 → 1900 · 100 → 2100.
  // Sinon fallback à base 1100 (légèrement sous médiane).
  let p;
  if (item.qualityScore != null) {
    p = 600 + Number(item.qualityScore) * 15;
  } else {
    p = 1100;
  }

  // --- Social signals (avec dampening) ---
  // Stars log : 10★ → +20 · 1k★ → +60 · 100k★ → +150 · 1M★ → +180 (cap 200)
  const stars = Number(item.stars || 0);
  p += Math.min(200, Math.log10(stars + 1) * 30) * damp;

  // Forks cap 120 (les forks sont un signal plus bruité que les stars)
  const forks = Number(item.forks ?? meta.forks ?? 0);
  p += Math.min(120, Math.log10(forks + 1) * 30) * damp;

  // Licence OSI — +20 si présente (signal légitimité légère)
  const license = meta.license || item.license;
  if (license && OSI_LICENSES.has(license)) p += 20;

  // Récence — la staleness pénalise davantage que la freshness ne booste.
  const pushedAt = item.pushedAt || meta.pushed_at;
  if (pushedAt) {
    const ageDays = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000;
    if (ageDays < 90) p += 40;
    else if (ageDays < 365) p += 20;
    else if (ageDays > 730) p -= 60;
    else if (ageDays > 1095) p -= 100;
  } else {
    p -= 30; // pas de pushed_at = info manquante
  }

  // Description continue : 0 chars → 0 · 100 chars → +10 · 200 chars → +20 max
  const desc = item.description || "";
  p += Math.min(20, desc.length / 10);

  // Bundled skill : +20 (effort de packaging supplémentaire)
  if (meta.skill_type === "bundled") p += 20;

  // --- Trust ladder ---
  const lvl = item.verificationLevel ?? 0;
  if (lvl >= 4) p += 120;
  else if (lvl >= 3) p += 80;
  else if (lvl >= 2) p += 50;
  else if (lvl >= 1) p += 20;

  // --- Official org ---
  // Réduit à +80 (au lieu de +120) parce que les "official" repos (facebook,
  // microsoft, vercel) flooderaient sinon — leur contribution doit être
  // dampée par le repoSkillCount pour ne pas tous bunchés en haut.
  if (item.isOfficial) p += 80 * damp;

  return Math.round(p);
}
