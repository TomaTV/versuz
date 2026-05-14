// Lightweight inline SVG charts for admin dashboard. No deps.
// All charts render server-side, no client JS.

const COLORS = {
  ok: "rgb(80,180,120)",
  warn: "rgb(229,166,68)",
  err: "rgb(220,80,80)",
  ember: "rgb(229,118,68)",
  blue: "rgb(110,150,220)",
  muted: "rgba(20,18,14,0.18)",
  bg: "var(--surface)",
};

export function Sparkline({ data, color = COLORS.ember, height = 60, fill = true, emptyHint = null }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const allZero = data.every((v) => v === 0);
  if (allZero && emptyHint) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          border: "1px dashed var(--rule)",
        }}
      >
        {emptyHint}
      </div>
    );
  }
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = height - (v / max) * (height - 4) - 2;
    return [x, y];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {fill && <path d={areaPath} fill={color} opacity="0.15" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function BarChart({ data, color = COLORS.ember, height = 80, capLine = null, capColor = COLORS.warn, emptyHint = null }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, capLine || 0, 0.01);
  const allZero = data.every((v) => v === 0);
  if (allZero && emptyHint) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          border: "1px dashed var(--rule)",
        }}
      >
        {emptyHint}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", height, display: "flex", alignItems: "flex-end", gap: 2 }}>
      {capLine !== null && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${(capLine / max) * 100}%`,
            height: 1,
            background: capColor,
            opacity: 0.5,
            zIndex: 1,
          }}
        />
      )}
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(2, (v / max) * 100)}%`,
            background: capLine !== null && v > capLine ? COLORS.warn : v > 0 ? color : COLORS.bg,
            opacity: v > 0 ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

// Horizontal stacked bar — better than donut for funnel-style data
// where one segment dwarfs the others (Raw 99% / Quality 1% / Benched 0.01%).
export function StackedBar({ segments, height = 14, showLabels = true }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div
        style={{
          display: "flex",
          height,
          background: COLORS.bg,
          overflow: "hidden",
        }}
      >
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div
              key={i}
              title={`${s.label} · ${s.value.toLocaleString()} · ${pct.toFixed(2)}%`}
              style={{
                width: `${pct}%`,
                background: s.color,
                minWidth: s.value > 0 ? 2 : 0,
              }}
            />
          );
        })}
      </div>
      {showLabels && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {segments.map((s) => {
            const pct = (s.value / total) * 100;
            return (
              <div
                key={s.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "10px 1fr 80px 60px",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {s.value.toLocaleString()}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {pct < 0.01 ? "<0.01%" : `${pct.toFixed(pct < 1 ? 2 : 1)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const CHART_COLORS = COLORS;
