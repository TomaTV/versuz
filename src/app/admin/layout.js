import Link from "next/link";
import { requireAdmin, ghLogin, ghId } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata = {
  title: "Admin — Versuz",
  robots: { index: false, follow: false },
};

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/cycles", label: "Cycles" },
  { href: "/admin/skills", label: "Skills" },
  { href: "/admin/claude-md", label: "CLAUDE.md" },
  { href: "/admin/subscribers", label: "Subscribers" },
  // Task proposals route kept accessible directly at /admin/task-proposals
  // (not in V0 nav — 14 categories × 7 built-in tasks already cover the suite,
  // generation pipeline reserved for V1+ when expanding the task suite)
];

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();

  if (!user) {
    const current = await getCurrentUser();
    const seenLogin = ghLogin(current);
    const seenId = ghId(current);
    const provider =
      current?.app_metadata?.provider ||
      (current?.identities?.find?.((i) => i.provider === "github") ? "github" : null);
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 56,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            color: "var(--fg)",
            margin: 0,
          }}
        >
          Forbidden.
        </h1>
        <p
          style={{
            marginTop: 24,
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--fg-muted)",
            lineHeight: 1.5,
          }}
        >
          This area requires a Versuz admin GitHub login.
        </p>

        {current && (
          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              border: "1px solid var(--rule)",
              background: "var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: "var(--fg)", marginBottom: 8 }}>
              You ARE signed in, but not in the admin allowlist.
            </div>
            <div>provider: <code>{provider || "(none)"}</code></div>
            <div>github login: <code>{seenLogin || "(none)"}</code></div>
            <div>github id: <code>{seenId || "(none)"}</code></div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
          }}
        >
          {!current && (
            <p style={{ margin: "0 0 12px" }}>
              <Link href="/login" className="vz-link">
                Sign in with GitHub
              </Link>{" "}
              first.
            </p>
          )}
          <p style={{ margin: 0 }}>
            Set <code style={{ color: "var(--fg)" }}>ADMIN_GITHUB_IDS</code> (preferred,
            immutable) or <code style={{ color: "var(--fg)" }}>ADMIN_GITHUB_LOGINS</code>{" "}
            in <code style={{ color: "var(--fg)" }}>.env.local</code>, then restart{" "}
            <code style={{ color: "var(--fg)" }}>npm run dev</code> so the env is reread.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            Find your numeric GitHub ID at{" "}
            <code style={{ color: "var(--fg)" }}>
              https://api.github.com/users/&lt;login&gt;
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  const login = ghLogin(user);

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(16px, 4.5vw, 64px) 120px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 32,
          paddingBottom: 16,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            ADMIN
          </span>
          <nav style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
            {ADMIN_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="vz-nav-link"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  padding: "8px 14px",
                  textDecoration: "none",
                  color: "var(--fg-muted)",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {login}
        </span>
      </header>
      {children}
    </div>
  );
}
