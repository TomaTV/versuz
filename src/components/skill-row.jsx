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

function SortHeader({ field, label, align = "center", sort, onSort }) {
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
}

export function SkillRowHeader({ sort = "score", onSort }) {
  return (
    <div
      className="vz-skill-row-header"
      style={{
        borderBottom: "1px solid var(--rule-strong)",
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      <div className="vz-skill-row-inner" style={{ padding: "14px 20px" }}>
        <span style={{ color: "var(--fg-muted)" }}>#</span>
        <SortHeader field="name" label="Model" align="left" sort={sort} onSort={onSort} />
        {AXIS_KEYS.map((k) => (
          <SortHeader key={k} field={k} label={AXIS_LABEL[k]} sort={sort} onSort={onSort} />
        ))}
        <SortHeader field="score" label="Score" align="right" sort={sort} onSort={onSort} />
      </div>
    </div>
  );
}

export function SkillRow({ skill, leader = false }) {
  const score = skill.avg_score ?? skill.score ?? skill.elo;
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className={`vz-skill-row${leader ? " vz-skill-row-leader" : ""}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        borderBottom: "1px solid var(--rule)",
        background: leader ? "var(--leader-tint)" : "transparent",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontVariantNumeric: "tabular-nums",
        display: "block",
      }}
    >
      {/* Desktop : grid · Mobile : flex column (via CSS @media) */}
      <div className="vz-skill-row-inner">
        <span className="vz-skill-rank">{skill.rank}</span>
        <div className="vz-skill-meta">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 19,
                color: "var(--fg)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
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
          <span style={{ fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.02em", marginTop: 3 }}>
            {skill.author} · {skill.category}
          </span>
        </div>
        {AXIS_KEYS.map((k) => {
          const v = skill.axes?.[k];
          return (
            <span
              key={k}
              className="vz-skill-axis"
              data-label={AXIS_LABEL[k]}
              style={{ textAlign: "center", color: axisColor(v) }}
            >
              {v != null ? Math.round(v) : "—"}
            </span>
          );
        })}
        <span
          className="vz-skill-score"
          title={
            skill.signal === "bench"
              ? "Weighted composite of 5 axes (0-100) — held-out task suite"
              : "Quality cold-start (0-100) — file content rated by 1 LLM judge"
          }
          style={{
            textAlign: "right",
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 400,
            color: skill.signal === "bench" ? "var(--fg)" : "var(--fg-muted)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {score != null ? Number(score).toFixed(1) : "—"}
          {score != null && (
            <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 2, fontFamily: "var(--font-mono)" }}>
              /100
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
