import Link from "next/link";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";

const AXIS_KEYS = ["instruction_following", "correctness", "completeness", "usefulness", "safety"];
const AXIS_LABEL = {
  instruction_following: "Instruction",
  correctness: "Correctness",
  completeness: "Completeness",
  usefulness: "Usefulness",
  safety: "Safety",
};

// Subdued — only highlight strong outliers, keep the rest neutral.
function axisColor(v) {
  if (v == null) return "var(--fg-muted)";
  if (v >= 80) return "var(--accent)";
  if (v <= 35) return "var(--crimson)";
  return "var(--fg)";
}

const GRID_COLS = "48px minmax(0, 1.4fr) repeat(5, minmax(80px, 1fr)) 100px";

export function SkillRowHeader({ sort = "score", onSort }) {
  const SortHeader = ({ field, label, align = "center" }) => {
    const active = sort === field;
    return (
      <button
        type="button"
        onClick={onSort ? () => onSort(field) : undefined}
        style={{
          textAlign: align,
          color: active ? "var(--fg)" : "var(--fg-muted)",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: onSort ? "pointer" : "default",
          fontWeight: active ? 600 : 400,
          fontFamily: "inherit",
          fontSize: "inherit",
          letterSpacing: "inherit",
          textTransform: "inherit",
          width: "100%",
        }}
      >
        {label}
        {active ? " ↓" : ""}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderBottom: "1px solid var(--rule-strong)",
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>#</span>
      <SortHeader field="name" label="Model" align="left" />
      {AXIS_KEYS.map((k) => (
        <SortHeader key={k} field={k} label={AXIS_LABEL[k]} />
      ))}
      <SortHeader field="score" label="Score" align="right" />
    </div>
  );
}

export function SkillRow({ skill, leader = false }) {
  const score = skill.avg_score ?? skill.score ?? skill.elo;
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="vz-skill-row"
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        alignItems: "center",
        gap: 12,
        padding: "18px 20px",
        width: "100%",
        textDecoration: "none",
        color: "inherit",
        borderBottom: "1px solid var(--rule)",
        background: leader ? "var(--leader-tint)" : "transparent",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ color: "var(--fg-muted)", fontSize: 13 }}>{skill.rank}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 19,
              color: "var(--fg)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {skill.name}
          </span>
          <TierBadge tier={skill.tier} priceUsd={skill.priceUsd} size="sm" />
          <VerificationBadge level={skill.verificationLevel} />
          {skill.signal === "bench" ? (
            <span
              title="Bench-judged · 3 LLM judges on the held-out task suite"
              style={{
                padding: "2px 7px",
                fontSize: 9,
                color: "var(--bg)",
                background: "var(--accent)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
              }}
            >
              BENCH
            </span>
          ) : (
            <span
              title="Quality-rated only · single LLM judge on the file content (no held-out task suite yet)"
              style={{
                padding: "2px 7px",
                fontSize: 9,
                color: "var(--azure)",
                background: "transparent",
                border: "1px solid var(--azure)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
              }}
            >
              QUALITY
            </span>
          )}
          {skill.isBoosted && (
            <span
              style={{
                padding: "2px 6px",
                fontSize: 9,
                color: "var(--bg)",
                background: "var(--amber)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              ★
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.02em" }}>
          {skill.author} · {skill.category}
        </span>
      </div>
      {AXIS_KEYS.map((k) => {
        const v = skill.axes?.[k];
        return (
          <span key={k} style={{ textAlign: "center", color: axisColor(v) }}>
            {v != null ? Math.round(v) : "—"}
          </span>
        );
      })}
      <span
        style={{
          textAlign: "right",
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 400,
          color: skill.signal === "bench" ? "var(--fg)" : "var(--fg-muted)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
        title={
          skill.signal === "bench"
            ? "Weighted composite of 5 axes (0-100) — held-out task suite"
            : "Quality cold-start (0-100) — file content rated by 1 LLM judge"
        }
      >
        {score != null ? Number(score).toFixed(1) : "—"}
        {score != null && (
          <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 2, fontFamily: "var(--font-mono)" }}>
            /100
          </span>
        )}
      </span>
    </Link>
  );
}
