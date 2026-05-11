import Link from "next/link";
import { signInWithPassword, signInWithGitHub } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign in — Versuz",
  description: "Sign in to submit your skill, claim a CLAUDE.md, or watch a leaderboard.",
};

export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <AuthShell
      eyebrow="Sign in"
      title={
        <>
          Welcome <em style={{ color: "var(--accent)" }}>back</em>.
        </>
      }
      subtitle="Sign in to submit a skill, claim a CLAUDE.md you authored, or get notified when your rank changes."
    >
      <AuthForm
        kind="signin"
        action={signInWithPassword}
        oauthAction={signInWithGitHub}
        initialError={error}
        switchHref="/register"
        switchLabel="Create an account"
      />
    </AuthShell>
  );
}

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -160,
          top: 80,
          width: 280,
          height: 280,
          background: "var(--azure)",
          opacity: 0.92,
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: 96,
          alignItems: "flex-start",
          maxWidth: 1280,
          margin: "0 auto",
        }}
        className="vz-auth-grid"
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 32,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span aria-hidden style={{ width: 12, height: 12, background: "var(--accent)" }} />
            <span>{eyebrow}</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(56px, 7vw, 128px)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "var(--fg)",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "32px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 22,
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
              color: "var(--fg-muted)",
              maxWidth: 560,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
