import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";

export const metadata = {
  title: "Pricing — Versuz",
  description: "Versuz is free to use. Authors can sell premium skills (30/70 split). Boost placement at $4.99 / 30 days.",
};

export const revalidate = 3600; // ISR 1h — contenu statique, voir /about/page.js

const TIERS = [
  {
    id: "free",
    label: "Free",
    eyebrow: "Default — for everyone",
    headline: "Browse, install, rank.",
    price: "$0",
    priceSub: "forever",
    accent: "var(--fg)",
    cta: { href: "/marketplace", label: "Browse the marketplace →" },
    features: [
      { included: true, body: "Full access to the marketplace (100k+ items)" },
      { included: true, body: "All bench rankings + per-judge breakdown" },
      { included: true, body: "Install free items via npx versuz or MCP" },
      { included: true, body: "Submit your own SKILL.md / CLAUDE.md for free" },
      { included: true, body: "Claim ownership of scraped items" },
      { included: true, body: "Full JSON API access (rate-limited fair use)" },
      { included: true, body: "RSS feeds + Cmd+K search" },
      { included: false, body: "Sell premium items (need Stripe Connect activation)" },
      { included: false, body: "Boost placement" },
    ],
  },
  {
    id: "premium",
    label: "Premium",
    eyebrow: "Sellers — author-listed",
    headline: "Sell your skill, keep 70%.",
    price: "30%",
    priceSub: "platform fee per sale",
    accent: "var(--accent)",
    badge: "Most chosen by authors",
    cta: { href: "/profile/settings", label: "Become a seller →" },
    features: [
      { included: true, body: "Set your own price ($1 — $999)" },
      { included: true, body: "Versuz takes 30%, you keep 70%" },
      { included: true, body: "Stripe Connect Express onboarding (5 min)" },
      { included: true, body: "Automatic payouts to your IBAN (daily by default)" },
      { included: true, body: "Real-time earnings dashboard (/profile/earnings)" },
      { included: true, body: "Premium content delivered via signed Supabase Storage URL (7d TTL)" },
      { included: true, body: "30-day refund window for buyers (you don't pay the fee on refunded sales)" },
      { included: true, body: "Dispute alerts + Stripe Express dashboard access" },
      { included: false, body: "Versuz editorial endorsement (that's Featured)" },
    ],
  },
  {
    id: "featured",
    label: "Featured",
    eyebrow: "Versuz first-party",
    headline: "Hand-picked, curated, ours.",
    price: "—",
    priceSub: "Versuz editorial choice",
    accent: "var(--sage)",
    cta: {
      href: "mailto:contact@flukxstudio.fr?subject=Featured%20item%20proposal",
      label: "Pitch a featured item →",
    },
    features: [
      { included: true, body: "Hand-curated by Versuz editorial team" },
      { included: true, body: "Top placement + distinct visual treatment" },
      { included: true, body: "Versuz keeps 100% of the price" },
      { included: true, body: "Long-form review article alongside the listing" },
      { included: true, body: "Quality-controlled : we test every featured item end-to-end" },
      { included: false, body: "Not author-submitted — we reach out to authors of skills we'd like to feature" },
    ],
  },
];

const BOOST = {
  label: "Boost",
  price: "$4.99",
  priceSub: "/ 30 days flat",
  description: "Pure discovery placement. Pins your item to the top of the marketplace (6 slots maximum visible) with a discreet amber ribbon. Does NOT change the ranking or bench score — it's an ad placement, fully separated from quality signals. Stackable up to 365 days max. Available on any free or premium item you own.",
  features: [
    { body: "Pin to top of marketplace (6 visible slots)" },
    { body: "Distinct amber ribbon \"★ Boosted\"" },
    { body: "No impact on bench rankings (we keep that clean)" },
    { body: "Stackable : extend by 30 days at a time, max 365 active" },
    { body: "Daily-stable shuffle inside the boosted slots (no permanent #1)" },
  ],
};

export default function PricingPage() {
  return (
    <div>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Free to browse.{" "}
            <em style={{ color: "var(--accent)" }}>Pay only if you sell.</em>
          </>
        }
        subtitle="Three tiers, transparent split, no surprises. Plus a flat $4.99 / 30d boost placement if you want to surface a specific item."
      />

      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        <RevealStagger
          stagger={0.1}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            marginBottom: 96,
          }}
        >
          {TIERS.map((tier) => (
            <RevealItem key={tier.id}>
              <article
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  padding: "32px 28px",
                  background: "var(--bg)",
                  border: tier.id === "premium" ? `2px solid ${tier.accent}` : "1px solid var(--rule)",
                  height: "100%",
                  position: "relative",
                }}
              >
                {tier.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 16,
                      padding: "4px 10px",
                      background: tier.accent,
                      color: "var(--bg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {tier.badge}
                  </span>
                )}
                <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: tier.accent,
                    }}
                  >
                    {tier.eyebrow}
                  </span>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      color: "var(--fg)",
                    }}
                  >
                    {tier.label}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      lineHeight: 1.4,
                      color: "var(--fg-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    {tier.headline}
                  </p>
                </header>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderTop: "1px solid var(--rule)",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 48,
                      fontWeight: 400,
                      letterSpacing: "-0.03em",
                      color: tier.accent,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {tier.price}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {tier.priceSub}
                  </span>
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  {tier.features.map((f, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16px 1fr",
                        gap: 12,
                        alignItems: "baseline",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: f.included ? "var(--fg)" : "var(--fg-muted)",
                        textDecoration: f.included ? "none" : "line-through",
                        opacity: f.included ? 1 : 0.55,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          color: f.included ? tier.accent : "var(--fg-muted)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {f.included ? "✓" : "—"}
                      </span>
                      <span>{f.body}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.cta.href}
                  style={{
                    display: "block",
                    padding: "14px 20px",
                    background: tier.accent,
                    color: "var(--bg)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {tier.cta.label}
                </Link>
              </article>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Boost section — separate concept */}
        <Reveal>
          <div
            id="boost"
            style={{
              padding: "32px 32px",
              border: "1px solid var(--amber)",
              background: "color-mix(in oklab, var(--amber) 4%, var(--bg))",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "start",
              scrollMarginTop: 96,
            }}
            className="vz-pricing-boost"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--amber)",
                }}
              >
                Add-on — any item, any tier
              </span>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  color: "var(--fg)",
                }}
              >
                ★ {BOOST.label}
              </h2>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 40,
                    fontWeight: 400,
                    color: "var(--amber)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {BOOST.price}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {BOOST.priceSub}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--fg-muted)",
                }}
              >
                {BOOST.description}
              </p>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {BOOST.features.map((f, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "16px 1fr",
                    gap: 12,
                    alignItems: "baseline",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--fg)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      color: "var(--amber)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    ★
                  </span>
                  <span>{f.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* FAQ teasers */}
        <Reveal>
          <div
            style={{
              marginTop: 96,
              paddingTop: 48,
              borderTop: "1px solid var(--rule)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 32,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                Why 30% ?
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                Industry standard for app marketplaces (Apple, Google, GitHub
                Marketplace, Anthropic). Covers Stripe fees (~3%), bench engine
                costs (~$2.60/day ongoing), hosting, dev time. Negotiable for
                volume sellers — email if you ship more than $5k/mo.
              </p>
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                Are refunds taken from sellers ?
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                Yes — refunded transactions unwind fully. Seller doesn&apos;t
                receive revenue, Versuz doesn&apos;t keep its fee either. Stripe
                processing fees may be retained by Stripe in some regions. We
                cover those if you ask.
              </p>
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                Does Boost affect rankings ?
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                No. Boost is purely discovery placement on the marketplace
                surface. Bench scores and leaderboard rankings are 100%
                independent of any payment. We keep that line bright.
              </p>
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                Enterprise / private bench ?
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                Custom benchmarks for private skill catalogs, internal
                tooling, or research are on the roadmap. Email{" "}
                <a href="mailto:contact@flukxstudio.fr" className="vz-link">
                  contact@flukxstudio.fr
                </a>{" "}
                if you have a use case — happy to scope.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div
            style={{
              marginTop: 64,
              padding: 32,
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.4,
                color: "var(--fg)",
              }}
            >
              Full FAQ at{" "}
              <Link href="/faq" className="vz-link" style={{ color: "var(--accent)" }}>
                /faq
              </Link>{" "}
              · Terms at{" "}
              <Link href="/legal/terms" className="vz-link" style={{ color: "var(--accent)" }}>
                /legal/terms
              </Link>{" "}
              · Refund policy at{" "}
              <Link href="/legal/refund" className="vz-link" style={{ color: "var(--accent)" }}>
                /legal/refund
              </Link>
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
