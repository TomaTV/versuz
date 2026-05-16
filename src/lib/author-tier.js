/**
 * Author tier — quantitative progression based on contribution count.
 *
 *   Newcomer    — 1+ items
 *   Challenger  — 5+ items
 *   Contender   — 10+ items, at least 1 benched
 *   Champion    — 25+ items, at least 3 benched
 *   Veteran     — 50+ items
 *
 * Source of truth shared by /badge/author/[login] (SVG) and /u/[login]
 * (web profile). Migration 0052 introduced an `author_achievements`
 * table but post-cycle-hooks.mjs doesn't populate it yet — the tier
 * is computed on the fly from contribution counts here. Once the
 * persistence is wired in a follow-up, the helper can read from the
 * table directly and stay backward-compatible.
 */

const TIERS = [
  {
    id: "veteran",
    label: "Veteran",
    minTotal: 50,
    minBenched: 0,
    color: "#c2410c", // ember
    tone: "Pillar of the registry.",
  },
  {
    id: "champion",
    label: "Champion",
    minTotal: 25,
    minBenched: 3,
    color: "#d69e2e", // amber
    tone: "Multiple skills ranked across categories.",
  },
  {
    id: "contender",
    label: "Contender",
    minTotal: 10,
    minBenched: 1,
    color: "#3f7d4f", // sage
    tone: "At least one skill made it into the rankings.",
  },
  {
    id: "challenger",
    label: "Challenger",
    minTotal: 5,
    minBenched: 0,
    color: "#2a5fa8", // azure
    tone: "Five contributions and growing.",
  },
  {
    id: "newcomer",
    label: "Newcomer",
    minTotal: 1,
    minBenched: 0,
    color: "#6b6557", // muted
    tone: "First contribution landed.",
  },
];

export function computeAuthorTier({ total = 0, benched = 0 } = {}) {
  for (const tier of TIERS) {
    if (total >= tier.minTotal && benched >= tier.minBenched) {
      return tier;
    }
  }
  return null;
}

export function getAuthorTierById(id) {
  return TIERS.find((t) => t.id === id) || null;
}

export function authorTierList() {
  // Returns tiers in ascending difficulty order (Newcomer first → Veteran last).
  return [...TIERS].reverse();
}
