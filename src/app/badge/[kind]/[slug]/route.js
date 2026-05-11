import { getSkillBySlug, getClaudeMdBySlug } from "@/lib/queries/rankings";

export const dynamic = "force-dynamic";

// Wider canvas + breathing room. Right score column kept narrow (88px) so
// the name owns the visible bulk. Total 420×62.
const W = 420;
const H = 62;
const RIGHT_W = 88;
const PAD_X = 14;
const NAME_W = W - RIGHT_W - PAD_X * 2;

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

function notFoundSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz badge — not found">
  <rect width="${W}" height="${H}" fill="#f2eee6"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#b23a3a"/>
  <text x="${PAD_X}" y="22" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="#6b6557" letter-spacing="2">VERSUZ</text>
  <text x="${PAD_X}" y="44" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="22" fill="#14120e">slug not found</text>
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
 * Tier shows as the top stripe color (ember = premium, sage = featured,
 * ink = free). No redundant slug caption — the name IS the slug for skills,
 * and we drop the stars row since the SCORE is the differentiator a Versuz
 * badge promises.
 */
function badgeSvg({ name, score, scoreLabel, tier }) {
  const stripe = stripeColor(tier);
  const scoreTxt = score != null ? String(score) : "—";

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

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz · ${escapeXml(name)}">
  <title>Versuz · ${escapeXml(name)}</title>
  <rect width="${W}" height="${H}" fill="#f2eee6"/>

  <!-- Top stripe: 4-color brand bar (ember · azure · sage · amber).
       Tier color is encoded elsewhere (right column subtle dot if needed). -->
  <rect x="0" y="0" width="${(W * 0.34).toFixed(0)}" height="3" fill="#c2410c"/>
  <rect x="${(W * 0.34).toFixed(0)}" y="0" width="${(W * 0.24).toFixed(0)}" height="3" fill="#2a5fa8"/>
  <rect x="${(W * 0.58).toFixed(0)}" y="0" width="${(W * 0.24).toFixed(0)}" height="3" fill="#3f7d4f"/>
  <rect x="${(W * 0.82).toFixed(0)}" y="0" width="${(W * 0.18).toFixed(0)}" height="3" fill="#d69e2e"/>

  <!-- Left zone: VERSUZ caption + name -->
  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="#6b6557" letter-spacing="2.6" font-weight="600">VERSUZ</text>
  <text x="${PAD_X}" y="${nameY}" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="${fontSize}" fill="#14120e" letter-spacing="-0.3">${escapeXml(displayName)}</text>

  <!-- Right dark column: score label + score + tier dot -->
  <rect x="${W - RIGHT_W}" y="3" width="${RIGHT_W}" height="${H - 3}" fill="#14120e"/>
  <text x="${W - RIGHT_W / 2}" y="22" text-anchor="middle" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="#dcd5c8" letter-spacing="2.4" font-weight="600">${escapeXml(scoreLabel)}</text>
  <text x="${W - RIGHT_W / 2}" y="48" text-anchor="middle" font-family="ui-serif,Georgia,serif" font-size="26" fill="#f2eee6" letter-spacing="-0.5">${escapeXml(scoreTxt)}</text>
  <rect x="${W - RIGHT_W / 2 - 3}" y="${H - 12}" width="6" height="6" fill="${stripe}"/>
</svg>`.trim();
}

export async function GET(_request, { params }) {
  const { kind: kindRaw, slug } = await params;
  const kind = kindRaw === "claude-md" ? "claude-md" : "skill";

  const item =
    kind === "claude-md" ? await getClaudeMdBySlug(slug) : await getSkillBySlug(slug);

  if (!item) {
    return new Response(notFoundSvg(), {
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

  const score = item.elo != null ? item.elo : item.prior;
  const scoreLabel = item.elo != null ? "ELO" : "PRIOR";

  const svg = badgeSvg({
    name: name || slug,
    score,
    scoreLabel,
    tier: item.tier || "free",
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
