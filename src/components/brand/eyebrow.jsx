export function Eyebrow({ children, color = "var(--accent)" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      <span style={{ width: 24, height: 1, background: color, opacity: 0.5 }} />
      {children}
    </span>
  );
}
