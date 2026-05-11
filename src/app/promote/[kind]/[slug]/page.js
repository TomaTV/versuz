import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import {
  loadPromotableSubject,
  createPromoteCheckoutAction,
} from "@/lib/stripe/promote-actions";
import { PROMOTE_PRICE_USD, PROMOTE_DAYS } from "@/lib/stripe/promote-config";
import { isStripeConfigured } from "@/lib/stripe/server";
import { Section, PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { BackButton } from "@/components/site/back-button";

export const metadata = { title: "Boost — Versuz" };

const ERR_COPY = {
  not_found: "This item doesn't exist.",
  supabase_unconfigured: "Database not configured.",
  cap_reached: "Buying another boost would push the active window past the 365-day cap. Wait for the current boost to expire (or get closer to expiring) before stacking more.",
  rate_limit: "You bought a boost on this item less than 24h ago. Wait a day before stacking another.",
};

export default async function PromotePage({ params, searchParams }) {
  const { kind: kindRaw, slug } = await params;
  const sp = (await searchParams) || {};
  const kind = kindRaw === "claude-md" ? "claude_md" : kindRaw;
  if (!["skill", "claude_md"].includes(kind)) redirect("/marketplace");

  if (!isStripeConfigured()) {
    return (
      <PageHero
        compact
        eyebrow="Boost"
        title="Stripe not configured."
        subtitle="STRIPE_SECRET_KEY missing. Boosts are disabled in this deploy."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/promote/${kindRaw}/${slug}`)}`);
  }

  const { subject, error } = await loadPromotableSubject({ kind, slug });
  if (error || !subject) {
    return (
      <div>
        <PageHero compact eyebrow="Boost" title="Can't promote." subtitle={ERR_COPY[error] || "Unknown error."} />
        <Section eyebrow="§ 01" markerColor="var(--azure)">
          <BackButton fallbackHref="/marketplace" label="← Back" className="vz-link" />
        </Section>
      </div>
    );
  }

  const displayName =
    kind === "skill"
      ? subject.name
      : subject.metadata?.author && subject.metadata?.repo
        ? `${subject.metadata.author}/${subject.metadata.repo}`
        : subject.slug;

  const isAlreadyBoosted =
    subject.promoted_until && new Date(subject.promoted_until) > new Date();
  const remainingDays = isAlreadyBoosted
    ? Math.ceil(
        (new Date(subject.promoted_until).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div>
      <PageHero
        compact
        eyebrow="Boost"
        title={
          <>
            Promote <em style={{ color: "var(--accent)" }}>{displayName}</em>.
          </>
        }
        subtitle={`Featured placement on the marketplace for ${PROMOTE_DAYS} days. Boosted items appear above standard sort and get a "BOOSTED" pill on their card. ${isAlreadyBoosted ? `Currently boosted for ${remainingDays} more day${remainingDays > 1 ? "s" : ""} — buying now stacks the window.` : "100% of the boost fee goes to Versuz (this is platform ad placement, not creator revenue)."}`}
      />

      <Section eyebrow="§ 01 — Order summary" markerColor="var(--accent)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 0,
            border: "1px solid var(--rule-strong)",
          }}
          className="vz-stat-grid"
        >
          <div style={{ padding: "32px 28px", borderRight: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <TierBadge tier={subject.tier} priceUsd={subject.price_usd} size="md" />
              {isAlreadyBoosted && <BoostedPill remainingDays={remainingDays} />}
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 36,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {displayName}
            </h2>
            <p
              style={{
                marginTop: 14,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--fg-muted)",
                lineHeight: 1.6,
              }}
            >
              {subject.description || "—"}
            </p>
          </div>

          <div
            style={{
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Row label="Boost duration" value={`${PROMOTE_DAYS} days`} />
            <Row label="Marketplace placement" value="Top of category" muted />
            <Row label="Card pill" value="◆ BOOSTED" muted />
            <div style={{ height: 1, background: "var(--rule-strong)", margin: "8px 0" }} />
            <Row label="Total" value={`$${PROMOTE_PRICE_USD.toFixed(2)}`} large />

            <form action={createPromoteCheckoutAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Boost via Stripe →
              </button>
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Secure checkout via Stripe. You&apos;ll be redirected.
              </p>
            </form>
          </div>
        </div>

        {sp.err && (
          <p
            style={{
              marginTop: 24,
              padding: "12px 16px",
              border: "1px solid var(--crimson)",
              background: "var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--crimson)",
            }}
          >
            {ERR_COPY[sp.err] || `Error: ${sp.err}`}
          </p>
        )}
      </Section>

      <Section eyebrow="§ 02 — What boosting does" markerColor="var(--azure)" paddingY={48}>
        <ul
          style={{
            margin: 0,
            paddingLeft: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--fg)",
            lineHeight: 1.6,
            maxWidth: 720,
          }}
        >
          <li>
            <strong style={{ fontWeight: 500 }}>Top sort</strong> — your item
            jumps to the top of its category in <code>/marketplace</code>{" "}
            (within the same tier — boost doesn&apos;t override Elo).
          </li>
          <li>
            <strong style={{ fontWeight: 500 }}>BOOSTED pill</strong> — small
            amber tag on the marketplace card for the duration of the boost.
          </li>
          <li>
            <strong style={{ fontWeight: 500 }}>Stacking</strong> — buying a
            second boost while one is active adds {PROMOTE_DAYS} days to the
            existing window. No max stack.
          </li>
          <li>
            <strong style={{ fontWeight: 500 }}>Doesn&apos;t affect ranking</strong> —
            judges score your skill based on output quality, not whether
            you paid for placement. Boost is purely a discoverability lever.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function BoostedPill({ remainingDays }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--bg)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        background: "var(--amber)",
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, background: "var(--bg)" }} />
      Boosted · {remainingDays}d left
    </span>
  );
}

function Row({ label, value, muted = false, large = false }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: large ? 28 : 18,
          color: muted ? "var(--fg-muted)" : "var(--fg)",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
