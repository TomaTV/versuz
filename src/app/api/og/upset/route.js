import { ImageResponse } from "next/og";
import { getTopRankedItems } from "@/lib/queries/rankings";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

async function loadFont(family, weight = 400, italic = false) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`;
  const css = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    cache: "force-cache",
  }).then((r) => r.text());
  const match = css.match(/src: url\((https:\/\/[^)]+\.ttf)\)/);
  if (!match) throw new Error(`OG font ${family} ${weight} not found`);
  return await fetch(match[1], { cache: "force-cache" }).then((r) => r.arrayBuffer());
}

/**
 * "Today's Upset" social card — 1200×630, intended for Twitter / LinkedIn
 * previews. Highlights a challenger that beat the existing leader of a
 * category in the most recent bench cycle.
 *
 * Query params :
 *   - kind        = skill (default) | claude_md
 *   - category    = document | sql | data | ... (defaults to the first
 *                   non-empty category)
 *   - challenger  = slug of the challenger to highlight (optional —
 *                   default: top-1 of the category)
 *   - delta       = rank delta (e.g. 3) — shown as "↑ +3 places"
 *   - title       = optional headline override
 *
 * Falls back to a generic "Top 5 in {category}" card when no upset data
 * is available — still shareable, just less dramatic.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind") || "skill";
  const kind = kindParam === "claude_md" || kindParam === "claude-md" ? "claude_md" : "skill";
  const category = (url.searchParams.get("category") || "document").toLowerCase().replace(/[^a-z0-9-]/g, "") || "document";
  const challengerSlug = url.searchParams.get("challenger");
  const deltaParam = url.searchParams.get("delta");
  const delta = deltaParam ? Number(deltaParam) : null;
  const titleOverride = url.searchParams.get("title");

  // Pull current top 5 for the category.
  let top = [];
  try {
    top = await getTopRankedItems(kind, category, 5);
  } catch {
    top = [];
  }
  // Identify the challenger row (default: rank 1)
  const challengerIdx = challengerSlug
    ? top.findIndex((s) => s.slug === challengerSlug)
    : 0;
  const challenger = challengerIdx >= 0 ? top[challengerIdx] : top[0] || null;

  // Headline construction — challenger-aware when we have one, generic
  // top-5 when the category is empty.
  const headline = titleOverride
    ? titleOverride
    : challenger
      ? `${displayName(challenger)} ${challengerIdx === 0 ? "leads" : "climbs to"} ${category}.`
      : `Top 5 in ${category}.`;

  const [serifRegular, serifItalic, mono] = await Promise.all([
    loadFont("Instrument Serif", 400, false),
    loadFont("Instrument Serif", 400, true),
    loadFont("JetBrains Mono", 500, false),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f2eee6",
          padding: "60px 72px",
          color: "#14120e",
          fontFamily: "Instrument Serif",
          position: "relative",
        }}
      >
        {/* Top brand stripe */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, display: "flex" }}>
          <div style={{ flex: 1.4, background: "#c2410c" }} />
          <div style={{ flex: 1, background: "#e5a644" }} />
          <div style={{ flex: 1, background: "#2a5fa8" }} />
          <div style={{ flex: 1, background: "#3f7d4f" }} />
        </div>

        {/* Header — eyebrow + UPSET stamp */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "JetBrains Mono",
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#6b6557",
          }}
        >
          <span style={{ color: "#14120e", fontWeight: 500 }}>VERSUZ · LIVE RANKING</span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                background: "#c2410c",
                color: "#f2eee6",
                padding: "6px 14px",
                letterSpacing: "0.24em",
                fontWeight: 600,
              }}
            >
              {challenger && challengerIdx !== 0 ? "UPSET" : "TOP 5"}
            </span>
            <span style={{ color: "#14120e" }}>{categoryLabel(category, kind)}</span>
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 36,
            fontFamily: "Instrument Serif",
            fontSize: 64,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#14120e",
            maxWidth: 1060,
          }}
        >
          <span>
            <span style={{ fontStyle: "italic", color: "#c2410c" }}>{headline}</span>
          </span>
          {delta != null && delta !== 0 && (
            <span
              style={{
                display: "flex",
                marginTop: 12,
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                color: delta > 0 ? "#3f7d4f" : "#b23a3a",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {delta > 0 ? `↑ +${delta} places vs last cycle` : `↓ ${delta} places vs last cycle`}
            </span>
          )}
        </div>

        {/* Top 5 leaderboard table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
            borderTop: "1px solid rgba(20,18,14,0.22)",
            flex: 1,
          }}
        >
          {top.length > 0 ? (
            top.map((row, i) => {
              const isChallenger = i === challengerIdx;
              return (
                <div
                  key={row.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: "1px solid rgba(20,18,14,0.12)",
                    background: isChallenger
                      ? "linear-gradient(90deg, rgba(194,65,12,0.16) 0%, rgba(194,65,12,0.04) 80%)"
                      : "transparent",
                    paddingLeft: isChallenger ? 14 : 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      width: 64,
                      fontFamily: "JetBrains Mono",
                      fontSize: 24,
                      color: isChallenger ? "#c2410c" : "#6b6557",
                      fontWeight: 600,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "Instrument Serif",
                      fontStyle: "italic",
                      fontSize: 32,
                      color: "#14120e",
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                    }}
                  >
                    {clip(displayName(row), 48)}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      fontFamily: "JetBrains Mono",
                      fontSize: 22,
                      color: isChallenger ? "#c2410c" : "#14120e",
                      letterSpacing: "0.02em",
                      fontWeight: 600,
                    }}
                  >
                    {row.elo != null ? Number(row.elo).toFixed(1) : row.prior != null ? `~${row.prior}` : "—"}
                    <span style={{ opacity: 0.45, marginLeft: 6, fontSize: 18 }}>
                      {row.elo != null ? "elo" : "prior"}
                    </span>
                  </span>
                </div>
              );
            })
          ) : (
            <div
              style={{
                display: "flex",
                padding: "40px 0",
                fontFamily: "Instrument Serif",
                fontStyle: "italic",
                fontSize: 28,
                color: "#6b6557",
              }}
            >
              No ranked items yet — bench is on its way.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 22,
            color: "#6b6557",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            <span>HAIKU 4.5</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>DEEPSEEK V4</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>GPT-5 MINI</span>
          </div>
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 36,
              color: "#c2410c",
              lineHeight: 1,
            }}
          >
            versuz.dev/{kind === "claude_md" ? "claude-md" : "skills"}/{challenger ? challenger.slug : ""}
          </span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Instrument Serif", data: serifRegular, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serifItalic, weight: 400, style: "italic" },
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
      ],
    }
  );
}

function displayName(row) {
  return (
    row.name ||
    (row.author && row.repo ? `${row.author}/${row.repo}` : row.slug)
  );
}

function clip(s, max) {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

function categoryLabel(cat, kind) {
  const label = cat.replace(/-/g, " ");
  return `${kind === "claude_md" ? "CLAUDE.MD" : "SKILLS"} · ${label.toUpperCase()}`;
}
