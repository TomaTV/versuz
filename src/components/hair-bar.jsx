export function HairBar({ value, max = 1, color = "var(--accent)", height = 2 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        position: "relative",
        height: height + 6,
        width: "100%",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height,
          background: "var(--rule)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: color,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 1px)`,
            top: -3,
            width: 2,
            height: height + 6,
            background: color,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
