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
  0: {
    label: "Unverified",
    tooltip: "Unverified — scraped from GitHub, no owner has claimed it yet.",
    color: "var(--fg-muted)",
    icon: "—",
    show: false,
  },
  1: {
    label: "Claimed",
    tooltip: "Claimed — the GitHub owner of this repo has linked it to their Versuz profile.",
    color: "var(--azure)",
    icon: "·",
  },
  2: {
    label: "Verified",
    tooltip: "Verified — author identity confirmed and metadata cross-checked.",
    color: "var(--azure)",
    icon: "✓",
  },
  3: {
    label: "Reviewed",
    tooltip: "Reviewed — Versuz editorial team has tested this skill end-to-end.",
    color: "var(--sage)",
    icon: "✓",
  },
  4: {
    label: "Featured",
    tooltip: "Featured — Versuz first-party pick, hand-curated.",
    color: "var(--amber)",
    icon: "★",
  },
};

export function VerificationBadge({ level = 0, showLabel = false, hideUnverified = true }) {
  const cfg = LEVELS[level] || LEVELS[0];
  if (cfg.show === false && hideUnverified) return null;

  return (
    <span
      title={cfg.tooltip || cfg.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: cfg.color,
        letterSpacing: "0.06em",
        cursor: "help",
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
