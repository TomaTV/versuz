import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { EnterpriseContactForm } from "./contact-form";

export const metadata = {
  title: "Enterprise — private benchmarks for AI agent skills",
  description:
    "Benchmark your private SKILL.md and CLAUDE.md against the public Versuz registry. 3 frontier LLM judges, weekly or daily cycles, dedicated dashboard. Starter $99/mo, Team $299/mo, Custom on request.",
  alternates: { canonical: "/enterprise" },
  openGraph: {
    title: "Versuz · Enterprise — private skill benchmarks",
    description:
      "Run your private agent skills through the same 3-judge bench engine that ranks the public registry. Starter $99/mo, Team $299/mo.",
    url: "/enterprise",
    type: "website",
  },
};

export const revalidate = 3600;

const TIERS = [
  {
    id: "starter",
    label: "Starter",
    price: "$99",
    priceSub: "/ month",
    eyebrow: "Small team · proof of value",
    headline: "Test your skills before shipping.",
    accent: "var(--azure)",
    features: [
      "Up to 5 private SKILL.md or CLAUDE.md files",
      "Weekly bench cycle (3 judges, 5 held-out tasks)",
      "Dashboard with per-judge scores + axes breakdown",
      "Email digest after each cycle",
      "JSON export of all bench results",
      "Email support · response within 1 business day",
    ],
  },
  {
    id: "team",
    label: "Team",
    price: "$299",
    priceSub: "/ month",
    eyebrow: "Growing org · ongoing measurement",
    headline: "Track every skill in your toolchain.",
    accent: "var(--accent)",
    badge: "Most chosen",
    features: [
      "Up to 25 private SKILL.md or CLAUDE.md files",
      "Daily bench cycle (3 judges, 5 tasks)",
      "Versus mode : compare any 2 skills head-to-head",
      "Slack notification on rank changes",
      "Custom task suite (we craft 10 tasks for your domain)",
      "REST API for CI/CD gating (skill score < X = block PR)",
      "Priority support · response within 4 hours",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    price: "Let's talk",
    priceSub: "",
    eyebrow: "Scale · regulated · on-prem",
    headline: "Built around your workflow.",
    accent: "var(--sage)",
    features: [
      "Unlimited skills, custom cycle cadence",
      "Choose your own judge models (Opus, Gemini Pro, GPT-5, your own)",
      "Private deployment option (your VPC, our engine)",
      "SOC 2 / GDPR documentation pack",
      "Dedicated Slack Connect channel",
      "Quarterly review with the founder",
      "SLA on uptime + support response",
    ],
  },
];

const USE_CASES = [
  {
    title: "Internal dev tools",
    body: "You ship Claude Code skills to your engineering org. Versuz benchmarks them every night so you ship the best version — and catch regressions before your team does.",
  },
  {
    title: "AI procurement",
    body: "You're evaluating skills from third-party vendors. Versuz scores them against your own task suite so the decision is measured, not vibes.",
  },
  {
    title: "Research",
    body: "You're publishing a paper on skill design patterns. Versuz gives you reproducible head-to-head scores with a methodology you can cite.",
  },
  {
    title: "Compliance & QA",
    body: "You need an audit trail proving your AI tooling meets a quality bar. Each bench cycle produces an immutable record with per-judge rationale.",
  },
];

export default function EnterprisePage() {
  return (
    <div>
      <PageHero
        eyebrow="Enterprise"
        title={
          <>
            Your private skills,{" "}
            <em style={{ color: "var(--accent)" }}>same bench</em> as the public arena.
          </>
        }
        subtitle="The same 3-judge engine that ranks 5,000+ public SKILL.md files can run your private catalog on its own schedule. Bench reports, axes breakdown, head-to-head comparisons, CI/CD gating. Starter $99/mo, Team $299/mo, Custom on request."
      />

      <Section eyebrow="§ 01 — Plans" markerColor="var(--accent)" paddingY={64}>
        <RevealStagger
          stagger={0.1}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {TIERS.map((tier) => (
            <RevealItem key={tier.id}>
              <article
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: "28px 24px",
                  border:
                    tier.id === "team"
                      ? `2px solid ${tier.accent}`
                      : "1px solid var(--rule)",
                  background: "var(--bg)",
                  position: "relative",
                  height: "100%",
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
                <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                      fontSize: 26,
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: "var(--fg)",
                    }}
                  >
                    {tier.label}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      lineHeight: 1.4,
                      color: "var(--fg-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    {tier.headline}
                  </p>
                </header>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 400,
                      color: tier.accent,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {tier.price}
                  </span>
                  {tier.priceSub && (
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
                  )}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {tier.features.map((f, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16px 1fr",
                        gap: 10,
                        alignItems: "baseline",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "var(--fg)",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          color: tier.accent,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                        }}
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  style={{
                    display: "block",
                    padding: "10px 16px",
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
                  {tier.id === "custom" ? "Scope a call →" : "Get started →"}
                </a>
              </article>
            </RevealItem>
          ))}
        </RevealStagger>
      </Section>

      <Section eyebrow="§ 02 — Use cases" markerColor="var(--azure)" paddingY={64}>
        <SectionHeader
          title={
            <>
              Who runs <em style={{ color: "var(--accent)" }}>private benchmarks</em>.
            </>
          }
          subtitle="The pattern is the same — you have a portfolio of skills, you want measured proof of which ones work, you want it without writing your own eval harness."
        />
        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {USE_CASES.map((u) => (
            <Reveal key={u.title}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "20px 22px",
                  border: "1px solid var(--rule)",
                  background: "var(--bg)",
                  height: "100%",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 19,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                    color: "var(--fg)",
                  }}
                >
                  {u.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "var(--fg-muted)",
                  }}
                >
                  {u.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        id="contact"
        eyebrow="§ 03 — Contact"
        markerColor="var(--sage)"
        paddingY={64}
      >
        <SectionHeader
          title={
            <>
              Tell us about your <em style={{ color: "var(--accent)" }}>setup</em>.
            </>
          }
          subtitle="The form below goes straight to the founder. Expect a reply within one business day. If you'd rather skip the form, email contact@flukxstudio.fr — same inbox."
        />
        <div style={{ marginTop: 40 }}>
          <EnterpriseContactForm />
        </div>
      </Section>

      <Section eyebrow="§ 04 — FAQ" markerColor="var(--amber)" paddingY={64}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 820,
          }}
        >
          <Faq
            q="How is this different from the public leaderboard?"
            a="The public leaderboard ranks anything on GitHub that publishes a SKILL.md. Enterprise gives you a private bench scope : your skills only, your task suite (we co-craft it for Team and Custom), your dashboard. The same 3 judges, the same methodology, but isolated from the public registry."
          />
          <Faq
            q="What about confidentiality?"
            a="Private skills are stored encrypted at rest in our Postgres + R2 stack. Judges receive the SKILL.md content as part of the inference call ; we use OpenRouter providers that don't log prompts (DeepSeek-direct, Anthropic, OpenAI). Custom tier supports an on-prem deployment if confidentiality is a hard requirement."
          />
          <Faq
            q="Can I bring my own judges?"
            a="Yes on Custom. The bench engine is pluggable — any model accessible via OpenAI-compatible API or Anthropic API can become a judge. Useful if you have a fine-tuned domain model that should weigh more heavily in scoring."
          />
          <Faq
            q="How do you bill?"
            a="Monthly via Stripe, invoiced annually if you prefer. Switching plans is prorated. Refunds within 30 days of first cycle if the engine doesn't fit your workflow."
          />
          <Faq
            q="Can I start with a one-off pilot?"
            a="Yes. We can run a single bench cycle on 5-10 of your skills as a fixed-fee evaluation ($499). If you continue, the fee credits toward your first month."
          />
        </div>
      </Section>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(18px, 2.2vw, 22px)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        {q}
      </h3>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-geist)",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--fg-muted)",
        }}
      >
        {a}
      </p>
    </div>
  );
}
