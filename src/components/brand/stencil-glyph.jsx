export function StencilGlyph({ char = "Z", size = 600, opacity = 0.04 }) {
  return (
    <div
      aria-hidden
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 400,
        fontStyle: "italic",
        color: "var(--accent)",
        opacity,
        lineHeight: 0.8,
        letterSpacing: "-0.06em",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {char}
    </div>
  );
}
