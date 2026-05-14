import { getCurrentCycle } from "@/lib/queries/rankings";
import { NextCycleCountdown } from "@/components/next-cycle-countdown";

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
        className="vz-ticker"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "12px clamp(14px, 4.5vw, 64px)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 32px)",
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
            <span className="vz-ticker-secondary" style={{ whiteSpace: "nowrap" }}>
              <span className="vz-ticker-long">JUDGING · LIVE</span>
              <span className="vz-ticker-short">LIVE</span>
            </span>
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
            <span className="vz-ticker-secondary" style={{ whiteSpace: "nowrap" }} suppressHydrationWarning>
              <span className="vz-ticker-long">
                FINISHED · {cycle.completedAt ? new Date(cycle.completedAt).toISOString().slice(11, 16) + " UTC" : "—"}
              </span>
              <span className="vz-ticker-short">
                ✓ {cycle.completedAt ? new Date(cycle.completedAt).toISOString().slice(11, 16) : "—"}
              </span>
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
            <span className="vz-ticker-secondary" style={{ whiteSpace: "nowrap" }}>
              <span className="vz-ticker-long">
                <NextCycleCountdown variant="long" />
              </span>
              <span className="vz-ticker-short">
                <NextCycleCountdown variant="short" />
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
