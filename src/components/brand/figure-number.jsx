export function FigureNumber({ n, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        § {n}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
