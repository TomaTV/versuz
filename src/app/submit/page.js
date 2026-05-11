import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Submit — Versuz",
  description: "Submit a skill or a CLAUDE.md to the Versuz registry. Free public submissions are verified and badged. Authors can also list premium items with a 70/30 revenue share.",
};

export default function SubmitIndexPage() {
  return (
    <div>
      <PageHero
        eyebrow="Submit"
        title={
          <>
            What are you <em style={{ color: "var(--accent)" }}>bringing</em>?
          </>
        }
        subtitle="Two paths into the registry. Free public submissions are verified and badged automatically. Premium items earn revenue share for the author (70%) — Versuz takes 30% for hosting, judging, and curation."
        decoration={<SubmitHeroShapes />}
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        <Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 0,
              borderTop: "1px solid var(--rule-strong)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <SubmitCard
              tag="01 · skill"
              title="Submit a SKILL.md"
              body="A SKILL.md is the agent prompt + tooling spec used by Claude Code, Codex CLI, Cursor, etc. Versuz indexes it, classifies its category, and runs it through the bench engine."
              href="/submit/skill"
              accent="var(--accent)"
            />
            <SubmitCard
              tag="02 · claude.md"
              title="Submit a CLAUDE.md"
              body="A CLAUDE.md gives Claude Code project context (stack, conventions, things to avoid). Ranked by how much it actually improves agent quality on real coding tasks for that project type."
              href="/submit/claude-md"
              accent="var(--azure)"
            />
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p
            style={{
              marginTop: 32,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              maxWidth: 720,
            }}
          >
            All public submissions are scoped to one license (we accept MIT / Apache-2.0 /
            BSD). Premium submissions can use any license — they include explicit terms in the
            buyer&apos;s purchase confirmation.
          </p>
        </Reveal>
      </section>
    </div>
  );
}

function SubmitCard({ tag, title, body, href, accent }) {
  return (
    <Link
      href={href}
      className="vz-cat-card"
      style={{
        display: "block",
        padding: "40px 32px",
        borderRight: "1px solid var(--rule)",
        textDecoration: "none",
        color: "var(--fg)",
        transition: "background 0.2s ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden style={{ width: 12, height: 12, background: accent }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {tag}
          </span>
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: "var(--fg)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--fg-muted)",
            maxWidth: 460,
          }}
        >
          {body}
        </p>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            letterSpacing: "0.04em",
          }}
        >
          Continue ↗
        </span>
      </div>
    </Link>
  );
}

function SubmitHeroShapes() {
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
          right: -120,
          top: 80,
          width: 240,
          height: 240,
          background: "var(--sage)",
        }}
      />
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{ position: "absolute", right: 240, top: 100, transform: "rotate(-6deg)" }}
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
