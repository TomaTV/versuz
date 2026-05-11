export default function Loading() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "80px 64px 120px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Loading standings…
      </div>
      <div style={{ marginTop: 64, display: "flex", flexDirection: "column", gap: 0 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 80,
              borderTop: "1px solid var(--rule)",
              background: i % 2 === 0 ? "var(--surface-hover)" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
