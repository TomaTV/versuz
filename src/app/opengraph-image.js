import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz — Skills go in. Only one wins.";
export const runtime = "nodejs";

// Fetches a static TTF from the Google Fonts CSS API. Sending a desktop
// User-Agent forces the API to serve TTF URLs (the default for modern UAs
// is woff2, which Satori cannot parse). All fetches are cached by Next.
async function loadFont(family, weight = 400, italic = false) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`;
  const css = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    cache: "force-cache",
  }).then((r) => r.text());
  const match = css.match(/src: url\((https:\/\/[^)]+\.ttf)\)/);
  if (!match) throw new Error(`OG font ${family} ${weight} ${italic ? "italic" : "regular"} — TTF URL not found`);
  const buf = await fetch(match[1], { cache: "force-cache" }).then((r) => r.arrayBuffer());
  return buf;
}

export default async function Image() {
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
          padding: 72,
          color: "#14120e",
          fontFamily: "Instrument Serif",
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
          <span style={{ color: "#14120e", fontWeight: 500, letterSpacing: "0.2em" }}>
            VERSUZ
          </span>
          <span>THE OPEN PUBLIC BENCHMARK</span>
        </div>

        {/* Hero — tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 80,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 140,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "#14120e",
              height: 150,
              alignItems: "center",
            }}
          >
            Skills go in.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 140,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              height: 150,
              marginTop: 24,
            }}
          >
            <span style={{ color: "#14120e" }}>Only&nbsp;</span>
            <span style={{ color: "#c2410c" }}>one</span>
            <span style={{ color: "#14120e" }}>&nbsp;wins.</span>
          </div>
          <div
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 26,
              lineHeight: 1.5,
              color: "#14120e",
              opacity: 0.75,
              marginTop: 48,
              marginBottom: 32,
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
            paddingTop: 26,
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
              letterSpacing: "0.18em",
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
              fontSize: 42,
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
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
      ],
    }
  );
}
