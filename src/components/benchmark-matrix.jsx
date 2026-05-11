import Link from "next/link";
import { HairBar } from "@/components/hair-bar";

export function BenchmarkMatrix({ skills, suites }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `200px repeat(${suites.length}, minmax(120px, 1fr))`,
          gap: 0,
          minWidth: 720,
        }}
      >
        <div
          style={{
            padding: "12px 0",
            borderBottom: "1px solid var(--rule-strong)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Skill
        </div>
        {suites.map((s) => (
          <div
            key={s.id}
            style={{
              padding: "12px 12px",
              borderBottom: "1px solid var(--rule-strong)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {s.label}
          </div>
        ))}
        {skills.map((skill, rowIdx) => (
          <Row key={skill.slug} skill={skill} suites={suites} leader={rowIdx === 0} />
        ))}
      </div>
    </div>
  );
}

function Row({ skill, suites, leader }) {
  const cellStyle = {
    padding: "20px 12px",
    borderBottom: "1px solid var(--rule)",
    background: leader ? "var(--leader-tint)" : "transparent",
  };
  return (
    <>
      <div style={{ ...cellStyle, display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {String(skill.rank).padStart(2, "0")}
        </span>
        <Link
          href={`/skills/${skill.slug}`}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--fg)",
            fontStyle: skill.rank === 1 ? "italic" : "normal",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          {skill.name}
        </Link>
      </div>
      {skill.scores.map((sc) => {
        const col = sc.score >= 0.8 ? "var(--accent)" : sc.score >= 0.6 ? "var(--fg)" : "var(--fg-muted)";
        return (
          <div
            key={sc.task}
            style={{
              ...cellStyle,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <HairBar value={sc.score} color={col} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: col,
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
              }}
            >
              {sc.score.toFixed(2)}
            </span>
          </div>
        );
      })}
    </>
  );
}
