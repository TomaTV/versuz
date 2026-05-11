export function RankBadge({ rank, size = "md" }) {
  const isTop = rank <= 3;
  const sizes = {
    sm: { num: 14 },
    md: { num: 18 },
    lg: { num: 24 },
  }[size];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        fontFamily: "var(--font-mono)",
        color: isTop ? "var(--accent)" : "var(--fg)",
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
        }}
      >
        NO.
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: sizes.num,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          fontStyle: isTop ? "italic" : "normal",
        }}
      >
        {String(rank).padStart(2, "0")}
      </span>
    </span>
  );
}
