import Link from "next/link";

/**
 * Compact battle preview. The italic "vs" lives INSIDE the card as the natural
 * divider between A and B — no orphan decoration.
 */
export function HeroBattleCard({ battle }) {
  const { a, b, winner } = battle;
  const aWon = winner === "a";
  const bWon = winner === "b";

  return (
    <Link
      href={`/skills/${a.slug}`}
      className="vz-hero-battle"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        position: "relative",
        transition: "border-color 0.2s ease, transform 0.3s ease",
      }}
    >
      {/* Skill A */}
      <SideRow skill={a} won={aWon} />

      {/* VS divider — italic ember inset on a hairline */}
      <div
        style={{
          position: "relative",
          height: 1,
          background: "var(--rule)",
          margin: "0 24px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--surface)",
            padding: "0 16px",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 56,
            fontWeight: 400,
            color: "var(--accent)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          vs
        </span>
      </div>

      {/* Skill B */}
      <SideRow skill={b} won={bWon} />

      {/* Footer */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden style={{ width: 6, height: 6, background: "var(--accent)" }} />
          <span aria-hidden style={{ width: 6, height: 6, background: "var(--azure)" }} />
          <span aria-hidden style={{ width: 6, height: 6, background: "var(--sage)" }} />
          <span style={{ marginLeft: 4, letterSpacing: "0.06em" }}>3 judges weighed in</span>
        </span>
        <span style={{ color: "var(--accent)", letterSpacing: "0.04em" }}>view ↗</span>
      </div>
    </Link>
  );
}

function SideRow({ skill, won }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "center",
        opacity: won ? 1 : 0.65,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {won ? "winner" : "challenger"} · {skill.author}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20px, 4vw, 32px)",
            fontWeight: 400,
            color: "var(--fg)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            fontStyle: won ? "italic" : "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {skill.name}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(30px, 6vw, 48px)",
          fontWeight: 400,
          color: won ? "var(--accent)" : "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.04em",
          lineHeight: 0.9,
        }}
      >
        {skill.score}
      </span>
    </div>
  );
}
