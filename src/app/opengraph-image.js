import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz — Skills go in. Only one wins.";
// Force Node runtime — Edge can fail silently on some Vercel regions when
// fonts aren't pre-warmed. Node is slower (~600ms vs 80ms) but bulletproof.
export const runtime = "nodejs";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f2eee6",
          padding: 72,
          color: "#14120e",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Top color stripe (brand) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            display: "flex",
          }}
        >
          <div style={{ flex: 1.4, background: "#c2410c" }} />
          <div style={{ flex: 1, background: "#e5a644" }} />
          <div style={{ flex: 1, background: "#2a5fa8" }} />
          <div style={{ flex: 1, background: "#3f7d4f" }} />
        </div>

        {/* Top row : wordmark + eyebrow */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6b6557",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ fontWeight: 600, color: "#14120e", letterSpacing: "0.16em" }}>
            VERSUZ
          </span>
          <span>THE OPEN PUBLIC BENCHMARK</span>
        </div>

        {/* Hero — tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 90,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 136,
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#14120e",
            }}
          >
            Skills go in.
          </div>
          <div
            style={{
              fontSize: 136,
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#c2410c",
              fontStyle: "italic",
            }}
          >
            Only one wins.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.5,
              color: "#14120e",
              opacity: 0.78,
              marginTop: 28,
              maxWidth: 980,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ~100,000 SKILL.md and CLAUDE.md files, judged by 3 frontier models. Open data. Free CLI.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid rgba(20,18,14,0.18)",
            fontSize: 22,
            color: "#6b6557",
            letterSpacing: "0.06em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", gap: 28, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <span>CLAUDE CODE</span>
            <span>·</span>
            <span>CURSOR</span>
            <span>·</span>
            <span>CODEX</span>
            <span>·</span>
            <span>MCP</span>
          </div>
          <span
            style={{
              color: "#c2410c",
              fontStyle: "italic",
              fontFamily: "serif",
              fontSize: 34,
            }}
          >
            versuz.dev
          </span>
        </div>
      </div>
    ),
    size
  );
}
