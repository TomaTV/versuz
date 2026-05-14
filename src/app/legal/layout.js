import Link from "next/link";

const SECTIONS = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/refund", label: "Refund Policy" },
  { href: "/legal/dmca", label: "DMCA / Takedown" },
  { href: "/legal/imprint", label: "Imprint" },
];

export const metadata = {
  title: "Legal — Versuz",
  description: "Terms, privacy policy, refund policy, DMCA, and legal notice for Versuz.",
};

export default function LegalLayout({ children }) {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "clamp(40px, 6vw, 96px) clamp(16px, 4.5vw, 64px) clamp(64px, 10vw, 120px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px minmax(0, 1fr)",
          gap: 56,
        }}
        className="vz-legal-grid"
      >
        <aside
          style={{
            position: "sticky",
            top: 24,
            alignSelf: "start",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
          className="vz-legal-aside"
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              paddingBottom: 8,
              borderBottom: "1px solid var(--rule)",
              marginBottom: 8,
            }}
          >
            Legal
          </span>
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="vz-link"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg)",
                letterSpacing: "0.02em",
                textDecoration: "none",
                padding: "4px 0",
              }}
            >
              {s.label}
            </Link>
          ))}
        </aside>
        <article
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            color: "var(--fg)",
            fontSize: 15,
            lineHeight: 1.65,
          }}
          className="vz-legal-article"
        >
          {children}
        </article>
      </div>
    </div>
  );
}
