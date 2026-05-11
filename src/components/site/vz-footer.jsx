import Link from "next/link";
import { VersuzMark } from "@/components/brand/versuz-mark";
import { Eyebrow } from "@/components/brand/eyebrow";

export function VzFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid var(--rule)",
        marginTop: 80,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "64px 64px 48px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 1fr 1fr 1.4fr",
            gap: 40,
            marginBottom: 80,
          }}
          className="vz-footer-grid"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <VersuzMark size={72} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              versuz.dev
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow>Project</Eyebrow>
            <Link href="/marketplace" className="vz-link">
              Marketplace
            </Link>
            <Link href="/leaderboard" className="vz-link">
              Leaderboard
            </Link>
            <Link href="/methodology" className="vz-link">
              Methodology
            </Link>
            <Link href="/about" className="vz-link">
              About
            </Link>
            <Link href="/status" className="vz-link">
              Status
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow>Open data</Eyebrow>
            <Link href="/feed" className="vz-link">
              RSS feeds
            </Link>
            <a href="/api/v1/skills" className="vz-link" target="_blank" rel="noreferrer">
              JSON API ↗
            </a>
            <a href="/sitemap.xml" className="vz-link" target="_blank" rel="noreferrer">
              Sitemap
            </a>
            <a
              href="https://github.com/versuzdev/versuz"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
            >
              GitHub ↗
            </a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow>Tools</Eyebrow>
            <a
              href="https://github.com/versuzdev/versuz/tree/main/cli"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>CLI · npx versuz ↗</span>
              <BetaBadge />
            </a>
            <a
              href="https://github.com/versuzdev/versuz/tree/main/mcp-server"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>MCP server ↗</span>
              <BetaBadge />
            </a>
            <Link href="/about#tools" className="vz-link">
              Install guide
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <Eyebrow>Subscribe</Eyebrow>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                color: "var(--fg)",
                maxWidth: 360,
              }}
            >
              Weekly result digest. <em style={{ color: "var(--accent)" }}>No spam.</em>
            </p>
            <form
              action="/api/subscribe"
              method="post"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid var(--rule-strong)",
                padding: "8px 0",
                width: "100%",
                maxWidth: 360,
              }}
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@somewhere.dev"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--fg)",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--accent)",
                }}
                aria-label="Subscribe"
              >
                ↗
              </button>
            </form>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
              }}
            >
              Or grab the <Link href="/feed" className="vz-link">RSS feed</Link>.
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            paddingTop: 24,
            borderTop: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <span>© {year} Versuz · built in public · MIT</span>
          <a
            href="https://flukxstudio.fr"
            target="_blank"
            rel="noreferrer"
            className="vz-footer-flukx"
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            FlukX Studio
          </a>
        </div>
      </div>
    </footer>
  );
}

function BetaBadge() {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "1px 5px",
        color: "var(--azure)",
        border: "1px solid var(--azure)",
        background: "color-mix(in oklab, var(--azure) 8%, transparent)",
        fontWeight: 600,
      }}
    >
      Beta
    </span>
  );
}
