import Link from "next/link";
import { CmdKHint } from "@/components/site/cmd-k-hint";
import { UserMenu } from "@/components/site/user-menu";
import { MobileNavMenu } from "@/components/site/mobile-nav-menu";
import { VersuzMark } from "@/components/brand/versuz-mark";
import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin, ghLogin } from "@/lib/auth/admin";
import { signOut } from "@/lib/auth/actions";

const NAV_LINKS = [
  { id: "marketplace", label: "Marketplace", href: "/marketplace" },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { id: "how", label: "How it works", href: "/methodology" },
];

export async function VzNav() {
  const user = await getCurrentUser();
  const login = ghLogin(user);
  const admin = isAdmin(user);

  // Build the user-actions block fed into the mobile drawer. Keeps the
  // entire account UX inside the hamburger on small viewports — no
  // dangling user chip in the top bar.
  const userActions = user
    ? [
        { id: "profile", label: `@${login || user.email}`, href: "/profile" },
        { id: "settings", label: "Settings", href: "/profile/settings" },
        { id: "earnings", label: "Earnings", href: "/profile/earnings" },
        ...(admin ? [{ id: "admin", label: "Admin", href: "/admin" }] : []),
        { id: "submit", label: "Submit", href: "/submit" },
      ]
    : [
        { id: "login", label: "Sign in", href: "/login" },
        { id: "submit", label: "Submit", href: "/submit" },
      ];

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
        {/* Logo : mark officiel seul. Le mark 2-flammes est distinctif —
            il porte l'identité sans avoir besoin du wordmark. Pattern
            standard : Vercel / Linear / GitHub utilisent leur mark seul
            dans la nav. Wordmark visible dans le footer + page titles. */}
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

        {/* Nav links : minimal underline-on-hover, hit area élargie */}
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

        {/* Right cluster : CmdK + user + ember-bordered submit */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, justifySelf: "end" }}>
          <MobileNavMenu links={NAV_LINKS} userActions={userActions} signOutAction={user ? signOut : null} />
          <CmdKHint />
          <span className="vz-nav-user-cluster" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {user ? (
              <UserMenu
                label={login ? `@${login}` : (user.email || "Profile")}
                isAdmin={admin}
                signOutAction={signOut}
              />
            ) : (
              <Link
                href="/login"
                className="vz-nav-signin-ink"
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: "var(--ink)",
                  color: "var(--bone)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  letterSpacing: "-0.005em",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: "0 0 0 1px var(--ink), inset 0 -2px 0 color-mix(in oklab, black 30%, transparent)",
                }}
              >
                Sign in
              </Link>
            )}
            <Link
              href="/submit"
              className="vz-nav-submit-ember"
              style={{
                padding: "9px 18px",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                textDecoration: "none",
                background: "var(--accent)",
                color: "var(--bone)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "-0.005em",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                boxShadow: "0 0 0 1px var(--accent), inset 0 -2px 0 color-mix(in oklab, black 18%, transparent)",
              }}
            >
              <span className="vz-nav-submit-label">Submit a skill</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1 }}>→</span>
            </Link>
          </span>
        </div>
      </div>

      {/* Subtle 4-color stripe — only 1px now, more elegant */}
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
