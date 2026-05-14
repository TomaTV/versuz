import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz — Skills go in. Only one wins.";
export const runtime = "nodejs";

// Font sources : Google Fonts repo on GitHub raw. Fetch is cached by Next.
const FONT_SOURCES = {
  instrumentSerifRegular:
    "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf",
  instrumentSerifItalic:
    "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf",
  jetbrainsMono:
    "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
  geist:
    "https://github.com/google/fonts/raw/main/ofl/geist/Geist%5Bwght%5D.ttf",
};

async function loadFont(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Font fetch ${url} → ${res.status}`);
  return res.arrayBuffer();
}

export default async function Image() {
  const [serifRegular, serifItalic, mono, sans] = await Promise.all([
    loadFont(FONT_SOURCES.instrumentSerifRegular),
    loadFont(FONT_SOURCES.instrumentSerifItalic),
    loadFont(FONT_SOURCES.jetbrainsMono),
    loadFont(FONT_SOURCES.geist),
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
          padding: 72,
          color: "#14120e",
          fontFamily: "Geist",
          position: "relative",
        }}
      >
        {/* Top color stripe */}
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
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#6b6557",
          }}
        >
          <span style={{ color: "#14120e", fontWeight: 600, letterSpacing: "0.18em" }}>
            VERSUZ
          </span>
          <span>THE OPEN PUBLIC BENCHMARK</span>
        </div>

        {/* Hero — tagline using Instrument Serif */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: 90,
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 156,
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "#14120e",
            }}
          >
            Skills go in.
          </div>
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 156,
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "#c2410c",
              marginTop: -8,
            }}
          >
            Only one wins.
          </div>
          <div
            style={{
              fontFamily: "Geist",
              fontSize: 26,
              lineHeight: 1.5,
              color: "#14120e",
              opacity: 0.78,
              marginTop: 32,
              maxWidth: 980,
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
            paddingTop: 22,
            borderTop: "1px solid rgba(20,18,14,0.18)",
            color: "#6b6557",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              fontFamily: "JetBrains Mono",
              fontSize: 16,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            <span>CLAUDE CODE</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>CURSOR</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>CODEX</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>MCP</span>
          </div>
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 40,
              color: "#c2410c",
              lineHeight: 1,
            }}
          >
            versuz.dev
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serifRegular, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serifItalic, weight: 400, style: "italic" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
        { name: "Geist", data: sans, weight: 400, style: "normal" },
      ],
    }
  );
}
