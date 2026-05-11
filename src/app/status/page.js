import { PageHero, Section } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { JUDGES, JUDGE_MODE } from "@/lib/judges";
import { getCurrentCycle } from "@/lib/queries/rankings";

export const metadata = {
  title: "Status — Versuz",
  description: "Live system status — bench cycle health, judge availability, scraping pipeline, registry size.",
};

export const dynamic = "force-dynamic"; // always re-render with fresh data

const PROVIDER_KEY_VARS = {
  google: "GOOGLE_AI_STUDIO_KEY",
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

function probe(name) {
  return Boolean(process.env[name]);
}

export default async function StatusPage() {
  // Cycle is null when Supabase is wired but no cycle has been queued yet
  // (pre-bench state). Provide a safe display fallback so the page still
  // renders instead of crashing on `cycle.id`.
  const liveCycle = await getCurrentCycle();
  const cycle = liveCycle || {
    id: "—",
    nextTick: "no cycle queued yet",
    lastCycleAt: null,
    recent: [],
  };
  const supabaseUp = probe("NEXT_PUBLIC_SUPABASE_URL") && probe("SUPABASE_SERVICE_ROLE_KEY");
  const githubUp = probe("GITHUB_TOKEN");

  const judgeStatus = JUDGES.map((j) => ({
    ...j,
    keyVar: PROVIDER_KEY_VARS[j.provider],
    keyPresent: probe(PROVIDER_KEY_VARS[j.provider]),
  }));

  const allGreen =
    supabaseUp && githubUp && judgeStatus.every((j) => j.keyPresent);

  return (
    <div>
      <PageHero
        compact
        eyebrow="Status"
        title={
          allGreen ? (
            <>
              Everything <em style={{ color: "var(--sage)" }}>operational</em>.
            </>
          ) : (
            <>
              Some checks <em style={{ color: "var(--accent)" }}>need attention</em>.
            </>
          )
        }
        subtitle={`Bench mode: ${JUDGE_MODE}. Live cycle: #${cycle.id}. Next tick: ${cycle.nextTick}.`}
        decoration={<StatusHeroShapes ok={allGreen} />}
      />

      <Section eyebrow="§ 01 — Infrastructure" markerColor="var(--azure)" paddingY={80}>
        <RevealStagger
          stagger={0.08}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
            marginTop: 24,
          }}
        >
          <RevealItem>
            <StatusCell
              label="Web app"
              ok
              detail="versuz.dev — Next.js 16 on Vercel"
            />
          </RevealItem>
          <RevealItem>
            <StatusCell
              label="Supabase"
              ok={supabaseUp}
              detail={supabaseUp ? "DB + Auth configured" : "env vars missing — see .env.local.example"}
            />
          </RevealItem>
          <RevealItem>
            <StatusCell
              label="GitHub scraping"
              ok={githubUp}
              detail={githubUp ? "PAT configured" : "GITHUB_TOKEN missing"}
            />
          </RevealItem>
          <RevealItem>
            <StatusCell
              label="Bench mode"
              ok
              detail={`${JUDGE_MODE} · ${JUDGES.length} active judges`}
              accent="var(--accent)"
            />
          </RevealItem>
        </RevealStagger>
      </Section>

      <Section eyebrow="§ 02 — Judges" markerColor="var(--accent)">
        <RevealStagger
          stagger={0.08}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${JUDGES.length}, 1fr)`,
            gap: 0,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
            marginTop: 24,
          }}
          className="vz-judge-status-grid"
        >
          {judgeStatus.map((j) => (
            <RevealItem
              key={j.id}
              style={{
                padding: "32px 24px",
                borderRight: "1px solid var(--rule)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden style={{ width: 10, height: 10, background: j.color }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {j.provider}
                </span>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                  lineHeight: 1.05,
                }}
              >
                {j.label}
              </h3>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: j.keyPresent ? "var(--sage)" : "var(--danger)",
                  letterSpacing: "0.04em",
                }}
              >
                {j.keyPresent ? "● key present" : `○ ${j.keyVar} missing`}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                weight {j.weight.toFixed(2)} · {j.free ? "free tier" : "paid"}
              </span>
            </RevealItem>
          ))}
        </RevealStagger>
      </Section>

      <Section eyebrow="§ 03 — Latest cycle" markerColor="var(--sage)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
            marginTop: 24,
          }}
        >
          <StatusCell label="Cycle" ok detail={`#${cycle.id}`} accent="var(--accent)" />
          <StatusCell label="Next tick" ok detail={cycle.nextTick} />
          <StatusCell label="Last completed" ok detail={cycle.lastCycleAt || "—"} />
          <StatusCell label="Recent results" ok detail={`${cycle.recent?.length || 0} battles`} />
        </div>

        {cycle.recent && cycle.recent.length > 0 && (
          <Reveal delay={0.15}>
            <ul
              style={{
                margin: "32px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              {cycle.recent.map((r, i) => (
                <li key={i}>↗ {r}</li>
              ))}
            </ul>
          </Reveal>
        )}
      </Section>
    </div>
  );
}

function StatusCell({ label, ok, detail, accent }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        borderRight: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 32,
          right: 24,
          width: 10,
          height: 10,
          background: ok ? accent || "var(--sage)" : "var(--danger)",
        }}
      />
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
          fontSize: 26,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          color: "var(--fg)",
          lineHeight: 1.1,
        }}
      >
        {ok ? "Operational" : "Down"}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {detail}
      </span>
    </div>
  );
}

function StatusHeroShapes({ ok }) {
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
          background: ok ? "var(--sage)" : "var(--accent)",
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
