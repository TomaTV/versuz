import {
  getSkillBySlug,
  getClaudeMdBySlug,
  getTopRankedItems,
} from "@/lib/queries/rankings";

export const dynamic = "force-dynamic";

// Wider canvas + breathing room. Right score column kept narrow (88px) so
// the name owns the visible bulk. Total 420×62.
const W = 420;
const H = 62;
const RIGHT_W = 88;
const PAD_X = 14;
const NAME_W = W - RIGHT_W - PAD_X * 2;

const VALID_SHOW = new Set(["elo", "prior", "rank", "score"]);
const VALID_STYLE = new Set(["default", "terminal"]);

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clip(s, max) {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

// One stripe color = the tier signal. No redundant tier text on the badge.
function stripeColor(tier) {
  if (tier === "premium") return "#c2410c"; // ember
  if (tier === "featured") return "#3f7d4f"; // sage
  return "#14120e"; // ink for free
}

function notFoundSvg(style = "default") {
  const isTerminal = style === "terminal";
  const bg = isTerminal ? "#14120e" : "#f2eee6";
  const fg = isTerminal ? "#dcd5c8" : "#14120e";
  const dim = isTerminal ? "#7a7466" : "#6b6557";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz badge — not found">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#b23a3a"/>
  <text x="${PAD_X}" y="22" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${dim}" letter-spacing="2">VERSUZ</text>
  <text x="${PAD_X}" y="44" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="22" fill="${fg}">slug not found</text>
</svg>`.trim();
}

/**
 * Two-zone badge — light name zone (left) + dark score column (right).
 *
 * 420 × 62
 *  ┌──────────────────────────────────────────────┬──────────┐
 *  │ VERSUZ                                       │  PRIOR   │
 *  │ skill-name (italic serif, auto-fit)          │  1414    │
 *  └──────────────────────────────────────────────┴──────────┘
 *                                                  88px (dark)
 *
 * `style=terminal` flips the palette — full ink background, cream text,
 * single ember stripe across the top. Designed for dark READMEs.
 */
function badgeSvg({ name, score, scoreLabel, tier, style = "default" }) {
  const stripe = stripeColor(tier);
  const scoreTxt = score != null ? String(score) : "—";
  const isTerminal = style === "terminal";

  // Auto-fit the name: drop font size for long names rather than truncate
  // aggressively. ~7px per glyph at 22px italic, ~6.4px at 20px, ~5.6px at 18px.
  let fontSize = 22;
  let glyphPx = 7.2;
  let maxChars = Math.floor(NAME_W / glyphPx);
  if (name.length > maxChars) {
    fontSize = 20;
    glyphPx = 6.6;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  if (name.length > maxChars) {
    fontSize = 18;
    glyphPx = 5.9;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  const displayName = clip(name, maxChars);
  const nameY = fontSize >= 22 ? 44 : fontSize >= 20 ? 43 : 42;

  // Palette
  const leftBg = isTerminal ? "#14120e" : "#f2eee6";
  const leftFg = isTerminal ? "#f2eee6" : "#14120e";
  const leftDim = isTerminal ? "#7a7466" : "#6b6557";
  const rightBg = isTerminal ? "#0a0907" : "#14120e";
  const rightFg = isTerminal ? "#f2eee6" : "#f2eee6";
  const rightDim = isTerminal ? "#7a7466" : "#dcd5c8";

  // Stripe: terminal = single ember bar; default = 4-color brand bar.
  const stripeMarkup = isTerminal
    ? `<rect x="0" y="0" width="${W}" height="3" fill="#c2410c"/>`
    : `
  <rect x="0" y="0" width="${(W * 0.34).toFixed(0)}" height="3" fill="#c2410c"/>
  <rect x="${(W * 0.34).toFixed(0)}" y="0" width="${(W * 0.24).toFixed(0)}" height="3" fill="#2a5fa8"/>
  <rect x="${(W * 0.58).toFixed(0)}" y="0" width="${(W * 0.24).toFixed(0)}" height="3" fill="#3f7d4f"/>
  <rect x="${(W * 0.82).toFixed(0)}" y="0" width="${(W * 0.18).toFixed(0)}" height="3" fill="#d69e2e"/>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz · ${escapeXml(name)}">
  <title>Versuz · ${escapeXml(name)}</title>
  <rect width="${W}" height="${H}" fill="${leftBg}"/>
  ${stripeMarkup}

  <!-- Left zone: VERSUZ caption + name -->
  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${leftDim}" letter-spacing="2.6" font-weight="600">VERSUZ</text>
  <text x="${PAD_X}" y="${nameY}" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="${fontSize}" fill="${leftFg}" letter-spacing="-0.3">${escapeXml(displayName)}</text>

  <!-- Right dark column: score label + score + tier dot -->
  <rect x="${W - RIGHT_W}" y="3" width="${RIGHT_W}" height="${H - 3}" fill="${rightBg}"/>
  <text x="${W - RIGHT_W / 2}" y="22" text-anchor="middle" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${rightDim}" letter-spacing="2.4" font-weight="600">${escapeXml(scoreLabel)}</text>
  <text x="${W - RIGHT_W / 2}" y="48" text-anchor="middle" font-family="ui-serif,Georgia,serif" font-size="26" fill="${rightFg}" letter-spacing="-0.5">${escapeXml(scoreTxt)}</text>
  <rect x="${W - RIGHT_W / 2 - 3}" y="${H - 12}" width="6" height="6" fill="${stripe}"/>
</svg>`.trim();
}

/**
 * Compute the skill's rank in its category (1-based). Returns null if the
 * skill isn't in the top 100 of its category. Cached at the route level
 * via `cache-control: s-maxage=600` — no need for an extra layer.
 */
async function computeCategoryRank(kind, item) {
  if (!item?.category) return null;
  try {
    const top = await getTopRankedItems(kind, item.category, 100);
    const idx = top.findIndex((s) => s.slug === item.slug);
    return idx >= 0 ? idx + 1 : null;
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const { kind: kindRaw, slug } = await params;
  const kind = kindRaw === "claude-md" ? "claude-md" : "skill";

  const url = new URL(request.url);
  const showParam = url.searchParams.get("show") || "score";
  const styleParam = url.searchParams.get("style") || "default";
  const show = VALID_SHOW.has(showParam) ? showParam : "score";
  const style = VALID_STYLE.has(styleParam) ? styleParam : "default";

  const item =
    kind === "claude-md" ? await getClaudeMdBySlug(slug) : await getSkillBySlug(slug);

  if (!item) {
    return new Response(notFoundSvg(style), {
      status: 404,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  const name =
    kind === "claude-md"
      ? item.author && item.repo
        ? `${item.author}/${item.repo}`
        : item.slug
      : item.name;

  // Score resolution per `show` mode :
  //  - score (default) : pick ELO if benched, else PRIOR
  //  - elo             : force ELO (— if not benched)
  //  - prior           : force PRIOR
  //  - rank            : compute category rank ("#1" / "#42")
  let score;
  let scoreLabel;
  if (show === "rank") {
    const rank = await computeCategoryRank(
      kind === "claude-md" ? "claude_md" : "skill",
      item
    );
    score = rank != null ? `#${rank}` : "—";
    scoreLabel = item.category
      ? String(item.category).toUpperCase().slice(0, 8)
      : "RANK";
  } else if (show === "elo") {
    score = item.elo != null ? item.elo : null;
    scoreLabel = "ELO";
  } else if (show === "prior") {
    score = item.prior != null ? item.prior : null;
    scoreLabel = "PRIOR";
  } else {
    // default — backwards-compat with v1 behavior
    score = item.elo != null ? item.elo : item.prior;
    scoreLabel = item.elo != null ? "ELO" : "PRIOR";
  }

  const svg = badgeSvg({
    name: name || slug,
    score,
    scoreLabel,
    tier: item.tier || "free",
    style,
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
