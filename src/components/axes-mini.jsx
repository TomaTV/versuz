/**
 * Compact 5-axis breakdown — mini vertical bars + numeric scores.
 * Used in SkillRow on the leaderboard to expose the *why* behind the avg score.
 * Axes: correctness / format / completeness / usefulness / depth (each 0-100).
 */

const AXES = [
  { key: "correctness", label: "Co", full: "Correctness" },
  { key: "format", label: "Fo", full: "Format" },
  { key: "completeness", label: "Cp", full: "Completeness" },
  { key: "usefulness", label: "Us", full: "Usefulness" },
  { key: "depth", label: "De", full: "Depth" },
];

export function AxesMini({ axes }) {
  if (!axes) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        no axes
      </span>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 4,
        width: "100%",
        maxWidth: 140,
      }}
      title={AXES.map((a) => `${a.full}: ${axes[a.key] != null ? axes[a.key].toFixed(1) : "—"}`).join("\n")}
    >
      {AXES.map((a) => {
        const v = axes[a.key];
        const pct = v != null ? Math.max(0, Math.min(100, v)) : 0;
        const color =
          v == null
            ? "var(--rule)"
            : v >= 75
              ? "var(--accent)"
              : v >= 50
                ? "var(--amber)"
                : "var(--crimson)";
        return (
          <div
            key={a.key}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            <div
              style={{
                width: "100%",
                height: 22,
                background: "var(--surface)",
                border: "1px solid var(--rule)",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: "100%",
                  height: `${pct}%`,
                  background: color,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {a.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: v != null ? "var(--fg)" : "var(--fg-muted)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {v != null ? Math.round(v) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
