import Link from "next/link";

export const metadata = {
  title: "Not found — Versuz",
};

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "120px 64px 200px",
        position: "relative",
        overflow: "hidden",
        minHeight: "calc(100vh - 200px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <span
        aria-hidden
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -160,
          top: 80,
          width: 320,
          height: 320,
          background: "var(--azure)",
          opacity: 0.85,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 32,
          top: 200,
          width: 4,
          height: 160,
          background: "var(--accent)",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          <span aria-hidden style={{ display: "inline-block", width: 12, height: 12, background: "var(--accent)", marginRight: 12, verticalAlign: "middle" }} />
          Error · 404
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(72px, 10vw, 168px)",
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: "-0.045em",
            color: "var(--fg)",
          }}
        >
          That page <em style={{ color: "var(--accent)" }}>doesn&apos;t rank</em>.
        </h1>
        <p
          style={{
            margin: "32px 0 40px",
            fontFamily: "var(--font-display)",
            fontSize: 22,
            lineHeight: 1.45,
            letterSpacing: "-0.01em",
            color: "var(--fg-muted)",
            maxWidth: 600,
          }}
        >
          The URL you&apos;re looking for isn&apos;t in the registry. Try the leaderboard or
          head back to the front page.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/"
            className="vz-btn-primary"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
              padding: "16px 24px",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Back to home
            <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
          </Link>
          <Link
            href="/leaderboard"
            className="vz-btn-ghost-outline"
            style={{
              padding: "16px 24px",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg)",
              border: "1px solid var(--rule-strong)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            See the leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
