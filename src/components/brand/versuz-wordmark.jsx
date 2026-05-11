/**
 * Versuz wordmark — italic 's' is the accent (because ver·S·uz reads "versus").
 *
 * `size` is the cap-height in px. The ember accent dot at the end is dropped
 * at small sizes for legibility (size < 28).
 */
export function VersuzWordmark({
  size = 22,
  color = "currentColor",
  accentColor = "var(--ember)",
}) {
  const small = size < 28;
  return (
    <span
      aria-label="Versuz"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: "var(--font-display)",
        fontSize: size * 1.2,
        fontWeight: 400,
        letterSpacing: "-0.025em",
        lineHeight: 1,
        color,
      }}
    >
      ver
      <em
        style={{
          fontStyle: "italic",
          color: accentColor,
        }}
      >
        s
      </em>
      uz
      {!small && (
        <span
          style={{
            width: size * 0.14,
            height: size * 0.14,
            background: accentColor,
            marginLeft: size * 0.1,
            alignSelf: "flex-end",
            marginBottom: size * 0.08,
          }}
        />
      )}
    </span>
  );
}
