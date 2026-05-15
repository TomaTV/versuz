import Link from "next/link";
import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "About — Versuz",
  description:
    "Versuz is a public adversarial leaderboard for AI agent skills. Built in public by FlukX Studio.",
};

// Force-dynamic defensive : la page ne fetch rien elle-même mais le layout
// global wrap VzTicker (async Server Component qui appelle Supabase). Si
// Supabase est down au build, le pré-render timeoutait à 60s × 3 retries.
// Cette directive skip le pré-render pour cette page.
export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About"
        title={
          <>
            Built <em style={{ color: "var(--accent)" }}>in public</em>.
          </>
        }
        subtitle="Versuz is an open, adversarial benchmark for AI agent skills. We rank by performance, not popularity. Everything we publish — methodology, code, and judge rationales — is readable."
        decoration={<AboutHeroShapes />}
      />

      <Section eyebrow="§ 01 — Why" markerColor="var(--crimson)">
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>4,200 skills</em> claim to do task X.
              Which one works?
            </>
          }
          subtitle="By 2026, the SKILL.md ecosystem had exploded — 4,200 public skills on claudemarketplaces.com, 1.2M on skillsmp.com, plus Anthropic's own enterprise marketplace. None of them answered the only question a developer adopting Claude Code actually asks."
        />
        <Reveal delay={0.25}>
          <p
            style={{
              margin: "40px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontStyle: "italic",
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
              color: "var(--accent)",
              maxWidth: 760,
            }}
          >
            “Of the 47 skills that claim to do task X, which one actually works?”
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <p
            style={{
              margin: "32px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.55,
              letterSpacing: "-0.01em",
              color: "var(--fg-muted)",
              maxWidth: 720,
            }}
          >
            Existing directories rank by stars and installs — popularity, not quality. Versuz
            runs every skill against the same task suite, has three frontier judges grade the
            outputs, and publishes a ranking based on actual performance.
          </p>
        </Reveal>
      </Section>

      <Section eyebrow="§ 02 — Tools" markerColor="var(--azure)" id="tools">
        <SectionHeader
          title={
            <>
              Versuz <em style={{ color: "var(--accent)" }}>in your terminal</em>.
            </>
          }
          subtitle="Two surfaces beyond the web app : a CLI for direct installs, and an MCP server so Claude Code itself can browse the registry inline. Both in public beta."
        />
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              padding: "32px 28px",
              borderRight: "1px solid var(--rule)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "3px 7px",
                  color: "var(--bone)",
                  background: "var(--ink)",
                }}
              >
                CLI
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  color: "var(--azure)",
                  border: "1px solid var(--azure)",
                  background: "color-mix(in oklab, var(--azure) 8%, transparent)",
                  fontWeight: 600,
                }}
              >
                Beta
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                color: "var(--fg)",
                fontWeight: 500,
              }}
            >
              npx versuz
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              Interactive prompt-driven CLI. Search, browse, inspect, install. Free items
              download directly to <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>.claude/skills/&lt;slug&gt;/SKILL.md</code> ou <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>./CLAUDE.md</code>.
              Premium items return a buy URL — purchase first, then install.
            </p>
            <pre
              style={{
                margin: "8px 0 0",
                padding: "14px 16px",
                background: "var(--ink)",
                color: "var(--bone)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.7,
                overflow: "auto",
              }}
            >
              {`npx versuz                  # interactive
npx versuz search pdf
npx versuz info <slug>
npx versuz install <slug>`}
            </pre>
            <a
              href="https://github.com/TomaTV/versuz/tree/main/cli"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
              style={{ marginTop: 8 }}
            >
              Source on GitHub ↗
            </a>
          </div>
          <div
            style={{
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "3px 7px",
                  color: "var(--bone)",
                  background: "var(--accent)",
                }}
              >
                MCP
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  color: "var(--azure)",
                  border: "1px solid var(--azure)",
                  background: "color-mix(in oklab, var(--azure) 8%, transparent)",
                  fontWeight: 600,
                }}
              >
                Beta
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                color: "var(--fg)",
                fontWeight: 500,
              }}
            >
              @versuz/mcp
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              An MCP server that hooks Versuz into Claude Code as native tools. Ask Claude
              <em> "find me a SQL migration skill and install it" </em>— it searches, inspects,
              downloads, all inline. 5 tools : search, list_skills, list_claude_md, get, install.
            </p>
            <pre
              style={{
                margin: "8px 0 0",
                padding: "14px 16px",
                background: "var(--ink)",
                color: "var(--bone)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.7,
                overflow: "auto",
              }}
            >
              {`claude mcp add versuz npx -y @versuz/mcp

# .mcp.json
{
  "mcpServers": {
    "versuz": { "command": "npx", "args": ["-y", "@versuz/mcp"] }
  }
}`}
            </pre>
            <a
              href="https://github.com/TomaTV/versuz/tree/main/mcp-server"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
              style={{ marginTop: 8 }}
            >
              Source on GitHub ↗
            </a>
          </div>
        </div>
      </Section>

      <Section eyebrow="§ 03 — Roadmap" markerColor="var(--amber)">
        <SectionHeader
          title={
            <>
              What&apos;s <em style={{ color: "var(--accent)" }}>next</em>.
            </>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
            marginTop: 56,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
          className="vz-pillars"
        >
          {[
            {
              tag: "v0 · now",
              color: "var(--accent)",
              title: "Document benchmark.",
              body: "PDF/document extraction skills, 30 tasks, 3 judges, daily Bayesian Elo. Read-only public leaderboard.",
            },
            {
              tag: "v1 · q1 2027",
              color: "var(--amber)",
              title: "Multi-vertical + monetisation.",
              body: "More categories (SQL, data, web scraping). Authors can monetise — 70% revenue share when companies install via Versuz.",
            },
            {
              tag: "v2 · later",
              color: "var(--azure)",
              title: "Real-time battles.",
              body: "User-submitted match-ups, live judging, voting. Chatbot-Arena-style for agent skills.",
            },
          ].map((p, i) => (
            <div
              key={p.tag}
              style={{
                padding: "32px 24px 40px",
                borderRight: i < 2 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden style={{ width: 10, height: 10, background: p.color }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {p.tag}
                </span>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  color: "var(--fg)",
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--fg-muted)",
                  maxWidth: 320,
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="§ 04 — Get in touch" markerColor="var(--sage)">
        <SectionHeader
          title={
            <>
              Open <em style={{ color: "var(--accent)" }}>source</em>, open process.
            </>
          }
        />
        <Reveal delay={0.2}>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://github.com/TomaTV/versuz"
              target="_blank"
              rel="noreferrer"
              className="vz-link"
            >
              github.com/versuzdev/versuz <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
            </a>
            <Link href="/methodology" className="vz-link">
              Read the full methodology <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
            </Link>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}

function AboutHeroShapes() {
  return (
    <div
      aria-hidden
      className="vz-hero-decoration"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <span
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -160,
          top: 60,
          width: 280,
          height: 280,
          background: "var(--azure)",
        }}
      />
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{
          position: "absolute",
          right: 200,
          top: 100,
          transform: "rotate(-6deg)",
        }}
      >
        <path d="M 40 6 L 74 74 L 6 74 Z" fill="var(--amber)" />
      </svg>
      <span
        style={{
          position: "absolute",
          left: 32,
          top: 160,
          width: 4,
          height: 140,
          background: "var(--accent)",
        }}
      />
    </div>
  );
}
