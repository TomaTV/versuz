/**
 * TierBadge — visual signal for a skill's marketplace tier.
 *
 *   tier='free'      → muted hairline pill
 *   tier='premium'   → ember-tinted pill with price
 *   tier='featured'  → sage filled pill (Versuz first-party "Editor's pick")
 */
export function TierBadge({ tier = "free", priceUsd = null, size = "md" }) {
  const styles = {
    sm: { fontSize: 9, padX: 8, padY: 3 },
    md: { fontSize: 10, padX: 10, padY: 4 },
    lg: { fontSize: 11, padX: 12, padY: 5 },
  }[size];

  if (tier === "free") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: `${styles.padY}px ${styles.padX}px`,
          fontFamily: "var(--font-mono)",
          fontSize: styles.fontSize,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          border: "1px solid var(--rule)",
        }}
      >
        Free
      </span>
    );
  }

  if (tier === "premium") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: `${styles.padY}px ${styles.padX}px`,
          fontFamily: "var(--font-mono)",
          fontSize: styles.fontSize,
          color: "var(--accent)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          border: "1px solid var(--accent)",
          background: "var(--accent-soft)",
        }}
      >
        <span aria-hidden style={{ width: 6, height: 6, background: "var(--accent)" }} />
        Premium
        {priceUsd != null && (
          <>
            <span aria-hidden style={{ width: 1, height: 10, background: "var(--accent)", opacity: 0.4 }} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>${priceUsd}</span>
          </>
        )}
      </span>
    );
  }

  // featured — Versuz first-party
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: `${styles.padY}px ${styles.padX}px`,
        fontFamily: "var(--font-mono)",
        fontSize: styles.fontSize,
        color: "var(--bg)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        background: "var(--sage)",
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, background: "var(--bg)" }} />
      Featured
      {priceUsd != null && (
        <>
          <span aria-hidden style={{ width: 1, height: 10, background: "var(--bg)", opacity: 0.4 }} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>${priceUsd}</span>
        </>
      )}
    </span>
  );
}
