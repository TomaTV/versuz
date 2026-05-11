import { signUpWithPassword, signInWithGitHub } from "@/lib/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Create an account — Versuz",
  description: "Create a Versuz account to submit your skill or claim a CLAUDE.md.",
};

export default async function RegisterPage({ searchParams }) {
  const params = (await searchParams) || {};
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <AuthShell
      eyebrow="Create account"
      title={
        <>
          Bring your <em style={{ color: "var(--accent)" }}>skill</em>.
        </>
      }
      subtitle="GitHub OAuth is the recommended path — it lets you claim ownership of any skill or CLAUDE.md you authored under the same handle."
    >
      <AuthForm
        kind="signup"
        action={signUpWithPassword}
        oauthAction={signInWithGitHub}
        initialError={error}
        switchHref="/login"
        switchLabel="Already have an account · sign in"
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
          background: "var(--sage)",
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
