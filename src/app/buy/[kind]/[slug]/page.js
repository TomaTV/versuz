import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { loadBuyableSubject, createCheckoutAction } from "@/lib/stripe/checkout-actions";
import { isStripeConfigured } from "@/lib/stripe/server";
import { getOwnedSlugs } from "@/lib/purchases/server";
import { Section, PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { OfficialBadge } from "@/components/marketplace/official-badge";
import { BackButton } from "@/components/site/back-button";
import { TrackClick } from "@/components/track-click";

export const metadata = { title: "Buy — Versuz" };

const ERR_COPY = {
  not_found: "This item doesn't exist.",
  not_for_sale: "This item is free — head to the detail page to install it.",
  no_seller: "No author has claimed this item yet, so it can't be sold.",
  seller_not_payable: "The author hasn't finished Stripe onboarding yet.",
  supabase_unconfigured: "Database not configured.",
};

export default async function BuyPage({ params, searchParams }) {
  const { kind: kindRaw, slug } = await params;
  const sp = (await searchParams) || {};

  // Normalize URL kind. Routes use `claude-md` in URLs but DB uses `claude_md`.
  const kind = kindRaw === "claude-md" ? "claude_md" : kindRaw;
  if (!["skill", "claude_md"].includes(kind)) redirect("/marketplace");

  if (!isStripeConfigured()) {
    return (
      <PageHero
        eyebrow="Buy"
        title="Stripe not configured."
        subtitle="STRIPE_SECRET_KEY missing. Premium purchases are disabled in this deploy."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/buy/${kindRaw}/${slug}`)}`);
  }

  // Already owned? Redirect to detail.
  const owned = await getOwnedSlugs(user.id);
  const ownedSet = kind === "skill" ? owned.skills : owned.claudeMds;
  if (ownedSet.has(slug)) {
    redirect(kind === "skill" ? `/skills/${slug}` : `/claude-md/generic/${slug}`);
  }

  const result = await loadBuyableSubject({ kind, slug });
  const { subject, seller, error } = result;

  if (error === "not_for_sale") {
    redirect(kind === "skill" ? `/skills/${slug}` : `/claude-md/${subject?.project_category || "generic"}/${slug}`);
  }

  if (error || !subject) {
    return (
      <div>
        <PageHero compact eyebrow="Buy" title="Can't checkout." subtitle={ERR_COPY[error] || "Unknown error."} />
        <Section eyebrow="§ 01 — What now?" markerColor="var(--azure)">
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

  return (
    <div>
      <PageHero
        compact
        eyebrow={kind === "skill" ? "Buy a skill" : "Buy a CLAUDE.md"}
        title={
          <>
            <em style={{ color: "var(--accent)" }}>{displayName}</em>
          </>
        }
        subtitle={subject.description || "Premium item — proceeds support the author and curation."}
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
              <TierBadge tier={subject.tier} priceUsd={subject.price_usd} size="lg" />
              <OfficialBadge official={subject.is_official} showLabel />
              <VerificationBadge level={subject.verification_level} showLabel />
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
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 24,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
              }}
            >
              <span>★ {subject.github_stars || 0}</span>
              {kind === "skill" && <span>{subject.category}</span>}
              {kind === "claude_md" && <span>{subject.project_category}</span>}
              {seller.github_login ? (
                <Link
                  href={`/u/${seller.github_login}`}
                  className="vz-link"
                  style={{ color: "var(--fg-muted)" }}
                >
                  seller: @{seller.github_login}
                </Link>
              ) : (
                <span>seller: anonymous</span>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Row label="Price" value={`$${Number(subject.price_usd).toFixed(2)}`} />
            <Row
              label="Versuz fee (30%)"
              value={`$${(Number(subject.price_usd) * 0.3).toFixed(2)}`}
              muted
            />
            <Row
              label="Author receives (70%)"
              value={`$${(Number(subject.price_usd) * 0.7).toFixed(2)}`}
              muted
            />
            <div style={{ height: 1, background: "var(--rule-strong)", margin: "8px 0" }} />
            <Row label="Total" value={`$${Number(subject.price_usd).toFixed(2)}`} large />

            <form action={createCheckoutAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="slug" value={slug} />
              <TrackClick
                event="purchase_started"
                props={{ kind, slug, price_usd: Number(subject.price_usd) }}
              >
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
                  Pay with Stripe →
                </button>
              </TrackClick>
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

      <Section eyebrow="§ 02 — What you get" markerColor="var(--azure)" paddingY={48}>
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
            <strong style={{ fontWeight: 500 }}>Direct support to the author</strong> — 70% of every purchase goes
            straight to <em>@{seller.github_login}</em> via Stripe Connect.
          </li>
          <li>
            <strong style={{ fontWeight: 500 }}>Verified badge</strong> across the marketplace, leaderboard, and
            embed badges.
          </li>
          <li>
            <strong style={{ fontWeight: 500 }}>Featured placement</strong> in category browsing and Cmd+K search.
          </li>
        </ul>
      </Section>
    </div>
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
