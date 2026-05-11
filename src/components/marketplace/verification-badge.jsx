/**
 * VerificationBadge — small visual cue for trust level.
 *
 *   0 unverified  — no badge (or muted dash)
 *   1 claimed     — small "claimed" pill
 *   2 verified    — checkmark in azure
 *   3 reviewed    — solid checkmark in sage
 *   4 featured    — star in amber
 */
const LEVELS = {
  0: { label: "Unverified", color: "var(--fg-muted)", icon: "—", show: false },
  1: { label: "Claimed", color: "var(--azure)", icon: "·" },
  2: { label: "Verified", color: "var(--azure)", icon: "✓" },
  3: { label: "Reviewed", color: "var(--sage)", icon: "✓" },
  4: { label: "Featured", color: "var(--amber)", icon: "★" },
};

export function VerificationBadge({ level = 0, showLabel = false, hideUnverified = true }) {
  const cfg = LEVELS[level] || LEVELS[0];
  if (cfg.show === false && hideUnverified) return null;

  return (
    <span
      title={cfg.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: cfg.color,
        letterSpacing: "0.06em",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          fontSize: 11,
          fontWeight: 600,
          color: cfg.color,
          border: `1px solid ${cfg.color}`,
        }}
      >
        {cfg.icon}
      </span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}
