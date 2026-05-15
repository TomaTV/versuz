import { createSupabasePublicClient } from "@/lib/supabase/public";

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

// Tier from scraped contributions :
//   Newcomer    — 1 item (matched any kind)
//   Challenger  — 5+ items
//   Contender   — 10+ items, at least 1 benched
//   Champion    — 25+ items, at least 3 benched
//   Veteran     — 50+ items
// Independent from achievements (PHASE 2) — pure quantitative signal.
function computeTier({ total, benched }) {
  if (total >= 50) return "Veteran";
  if (total >= 25 && benched >= 3) return "Champion";
  if (total >= 10 && benched >= 1) return "Contender";
  if (total >= 5) return "Challenger";
  if (total >= 1) return "Newcomer";
  return "—";
}

function tierStripe(tier) {
  if (tier === "Veteran") return "#c2410c"; // ember
  if (tier === "Champion") return "#d69e2e"; // amber
  if (tier === "Contender") return "#3f7d4f"; // sage
  if (tier === "Challenger") return "#2a5fa8"; // azure
  return "#6b6557"; // muted for Newcomer / —
}

function notFoundSvg(style = "default") {
  const isTerminal = style === "terminal";
  const bg = isTerminal ? "#14120e" : "#f2eee6";
  const fg = isTerminal ? "#dcd5c8" : "#14120e";
  const dim = isTerminal ? "#7a7466" : "#6b6557";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz author badge — no contributions">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#6b6557"/>
  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${dim}" letter-spacing="2.6" font-weight="600">VERSUZ · AUTHOR</text>
  <text x="${PAD_X}" y="44" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="22" fill="${fg}">no contributions yet</text>
</svg>`.trim();
}

function authorBadgeSvg({ login, total, benched, tier, style = "default" }) {
  const isTerminal = style === "terminal";
  const stripe = tierStripe(tier);
  const handle = `@${login}`;

  // Auto-fit handle (rarely needed since GitHub max login is 39 char)
  let fontSize = 22;
  let glyphPx = 7.2;
  let maxChars = Math.floor(NAME_W / glyphPx);
  if (handle.length > maxChars) {
    fontSize = 20;
    glyphPx = 6.6;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  if (handle.length > maxChars) {
    fontSize = 18;
    glyphPx = 5.9;
    maxChars = Math.floor(NAME_W / glyphPx);
  }
  const displayHandle = clip(handle, maxChars);
  const nameY = fontSize >= 22 ? 44 : fontSize >= 20 ? 43 : 42;

  // Right column shows the headline number : total contributions.
  // Bench-count communicated by the tier stripe + label.
  const scoreTxt = String(total);

  const leftBg = isTerminal ? "#14120e" : "#f2eee6";
  const leftFg = isTerminal ? "#f2eee6" : "#14120e";
  const leftDim = isTerminal ? "#7a7466" : "#6b6557";
  const rightBg = isTerminal ? "#0a0907" : "#14120e";
  const rightFg = "#f2eee6";
  const rightDim = isTerminal ? "#7a7466" : "#dcd5c8";

  const stripeMarkup = isTerminal
    ? `<rect x="0" y="0" width="${W}" height="3" fill="${stripe}"/>`
    : `<rect x="0" y="0" width="${W}" height="3" fill="${stripe}"/>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Versuz · ${escapeXml(handle)} · ${tier}">
  <title>Versuz · ${escapeXml(handle)} · ${tier} (${total} contributions, ${benched} benched)</title>
  <rect width="${W}" height="${H}" fill="${leftBg}"/>
  ${stripeMarkup}

  <text x="${PAD_X}" y="20" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${leftDim}" letter-spacing="2.6" font-weight="600">VERSUZ · ${escapeXml(tier.toUpperCase())}</text>
  <text x="${PAD_X}" y="${nameY}" font-family="ui-serif,Georgia,serif" font-style="italic" font-size="${fontSize}" fill="${leftFg}" letter-spacing="-0.3">${escapeXml(displayHandle)}</text>

  <rect x="${W - RIGHT_W}" y="3" width="${RIGHT_W}" height="${H - 3}" fill="${rightBg}"/>
  <text x="${W - RIGHT_W / 2}" y="22" text-anchor="middle" font-family="ui-monospace,SF Mono,monospace" font-size="9" fill="${rightDim}" letter-spacing="2.4" font-weight="600">SKILLS</text>
  <text x="${W - RIGHT_W / 2}" y="48" text-anchor="middle" font-family="ui-serif,Georgia,serif" font-size="26" fill="${rightFg}" letter-spacing="-0.5">${escapeXml(scoreTxt)}</text>
  <rect x="${W - RIGHT_W / 2 - 3}" y="${H - 12}" width="6" height="6" fill="${stripe}"/>
</svg>`.trim();
}

/**
 * Pull contribution count from skills + claude_md_files by matching the
 * GitHub URL prefix. Works whether the author claimed or not — that's the
 * point : the badge is a hook back to versuz.dev.
 */
async function loadAuthorStats(login) {
  const sb = createSupabasePublicClient();
  if (!sb) return null;

  // ILIKE prefix match — handles both `https://github.com/login/...` and
  // edge cases like trailing slashes or query strings. github logins are
  // case-insensitive on GitHub itself.
  const prefix = `https://github.com/${login}/%`;

  const [{ data: skills }, { data: claudeMds }] = await Promise.all([
    sb
      .from("skills")
      .select("id, metadata")
      .ilike("github_url", prefix)
      .limit(500),
    sb
      .from("claude_md_files")
      .select("id, metadata")
      .ilike("github_url", prefix)
      .limit(500),
  ]);

  const all = [...(skills || []), ...(claudeMds || [])];
  const total = all.length;
  if (total === 0) return { total: 0, benched: 0 };

  // Count benched from rankings table (subject ids).
  const ids = (skills || []).map((s) => s.id);
  const claudeIds = (claudeMds || []).map((c) => c.id);
  let benched = 0;
  if (ids.length > 0) {
    const { count } = await sb
      .from("rankings")
      .select("*", { count: "exact", head: true })
      .eq("subject_kind", "skill")
      .in("skill_id", ids)
      .not("avg_score", "is", null);
    benched += count || 0;
  }
  if (claudeIds.length > 0) {
    const { count } = await sb
      .from("rankings")
      .select("*", { count: "exact", head: true })
      .eq("subject_kind", "claude_md")
      .in("claude_md_id", claudeIds)
      .not("avg_score", "is", null);
    benched += count || 0;
  }
  return { total, benched };
}

export async function GET(request, { params }) {
  const { login } = await params;
  const url = new URL(request.url);
  const styleParam = url.searchParams.get("style") || "default";
  const style = VALID_STYLE.has(styleParam) ? styleParam : "default";

  const safeLogin = String(login || "").replace(/[^A-Za-z0-9-]/g, "");
  if (!safeLogin) {
    return new Response(notFoundSvg(style), {
      status: 404,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  const stats = await loadAuthorStats(safeLogin);
  if (!stats || stats.total === 0) {
    return new Response(notFoundSvg(style), {
      status: 404,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  const tier = computeTier(stats);
  const svg = authorBadgeSvg({
    login: safeLogin,
    total: stats.total,
    benched: stats.benched,
    tier,
    style,
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // Voir commentaire dans /badge/[kind]/[slug] : embed README, change
      // au plus 1× / 24h après cycle bench.
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
