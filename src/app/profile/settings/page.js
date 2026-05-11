import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { getCurrentProfile } from "@/lib/profiles/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import {
  startStripeOnboarding,
  refreshStripeAccountStatus,
  openStripeDashboard,
} from "@/lib/stripe/connect-actions";
import { Section, PageHero } from "@/components/section";

export const metadata = { title: "Settings — Versuz" };

export default async function SettingsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/settings");

  // If returning from Stripe onboarding, refresh status server-side first.
  // refreshStripeAccountStatus reads from admin (bypassing React.cache),
  // writes the stripe_* fields, and returns the patch — which we overlay on
  // the cached profile below since getProfile may already be cached stale.
  const sp = (await searchParams) || {};
  let stripePatch = null;
  if (sp.stripe === "return") {
    try {
      stripePatch = await refreshStripeAccountStatus();
    } catch (err) {
      console.warn(`[settings] refresh failed: ${err.message}`);
    }
  }

  const baseProfile = await getCurrentProfile(user);
  const profile = stripePatch ? { ...baseProfile, ...stripePatch } : baseProfile;
  const stripeReady = isStripeConfigured();

  const onboardingState = !stripeReady
    ? "missing-config"
    : !profile.stripe_account_id
      ? "not-started"
      : !profile.stripe_onboarding_complete
        ? "in-progress"
        : "connected";

  return (
    <div>
      <PageHero
        compact
        eyebrow="Settings"
        title={
          <>
            Sell on <em style={{ color: "var(--accent)" }}>Versuz</em>.
          </>
        }
        subtitle="Connect Stripe to receive payouts when buyers purchase your premium skills or CLAUDE.md files. Versuz takes 30%, you keep 70%, paid out automatically."
      />

      <Section eyebrow="§ 01 — Stripe Connect" markerColor="var(--accent)">
        <StripeStatusGrid profile={profile} state={onboardingState} />

        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {onboardingState === "not-started" && (
            <form action={startStripeOnboarding}>
              <SubmitButton primary>Become a seller →</SubmitButton>
            </form>
          )}
          {onboardingState === "in-progress" && (
            <form action={startStripeOnboarding}>
              <SubmitButton primary>Continue onboarding →</SubmitButton>
            </form>
          )}
          {onboardingState === "connected" && (
            <>
              <form action={openStripeDashboard}>
                <SubmitButton>Open Stripe dashboard ↗</SubmitButton>
              </form>
              <Link
                href="/profile/earnings"
                style={{
                  padding: "14px 22px",
                  border: "1px solid var(--rule-strong)",
                  background: "transparent",
                  color: "var(--fg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                View earnings →
              </Link>
            </>
          )}
          {onboardingState === "missing-config" && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--crimson)",
                margin: 0,
              }}
            >
              Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.
            </p>
          )}
        </div>

        {onboardingState === "connected" && (
          <p
            style={{
              marginTop: 24,
              padding: "16px 20px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            ✓ Charges enabled. When a buyer purchases one of your premium items,
            Stripe sends 70% directly to your connected account and 30% to
            Versuz, automatically. No manual payouts to chase.
          </p>
        )}
      </Section>

      <Section eyebrow="§ 02 — Profile" markerColor="var(--azure)" paddingY={48}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
          className="vz-stat-grid"
        >
          <Cell label="Display name" value={profile.display_name} />
          <Cell label="GitHub" value={profile.github_login ? `@${profile.github_login}` : "—"} />
          <Cell label="Email" value={user.email} />
          <Cell label="User ID" value={user.id.slice(0, 8) + "…"} />
        </div>
        <p
          style={{
            marginTop: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          Display name and avatar are synced from GitHub on sign-in. Profile
          editing UI lands in V1.5.
        </p>
      </Section>
    </div>
  );
}

function StripeStatusGrid({ profile, state }) {
  const rows = [
    { label: "Account", value: profile.stripe_account_id || "—" },
    {
      label: "Onboarding",
      value: state === "connected" ? "Complete" : state === "in-progress" ? "In progress" : "Not started",
      color: state === "connected" ? "var(--sage)" : state === "in-progress" ? "var(--amber)" : undefined,
    },
    {
      label: "Charges",
      value: profile.stripe_charges_enabled ? "Enabled" : "Disabled",
      color: profile.stripe_charges_enabled ? "var(--sage)" : undefined,
    },
    {
      label: "Payouts",
      value: profile.stripe_payouts_enabled ? "Enabled" : "Disabled",
      color: profile.stripe_payouts_enabled ? "var(--sage)" : undefined,
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid var(--rule-strong)",
        borderBottom: "1px solid var(--rule)",
      }}
      className="vz-stat-grid"
    >
      {rows.map((r) => (
        <Cell key={r.label} {...r} />
      ))}
    </div>
  );
}

function SubmitButton({ children, primary = false }) {
  return (
    <button
      type="submit"
      style={{
        padding: "14px 22px",
        border: primary ? "1px solid var(--accent)" : "1px solid var(--rule-strong)",
        background: primary ? "var(--accent)" : "transparent",
        color: primary ? "var(--bg)" : "var(--fg)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Cell({ label, value, color }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 400,
          color: color || "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          wordBreak: "break-all",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}
