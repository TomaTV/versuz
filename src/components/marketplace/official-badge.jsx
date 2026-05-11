/**
 * OfficialBadge — petit stamp carré bleu rempli, à droite du TierBadge.
 * Style "verified org" : juste un ✓ dans un carré 16×16, pas de label.
 * Tooltip "Official — published by a verified organization" sur hover.
 */
export function OfficialBadge({ official = false }) {
  if (!official) return null;

  return (
    <span
      title="Official — published by a verified organization"
      aria-label="Official"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        color: "var(--bone)",
        background: "var(--azure)",
        flexShrink: 0,
      }}
    >
      ✓
    </span>
  );
}
