import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";

export const metadata = {
  title: "FAQ — Versuz",
  description: "Common questions about Versuz : how skills are ranked, how premium works, who sees what, what the data is for.",
};

// Contenu 100% statique. ISR 1h — voir /about/page.js.
export const revalidate = 3600;

const CATEGORIES = [
  {
    id: "general",
    label: "General",
    items: [
      {
        q: "What is Versuz exactly ?",
        a: "A public benchmark and marketplace for AI agent skills. We index every public SKILL.md and CLAUDE.md from GitHub, run them through a held-out task suite, judge the outputs with three frontier LLMs, and publish a ranking. Free directory by default, with optional premium opt-in for authors.",
      },
      {
        q: "Who is Versuz for ?",
        a: "Developers who use Claude Code, Codex CLI, Cursor, or any agentic coding tool, and who want to know which SKILL.md actually performs vs. just being popular. Also for authors who want their work surfaced fairly, and discovered.",
      },
      {
        q: "Is Versuz affiliated with Anthropic ?",
        a: "No. We index skills from Anthropic's official repos and many others, but Versuz is an independent third-party project. The name and brand are unrelated to Anthropic.",
      },
      {
        q: "What's the business model ?",
        a: (
          <>
            Three tiers : free directory (the bulk), premium items at author-set prices (Versuz takes 30%), and Versuz-curated &quot;featured&quot; items (100% Versuz). Plus a flat &quot;Boost&quot; placement fee ($4.99 / 30 days, max 365 days). See{" "}
            <Link href="/pricing" className="vz-link">/pricing</Link> for details.
          </>
        ),
      },
    ],
  },
  {
    id: "ranking",
    label: "Ranking & bench",
    items: [
      {
        q: "How are skills ranked ?",
        a: (
          <>
            Each skill in a category runs through the same 30-task suite (a held-out evaluation set we maintain). An agent LLM executes each task using the skill. Then 3 judge LLMs (Claude Haiku 4.5, DeepSeek V4 Flash, GPT-5 mini, configurable) independently grade each output on 5 axes : instruction-following, correctness, completeness, usefulness, safety. Weighted composite gives the final score. Full methodology at{" "}
            <Link href="/methodology" className="vz-link">/methodology</Link>.
          </>
        ),
      },
      {
        q: "Why three judges ?",
        a: "Single-judge ranking is biased toward whatever model is judging. Three frontier models from different labs (Anthropic, DeepSeek, OpenAI) reduce the bias and let us measure disagreement explicitly. Disagreement is published — if judges disagree on a skill, we flag it.",
      },
      {
        q: "What if my skill is brand new and not yet judged ?",
        a: "It shows up immediately on /marketplace with a quality_score (from a cheap LLM cold-start rate over the same 5 axes). It enters the next bench cycle for its category. Bench cycles run daily on rotation.",
      },
      {
        q: "Are bench scores reliable ?",
        a: "They're indicative, not authoritative. LLM-as-judge is a noisy method. We mitigate with 3 judges, 5 tasks per item (N=5), anti-inflation rubric, and weighted composite. CI95 ~±6-7 points typically. We're also planning a human calibration set (200 hand-judged items) to learn an affine transform per judge.",
      },
      {
        q: "Can I see how a specific skill scored on each judge ?",
        a: "Yes. Click any ranked skill to see per-axis breakdown, per-judge averages, judge disagreement label (high / mid / low), and sample rationales. We publish disagreement rather than hide it.",
      },
    ],
  },
  {
    id: "submit",
    label: "Submitting & claiming",
    items: [
      {
        q: "How do I submit my SKILL.md or CLAUDE.md ?",
        a: (
          <>
            Three ways : via the web form on <Link href="/submit" className="vz-link">/submit</Link> (paste a GitHub URL), via the CLI{" "}
            <code>npx versuz submit https://github.com/your/repo</code>, or just publish it on GitHub and wait — we&apos;ll find it via our daily scrape.
          </>
        ),
      },
      {
        q: "Does Versuz scrape my repo without permission ?",
        a: "We only index publicly readable repos via the GitHub search API, under fair use for indexing and benchmarking. We respect robots.txt, preserve the original GitHub link, capture the SPDX license, and act on takedown requests within 7 days. To request removal, email contact@flukxstudio.fr or follow the DMCA process.",
      },
      {
        q: "How do I claim ownership of a scraped item ?",
        a: (
          <>
            Visit <Link href="/claim" className="vz-link">/claim</Link>, sign in with the GitHub account that owns the repo, and click &quot;Claim&quot;. We re-verify ownership against the GitHub API on each claim. Auto-claim happens on submit if you use the CLI.
          </>
        ),
      },
      {
        q: "What happens if someone claims my skill wrongly ?",
        a: "False ownership claims are grounds for account termination. The claim only succeeds if your GitHub account matches the repo owner or is a verified member of the org. If you see something wrong, email contact@flukxstudio.fr with proof and we'll fix it within 24h.",
      },
    ],
  },
  {
    id: "premium",
    label: "Premium & payments",
    items: [
      {
        q: "Do I have to pay anything to use Versuz ?",
        a: "No. The directory is free, the rankings are free, the CLI and MCP server are free. You only pay if you buy a premium item from another author — and even then, you can browse without buying.",
      },
      {
        q: "How does the 30/70 split work ?",
        a: "Authors of premium items receive 70% of every sale, deposited automatically to their Stripe Connect account. Versuz keeps 30% as platform fee, processed via Stripe destination charges (no manual payouts needed). Sellers see their earnings in real-time on /profile/earnings.",
      },
      {
        q: "Can I refund a premium purchase ?",
        a: (
          <>
            Yes — 30 days no-questions-asked. Email <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a> with your Stripe Payment Intent ID and we refund within 24h (Stripe processes the credit in 5-10 business days). See{" "}
            <Link href="/legal/refund" className="vz-link">Refund Policy</Link>.
          </>
        ),
      },
      {
        q: "What does &quot;Boost&quot; do exactly ?",
        a: "Boosting an item costs $4.99 / 30 days flat. It pins the item at the top of the marketplace (6 slots maximum visible) and adds a discreet amber ribbon. It does NOT change the ranking or bench score — it's pure discovery placement. Stackable up to 365 days max. Versuz takes 100% (no Connect split for boost, it's pure ad placement).",
      },
      {
        q: "How do I activate selling on Versuz ?",
        a: "Go to /profile/settings → \"Become a seller →\". This launches a Stripe Express onboarding (pre-filled France by default). Stripe takes a few minutes to verify ID/IBAN. Once charges_enabled, you can list premium items via the Submit form with a tier picker.",
      },
    ],
  },
  {
    id: "data",
    label: "Data & privacy",
    items: [
      {
        q: "What personal data does Versuz collect ?",
        a: (
          <>
            Minimal : GitHub username + email (via Supabase Auth OAuth), purchase records (Stripe Payment Intent IDs), and CLI submission audit logs (anti-spam). No third-party analytics, no marketing cookies, no tracking. Full details at{" "}
            <Link href="/legal/privacy" className="vz-link">/legal/privacy</Link>.
          </>
        ),
      },
      {
        q: "Where is my data hosted ?",
        a: "Database in Supabase (EU region, Frankfurt). Payment processing via Stripe (EU + US with EU data processing addendum). Hosting via Vercel (US-based, EU edge). All transfers covered by EU-US Data Privacy Framework + Standard Contractual Clauses.",
      },
      {
        q: "Can I export or delete my data ?",
        a: "Yes. Email contact@flukxstudio.fr for GDPR data export (JSON, within 30 days) or account deletion (within 30 days, except where retention is legally required like 10-year accounting for purchases).",
      },
      {
        q: "Does Versuz use the data of indexed skills to train models ?",
        a: "No. We use indexed SKILL.md and CLAUDE.md only for the public benchmark (running them through tasks) and for the marketplace surface. We do not train any model on user-submitted or scraped content.",
      },
    ],
  },
  {
    id: "tech",
    label: "Tech & integrations",
    items: [
      {
        q: "What stack does Versuz use ?",
        a: "Next.js 16 App Router on Vercel, PostgreSQL 17 via Supabase, Stripe Connect Express for payments, Resend for transactional emails, OpenRouter for the bench (Anthropic + DeepSeek + OpenAI). Code published as MIT on GitHub.",
      },
      {
        q: "Is there an API ?",
        a: (
          <>
            Yes, v1 JSON API at <code>/api/v1/skills</code> + <code>/api/v1/claude-md</code> + content/installation endpoints. Documented at <Link href="/about#api" className="vz-link">/about</Link>. The CLI and MCP server both consume this API.
          </>
        ),
      },
      {
        q: "How do I use the MCP server with Claude Code ?",
        a: (
          <>
            <code>claude mcp add versuz npx -y @versuz/mcp</code>. Claude Code can then search, list, get, and install skills inline. 5 tools exposed. See{" "}
            <Link href="/about#tools" className="vz-link">/about</Link>.
          </>
        ),
      },
      {
        q: "Can I run the bench locally on my own skills ?",
        a: "The bench code is in /scripts/bench/ on GitHub (MIT). You can clone, set BENCH_MODE=dev for free Groq judges, and run npm run bench against your own tasks + subjects. Bring your own LLM keys and Supabase project.",
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    items: [
      {
        q: "How do I reach you ?",
        a: (
          <>
            General : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>. Support / refunds : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>. Bugs : <a href="https://github.com/TomaTV/versuz/issues" target="_blank" rel="noreferrer" className="vz-link">GitHub issues ↗</a>.
          </>
        ),
      },
      {
        q: "Versuz is open source ?",
        a: (
          <>
            The code is MIT-licensed on{" "}
            <a href="https://github.com/TomaTV/versuz" target="_blank" rel="noreferrer" className="vz-link">github.com/TomaTV/versuz ↗</a>. You can self-host if you want your own private Versuz, though scaling the bench economics is hard solo.
          </>
        ),
      },
      {
        q: "Is there a Discord / Slack ?",
        a: "Not yet. We may open one if there's demand. Easiest is to email or open a GitHub issue for now.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Frequently <em style={{ color: "var(--accent)" }}>asked</em>.
          </>
        }
        subtitle="Everything we get asked, by category. If your question isn't here, email contact@flukxstudio.fr."
      />

      <section
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        <Reveal>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 56,
              paddingBottom: 24,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            {CATEGORIES.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  border: "1px solid var(--rule)",
                  color: "var(--fg-muted)",
                  textDecoration: "none",
                  background: "var(--surface)",
                }}
                className="vz-pill-btn"
              >
                {c.label}
              </a>
            ))}
          </nav>
        </Reveal>

        <RevealStagger stagger={0.06} style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          {CATEGORIES.map((cat) => (
            <RevealItem key={cat.id}>
              <section id={cat.id} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(24px, 3vw, 32px)",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "var(--fg)",
                  }}
                >
                  {cat.label}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {cat.items.map((item, idx) => (
                    <details
                      key={idx}
                      style={{
                        borderTop: "1px solid var(--rule)",
                        paddingTop: 16,
                      }}
                    >
                      <summary
                        className="vz-faq-summary"
                        style={{
                          cursor: "pointer",
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          color: "var(--fg)",
                          listStyle: "none",
                          display: "flex",
                          alignItems: "baseline",
                          gap: 14,
                        }}
                      >
                        <span
                          aria-hidden
                          className="vz-faq-toggle"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                            color: "var(--accent)",
                            flexShrink: 0,
                            display: "inline-block",
                            width: 14,
                            textAlign: "center",
                          }}
                        >
                          +
                        </span>
                        <span style={{ flex: 1 }}>{item.q}</span>
                      </summary>
                      <div
                        style={{
                          marginTop: 14,
                          fontSize: 15,
                          lineHeight: 1.7,
                          color: "var(--fg-muted)",
                          maxWidth: 720,
                        }}
                      >
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <div
            style={{
              marginTop: 80,
              padding: 32,
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Still stuck ?
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.4,
                color: "var(--fg)",
              }}
            >
              Email <a href="mailto:contact@flukxstudio.fr" className="vz-link" style={{ color: "var(--accent)" }}>contact@flukxstudio.fr</a>{" "}
              and we&apos;ll get back within 48h.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
