import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getTopRankedItems } from "@/lib/queries/rankings";

const W = 420;
const H = 62;
const RIGHT_W = 88;
const PAD_X = 14;
const NAME_W = W - RIGHT_W - PAD_X * 2;

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

// Category bucket → stripe color. Buckets are loose semantic groupings
// matching how the marketplace renders pills (see CONTEXT.md categories).
const CATEGORY_GROUP_COLOR = {
  // V0/V1 broad
  document: "#c2410c", // ember
  sql: "#c2410c",
  data: "#c2410c",
  web: "#c2410c",
  shell: "#c2410c",
  code: "#c2410c",
  other: "#6b6557",
  // V1.5 agent-specific
  "claude-skill": "#2a5fa8", // azure
  codex: "#2a5fa8",
  "cursor-rule": "#2a5fa8",
  "windsurf-rule": "#2a5fa8",
  antigravity: "#2a5fa8",
  "mcp-server": "#2a5fa8",
  "continue-rule": "#2a5fa8",
  "roo-code": "#2a5fa8",
  cline: "#2a5fa8",
  // V1.5+ broader
  writing: "#3f7d4f", // sage
  design: "#3f7d4f",
  marketing: "#3f7d4f",
  automation: "#3f7d4f",
  research: "#3f7d4f",
  // V1.5++ wrappers
  "api-integration": "#d69e2e", // amber
  macos: "#d69e2e",
  communication: "#d69e2e",
  media: "#d69e2e",
  testing: "#d69e2e",
  devops: "#d69e2e",
  // CLAUDE.md categories
  nextjs: "#2a5fa8",
  react: "#2a5fa8",
  "python-data": "#c2410c",
  "backend-api": "#c2410c",
  mobile: "#3f7d4f",
  "ml-training": "#c2410c",
  generic: "#6b6557",
};

function stripeForCategory(cat) {
  return CATEGORY_GROUP_COLOR[String(cat || "").toLowerCase()] || "#6b6557";
}

function notFoundSvg(style = "default") {
  const isTerminal = style === "terminal";
  const bg = isTerminal ? "#14120e" : "#f2eee6";
  const fg = isTerminal ? "#dcd5c8" : "#14120e";
  const dim = isTerminal ? "#7a7466" : "#6b6557";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz category badge — unknown category">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#6b6557"/>
  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${dim}" letter-spacing="2.6" font-weight="600">VERSUZ · CATEGORY</text>
  <text x="${PAD_X}" y="44" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="22" fill="${fg}">no items yet</text>
</svg>`.trim();
}

function categoryBadgeSvg({ category, kindLabel, total, benched, topName, style = "default" }) {
  const isTerminal = style === "terminal";
  const stripe = stripeForCategory(category);

  // Left zone uses category name (italic serif), right shows total count.
  let fontSize = 22;
  let glyphPx = 7.2;
  let maxChars = Math.floor(NAME_W / glyphPx);
  if (category.length > maxChars) {
    fontSize = 20;
    glyphPx = 6.6;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  if (category.length > maxChars) {
    fontSize = 18;
    glyphPx = 5.9;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  const displayCat = clip(category, maxChars);
  const nameY = fontSize >= 22 ? 44 : fontSize >= 20 ? 43 : 42;

  const scoreTxt = String(total);

  const leftBg = isTerminal ? "#14120e" : "#f2eee6";
  const leftFg = isTerminal ? "#f2eee6" : "#14120e";
  const leftDim = isTerminal ? "#7a7466" : "#6b6557";
  const rightBg = isTerminal ? "#0a0907" : "#14120e";
  const rightFg = "#f2eee6";
  const rightDim = isTerminal ? "#7a7466" : "#dcd5c8";

  // Right column label : if benched > 0 show "RANKED" (live bench data),
  // else "INDEXED" (registry size only — bench hasn't reached this cat yet).
  const rightLabel = benched > 0 ? "RANKED" : "INDEXED";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz · ${escapeXml(category)} · ${total} ${escapeXml(kindLabel)}s${benched > 0 ? ` · ${benched} benched` : ""}">
  <title>Versuz · ${escapeXml(category)} · ${total} ${escapeXml(kindLabel)}s indexed${benched > 0 ? ` · ${benched} benched` : " (bench coming)"}${topName ? ` · #1 ${topName}` : ""}</title>
  <rect width="${W}" height="${H}" fill="${leftBg}"/>
  <rect x="0" y="0" width="${W}" height="3" fill="${stripe}"/>

  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${leftDim}" letter-spacing="2.6" font-weight="600">VERSUZ · TOP ${escapeXml(kindLabel.toUpperCase())}S IN</text>
  <text x="${PAD_X}" y="${nameY}" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="${fontSize}" fill="${leftFg}" letter-spacing="-0.3">${escapeXml(displayCat)}</text>

  <rect x="${W - RIGHT_W}" y="3" width="${RIGHT_W}" height="${H - 3}" fill="${rightBg}"/>
  <text x="${W - RIGHT_W / 2}" y="22" text-anchor="middle" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${rightDim}" letter-spacing="2.4" font-weight="600">${rightLabel}</text>
  <text x="${W - RIGHT_W / 2}" y="48" text-anchor="middle" font-family="ui-serif,Georgia,serif" font-size="26" fill="${rightFg}" letter-spacing="-0.5">${escapeXml(scoreTxt)}</text>
  <rect x="${W - RIGHT_W / 2 - 3}" y="${H - 12}" width="6" height="6" fill="${stripe}"/>
</svg>`.trim();
}

/**
 * Number of items in this category that exist in the registry — counts
 * skills/claude_md_files filtered by category, not just benched ones.
 * Most categories have far more registered items than benched, and the
 * badge is meant to advertise the size of the marketplace ("247 PDF
 * skills indexed") not just the benchmark progress.
 *
 * Bench coverage is communicated separately via `benched` (the subset
 * with non-null avg_score in `rankings`).
 */
async function loadCategoryStats(category, kind) {
  const sb = createSupabasePublicClient();
  if (!sb) return null;

  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const catCol = kind === "claude_md" ? "project_category" : "category";

  // Total in registry — single category col (fast, indexed). multi-cat
  // matching via the `categories` jsonb is more expensive and rarely
  // changes the number meaningfully for the badge.
  const { count: total } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(catCol, category)
    .eq("is_archived", false);

  // Benched count from the materialized view (subset that has bench data)
  const { count: benched } = await sb
    .from("rankings")
    .select("*", { count: "exact", head: true })
    .eq("subject_kind", kind)
    .eq("category", category)
    .not("avg_score", "is", null);

  // Also pull the current #1 name for the <title> tooltip.
  const top = await getTopRankedItems(kind, category, 1).catch(() => []);
  const topName = top[0]?.name || null;

  return { total: total || 0, benched: benched || 0, topName };
}

export async function GET(request, { params }) {
  const { cat } = await params;
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind") || "skill";
  const styleParam = url.searchParams.get("style") || "default";
  const kind = kindParam === "claude_md" || kindParam === "claude-md" ? "claude_md" : "skill";
  const style = VALID_STYLE.has(styleParam) ? styleParam : "default";
  const kindLabel = kind === "claude_md" ? "claude.md" : "skill";

  // Whitelist category slug — same rules as URLs elsewhere (no special chars).
  const safeCat = String(cat || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!safeCat) {
    return new Response(notFoundSvg(style), {
      status: 404,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  const stats = await loadCategoryStats(safeCat, kind);
  if (!stats || stats.total === 0) {
    return new Response(notFoundSvg(style), {
      status: 404,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  const svg = categoryBadgeSvg({
    category: safeCat,
    kindLabel,
    total: stats.total,
    benched: stats.benched,
    topName: stats.topName,
    style,
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Cache CDN 24h + SWR 7j — voir /badge/[kind]/[slug] pour le rationale.
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
