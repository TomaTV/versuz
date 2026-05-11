import { displayJudgeModel, JUDGES } from "@/lib/judges";

/**
 * Panel "Meet the Judges" — LMArena-style stats panel pour la leaderboard.
 * Montre chaque juge avec ses stats lifetime : total scores, avg, coût,
 * calibration delta (vs global avg → spot which judge runs strict/loose).
 */
export function JudgePanel({ stats }) {
  if (!stats || stats.length === 0) {
    return (
      <div
        style={{
          padding: "32px 24px",
          border: "1px solid var(--rule)",
          background: "var(--surface)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
        }}
      >
        Bench engine warming up — judge stats appear after the first cycle completes.
      </div>
    );
  }

  // Trouve la metadata UI du judge (color, label) depuis judges.js
  const lookupMeta = (modelId) => {
    for (const j of JUDGES) {
      if (j.modelId === modelId) return j;
    }
    return null;
  };

  const totalCost = stats.reduce((s, j) => s + (j.cost || 0), 0);
  const totalScores = stats.reduce((s, j) => s + (j.count || 0), 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          Meet the <em style={{ color: "var(--accent)" }}>judges</em>.
        </h3>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {totalScores.toLocaleString("en-US")} scores · ${totalCost.toFixed(3)} spent lifetime
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
          gap: 0,
          border: "1px solid var(--rule-strong)",
        }}
        className="vz-judge-status-grid"
      >
        {stats.map((j, i) => {
          const meta = lookupMeta(j.model);
          const color = meta?.color || "var(--fg-muted)";
          const driftLabel =
            Math.abs(j.calibrationDelta) < 3
              ? "calibrated"
              : j.calibrationDelta > 0
                ? "generous"
                : "strict";
          const driftColor =
            Math.abs(j.calibrationDelta) < 3
              ? "var(--sage)"
              : j.calibrationDelta > 0
                ? "var(--amber)"
                : "var(--crimson)";
          return (
            <div
              key={j.model}
              style={{
                padding: "28px 24px",
                borderRight: i < stats.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  aria-hidden
                  style={{ width: 10, height: 10, background: color, flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg)",
                    letterSpacing: "0.06em",
                    fontWeight: 500,
                  }}
                >
                  {displayJudgeModel(j.model)}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 44,
                    fontWeight: 400,
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                    color: "var(--fg)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {j.avg.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  / 100 avg
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: driftColor,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                <span aria-hidden style={{ width: 6, height: 6, background: driftColor }} />
                {driftLabel}
                <span style={{ color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "none" }}>
                  ({j.calibrationDelta > 0 ? "+" : ""}{j.calibrationDelta.toFixed(1)} vs others)
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--rule)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
                    Scores
                  </div>
                  <div style={{ color: "var(--fg)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                    {j.count.toLocaleString("en-US")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
                    Cost
                  </div>
                  <div style={{ color: "var(--fg)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                    ${j.cost.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 14,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        <strong style={{ color: "var(--fg)", fontWeight: 500 }}>Calibration drift</strong> is
        normal — each LLM has its own scoring intuition. A judge marked{" "}
        <em style={{ color: "var(--crimson)", fontStyle: "italic" }}>strict</em> rates
        outputs ~5-15 pts below the others ; <em style={{ color: "var(--amber)", fontStyle: "italic" }}>generous</em>{" "}
        is the opposite. We aggregate the 3 verdicts to smooth out individual bias.
      </p>
    </div>
  );
}
