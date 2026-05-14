import Link from "next/link";
import { VersuzMark } from "@/components/brand/versuz-mark";
import { NavAuthCluster } from "@/components/site/nav-auth-cluster";

const NAV_LINKS = [
  { id: "marketplace", label: "Marketplace", href: "/marketplace" },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { id: "how", label: "How it works", href: "/methodology" },
];

export function VzNav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div
        className="vz-nav-row"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          height: 72,
          padding: "0 clamp(16px, 4vw, 48px)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 32px)",
        }}
      >
        <Link
          href="/"
          aria-label="Versuz — homepage"
          className="vz-nav-logo"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "var(--fg)",
            lineHeight: 0,
          }}
        >
          <VersuzMark size={64} />
        </Link>

        <nav
          className="vz-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className="vz-nav-link-minimal"
              style={{
                display: "inline-block",
                fontSize: 13.5,
                padding: "10px 14px",
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <NavAuthCluster links={NAV_LINKS} />
      </div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -1,
          height: 1,
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          pointerEvents: "none",
          opacity: 0.85,
        }}
      >
        <span style={{ background: "var(--accent)" }} />
        <span style={{ background: "var(--amber)" }} />
        <span style={{ background: "var(--azure)" }} />
        <span style={{ background: "var(--sage)" }} />
      </div>
    </header>
  );
}
