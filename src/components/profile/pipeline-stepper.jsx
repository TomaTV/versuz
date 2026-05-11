/**
 * Visual progress stepper showing where a submitted skill/CLAUDE.md is in
 * the auto-queue pipeline. 4 stages : Submitted → Quality → Queued → Benched.
 * Each dot is filled if current step >= it, with the active dot getting a
 * larger ring + the stage's accent color.
 */
const STEPS = [
  { id: 1, label: "Submitted" },
  { id: 2, label: "Quality" },
  { id: 3, label: "Queued" },
  { id: 4, label: "Benched" },
];

export function PipelineStepper({ stage }) {
  const current = stage?.step ?? 1;
  const accent = stage?.color || "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Stepper row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          alignItems: "center",
          gap: 4,
        }}
      >
        {STEPS.map((s, i) => {
          const isPast = current > s.id;
          const isCurrent = current === s.id;
          const isFuture = current < s.id;
          const dotColor = isPast || isCurrent ? accent : "var(--rule-strong)";
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                position: "relative",
              }}
            >
              {/* Connecting line (left side, from previous dot) */}
              {i > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: -4,
                    right: "calc(100% - 14px)",
                    top: "50%",
                    height: 2,
                    background: isPast || isCurrent ? accent : "var(--rule)",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
              {/* Dot */}
              <span
                aria-hidden
                style={{
                  width: isCurrent ? 14 : 10,
                  height: isCurrent ? 14 : 10,
                  borderRadius: "50%",
                  background: dotColor,
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: isCurrent
                    ? `0 0 0 4px color-mix(in oklab, ${accent} 28%, transparent)`
                    : "none",
                  animation: isCurrent ? "pulse 1.6s ease-in-out infinite" : "none",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: isFuture ? "var(--fg-muted)" : "var(--fg)",
                  fontWeight: isCurrent ? 600 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stage detail line */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.02em",
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: accent, fontWeight: 500 }}>{stage?.label || "Submitted"}</span>
        {stage?.hint && <span style={{ marginLeft: 8 }}>· {stage.hint}</span>}
      </div>
    </div>
  );
}
