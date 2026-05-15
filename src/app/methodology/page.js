import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { judgesLabel } from "@/lib/judges";

export const metadata = {
  title: "How it works — Versuz",
  description:
    "How Versuz benchmarks AI agent skills. 30 held-out tasks, 3 frontier judges, Bayesian Elo, updated every 24 hours.",
};

export const dynamic = "force-dynamic"; // voir /about/page.js

const STEPS = [
  {
    n: "01",
    label: "Submit",
    color: "var(--azure)",
    title: "A skill enters the registry.",
    body: [
      "Skills are scraped from public GitHub repos that follow the SKILL.md format. We index source, prompt, and tools — closed skills are eligible for a separate ranked tier we will open later.",
      "The first cycle a skill participates in starts at the next 24h tick. Cold-start Elo of 1400.",
    ],
  },
  {
    n: "02",
    label: "30 Tasks",
    color: "var(--accent)",
    title: "Thirty tasks, fresh each cycle.",
    body: [
      "Each cycle we draw a 30-task split from a held-out suite. The suite is hand-crafted, deterministic where possible (expected outputs), rubric-graded where not.",
      "Skills run every task. There is no cherry-picking.",
    ],
  },
  {
    n: "03",
    label: "3 Judges",
    color: "var(--amber)",
    title: "Three frontier models, independently.",
    body: [
      `Outputs are evaluated by ${judgesLabel()}. Each judge gets the same structured rubric and scores every task on a 0–1 scale with a written rationale.`,
      "Judges never see each other's scores. Inter-judge disagreement is published verbatim — we don't paper over it.",
    ],
  },
  {
    n: "04",
    label: "Score",
    color: "var(--crimson)",
    title: "Weighted aggregation.",
    body: [
      "Per-task scores are aggregated with a weighted average across the three judges. Default weights are 0.34 / 0.33 / 0.33 and may be re-tuned at the start of each season.",
      "Failures and timeouts count as zero. Partial passes are graded.",
    ],
  },
  {
    n: "05",
    label: "Rank",
    color: "var(--sage)",
    title: "Bayesian Elo over pairwise outcomes.",
    body: [
      "We convert per-task aggregate scores into pairwise outcomes (skill A beat skill B on task T iff agg(A,T) > agg(B,T)) and update an Elo rating with a Bayesian prior of 1400.",
      "K-factor tapers from 32 to 8 as battle count grows. Once a skill has played 100+ battles, its rating is considered stable.",
    ],
  },
];

export default function MethodologyPage() {
  return (
    <div>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            How a skill <em style={{ color: "var(--accent)" }}>earns its rank</em>.
          </>
        }
        subtitle="Five steps. Deterministic where possible. Transparent at every stage. Each step is detailed below."
        decoration={<MethodHeroShapes />}
      />

      {STEPS.map((step) => (
        <Section key={step.n} eyebrow={`§ ${step.n} — ${step.label}`} markerColor={step.color}>
          <SectionHeader
            title={step.title}
            titleSize="clamp(36px, 4.5vw, 72px)"
          />
          <div
            style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 760,
            }}
          >
            {step.body.map((p, i) => (
              <Reveal key={i} delay={0.2 + i * 0.05}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    lineHeight: 1.55,
                    letterSpacing: "-0.01em",
                    color: "var(--fg-muted)",
                  }}
                >
                  {p}
                </p>
              </Reveal>
            ))}
          </div>
        </Section>
      ))}

      <Section eyebrow="§ 06 — In short" markerColor="var(--accent)">
        <SectionHeader
          title={
            <>
              Five steps, <em style={{ color: "var(--accent)" }}>one ranking</em>.
            </>
          }
        />
        <RevealStagger
          stagger={0.06}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 0,
            marginTop: 56,
            borderTop: "1px solid var(--rule-strong)",
          }}
          className="vz-method-flow"
        >
          {STEPS.map((step, i, arr) => (
            <RevealItem
              key={step.n}
              style={{
                padding: "32px 24px 32px 0",
                paddingLeft: i === 0 ? 0 : 24,
                borderRight: i < arr.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden style={{ width: 12, height: 12, background: step.color }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                  }}
                >
                  {step.n}
                </span>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  color: "var(--fg)",
                  fontStyle: i === 4 ? "italic" : "normal",
                }}
              >
                {step.label}
              </h3>
            </RevealItem>
          ))}
        </RevealStagger>
      </Section>
    </div>
  );
}

function MethodHeroShapes() {
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
          background: "var(--amber)",
        }}
      />
      <span
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -60,
          top: 140,
          width: 120,
          height: 120,
          background: "var(--bg)",
        }}
      />
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
