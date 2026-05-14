import { HairBar } from "@/components/hair-bar";

function BattleSide({ skill, won, alignRight = false }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: alignRight ? "flex-end" : "flex-start",
        textAlign: alignRight ? "right" : "left",
        opacity: won ? 1 : 0.5,
        transition: "opacity .3s ease",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {skill.author}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 5vw, 44px)",
            fontWeight: 400,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: "var(--fg)",
            fontStyle: won ? "italic" : "normal",
            overflowWrap: "anywhere",
          }}
        >
          {skill.name}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: alignRight ? "flex-end" : "flex-start",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {won ? "— winner" : "score"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 7vw, 56px)",
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
      <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: 8 }}>
        {skill.judges.map((j) => (
          <div
            key={j.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexDirection: alignRight ? "row-reverse" : "row",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
            }}
          >
            <span style={{ width: 70, textAlign: alignRight ? "right" : "left" }}>{j.name}</span>
            <div style={{ flex: 1 }}>
              <HairBar value={j.score} color={won ? "var(--accent)" : "var(--fg-muted)"} />
            </div>
            <span
              style={{
                width: 32,
                textAlign: alignRight ? "left" : "right",
                color: "var(--fg)",
              }}
            >
              {j.score.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BattleSpread({ battle }) {
  const { a, b, winner, rationale, id, suite } = battle;
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 16,
          borderBottom: "1px solid var(--rule)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        <span>
          Battle / {id} · {suite}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            className="vz-pulse"
            style={{ width: 6, height: 6, background: "var(--accent)" }}
          />
          Judged · 3/3
        </span>
      </div>

      <div
        className="vz-battle-spread"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 0,
          padding: "40px 0",
          alignItems: "center",
        }}
      >
        <BattleSide skill={a} won={winner === "a"} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
            position: "relative",
            minHeight: 200,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 1, height: "100%", background: "var(--rule)" }} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 7vw, 64px)",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--accent)",
              letterSpacing: "-0.04em",
              background: "var(--bg)",
              padding: "0 8px",
              position: "relative",
              zIndex: 1,
              lineHeight: 0.9,
            }}
          >
            vs
          </div>
        </div>
        <BattleSide skill={b} won={winner === "b"} alignRight />
      </div>

      {rationale && (
        <div style={{ padding: "24px 0 0", borderTop: "1px solid var(--rule)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            <span>Rationale · {rationale.judge}</span>
            <span>weighted {rationale.weight.toFixed(2)}</span>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--fg)",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
              maxWidth: 720,
            }}
          >
            “{rationale.text}”
          </p>
        </div>
      )}
    </div>
  );
}
