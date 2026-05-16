import Link from "next/link";
import { VersuzMark } from "@/components/brand/versuz-mark";
import { Eyebrow } from "@/components/brand/eyebrow";

// Sous cacheComponents (Next 16.2), appeler `new Date()` dans un Server
// Component non-cached marque toute la route comme dynamic — c'est ce qui
// faisait planter la migration. Le year est calculé une fois au build
// (`process.env.BUILD_YEAR` injecté par Next, ou fallback statique). Pour
// éviter un mismatch en janvier, on update le const lors du build annuel.
const BUILD_YEAR = 2026;

export function VzFooter() {
  const year = BUILD_YEAR;
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
            gridTemplateColumns: "180px 1fr 1fr 1fr 1fr 1.4fr",
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
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
              }}
            >
              <SocialIcon href="https://x.com/versuzdev" label="Versuz on X">
                <IconX />
              </SocialIcon>
              <SocialIcon href="https://www.linkedin.com/company/versuz-dev" label="Versuz on LinkedIn">
                <IconLinkedIn />
              </SocialIcon>
              <SocialIcon href="https://www.instagram.com/versuz.dev/" label="Versuz on Instagram">
                <IconInstagram />
              </SocialIcon>
              <SocialIcon href="https://www.tiktok.com/@versuz.dev" label="Versuz on TikTok">
                <IconTikTok />
              </SocialIcon>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow>Project</Eyebrow>
            <Link href="/marketplace" className="vz-link">
              Marketplace
            </Link>
            <Link href="/leaderboard" className="vz-link">
              Leaderboard
            </Link>
            <Link href="/achievements" className="vz-link">
              Achievements
            </Link>
            <Link href="/blog" className="vz-link">
              Blog
            </Link>
            <Link href="/methodology" className="vz-link">
              Methodology
            </Link>
            <Link href="/pricing" className="vz-link">
              Pricing
            </Link>
            <Link href="/about" className="vz-link">
              About
            </Link>
            <Link href="/faq" className="vz-link">
              FAQ
            </Link>
            <Link href="/changelog" className="vz-link">
              Changelog
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
            <Link href="/badges" className="vz-link">
              Embed badges
            </Link>
            <Link href="/api-docs" className="vz-link">
              API docs
            </Link>
            <a href="/api/v1/skills" className="vz-link" target="_blank" rel="noreferrer">
              JSON API ↗
            </a>
            <a href="/sitemap.xml" className="vz-link" target="_blank" rel="noreferrer">
              Sitemap
            </a>
            <a
              href="https://github.com/TomaTV/versuz"
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
              href="https://github.com/TomaTV/versuz/tree/main/cli"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>CLI · npx versuz ↗</span>
              <BetaBadge />
            </a>
            <a
              href="https://github.com/TomaTV/versuz/tree/main/mcp-server"
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

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Eyebrow>Legal</Eyebrow>
            <Link href="/legal/terms" className="vz-link">
              Terms of Service
            </Link>
            <Link href="/legal/privacy" className="vz-link">
              Privacy Policy
            </Link>
            <Link href="/legal/refund" className="vz-link">
              Refund Policy
            </Link>
            <Link href="/legal/dmca" className="vz-link">
              DMCA & Takedown
            </Link>
            <Link href="/legal/imprint" className="vz-link">
              Imprint
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
              {/* Honeypot — hidden from real users, bots fill it.
                  Clip-path keeps the input in the layout but invisible/unfocusable,
                  avoiding the left:-9999px trick that causes iOS Safari to
                  scroll to footer on page load. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clipPath: "inset(50%)",
                  whiteSpace: "nowrap",
                  border: 0,
                  pointerEvents: "none",
                }}
              />
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
          <span style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
            Built by{" "}
            <a
              href="https://github.com/TomaTV"
              target="_blank"
              rel="noreferrer"
              className="vz-footer-flukx"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              @TomaTV
            </a>
            <span style={{ opacity: 0.5 }}>·</span>
            <a
              href="https://flukxstudio.fr"
              target="_blank"
              rel="noreferrer"
              className="vz-footer-flukx"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              FlukX Studio
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="vz-social-icon"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        border: "1px solid var(--rule-strong)",
        color: "var(--fg)",
        transition: "border-color 0.15s, color 0.15s, background 0.15s",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
    </svg>
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
