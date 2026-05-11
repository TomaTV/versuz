import { getCurrentCycle } from "@/lib/queries/rankings";

export async function VzTicker() {
  const cycle = await getCurrentCycle();

  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "12px 64px",
          display: "flex",
          alignItems: "center",
          gap: 32,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        {cycle && cycle.status === "running" ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="vz-pulse"
                style={{ width: 6, height: 6, background: "var(--accent)" }}
              />
              CYCLE #{cycle.id} · LIVE · {cycle.scope}
            </span>
            <span style={{ flex: 1, position: "relative", overflow: "hidden", height: 16 }}>
              <span
                className="vz-marquee"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  gap: 48,
                }}
              >
                {[...cycle.recent, ...cycle.recent, ...cycle.recent].map((t, i) => (
                  <span key={i}>↗ {t}</span>
                ))}
              </span>
            </span>
            <span style={{ whiteSpace: "nowrap" }}>JUDGING · LIVE</span>
          </>
        ) : cycle && cycle.status === "completed" ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--sage)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: 6, height: 6, background: "var(--sage)" }} />
              CYCLE #{cycle.id} · COMPLETED · {cycle.scope}
            </span>
            <span style={{ flex: 1, position: "relative", overflow: "hidden", height: 16 }}>
              <span
                className="vz-marquee"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  gap: 48,
                }}
              >
                {[...cycle.recent, ...cycle.recent, ...cycle.recent].map((t, i) => (
                  <span key={i}>★ {t}</span>
                ))}
              </span>
            </span>
            <span style={{ whiteSpace: "nowrap" }} suppressHydrationWarning>
              FINISHED · {cycle.completedAt ? new Date(cycle.completedAt).toISOString().slice(11, 16) + " UTC" : "—"}
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: 6, height: 6, background: "var(--rule-strong)" }} />
              BENCH ENGINE · IDLE
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ whiteSpace: "nowrap" }}>NEXT CYCLE · DAILY AT 06:00 UTC</span>
          </>
        )}
      </div>
    </div>
  );
}
