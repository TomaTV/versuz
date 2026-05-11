/**
 * Pure SVG charts — no chart library, no client JS.
 * Used in /profile and /admin overviews.
 */

export function StatGrid({ stats }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 0,
        border: "1px solid var(--rule)",
      }}
      className="vz-stat-grid"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: "28px 24px",
            borderRight: i < stats.length - 1 ? "1px solid var(--rule)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 56,
              fontWeight: 400,
              color: s.color || "var(--fg)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
              lineHeight: 0.9,
            }}
          >
            {s.value}
          </span>
          {s.hint && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              {s.hint}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal bar chart for category counts.
 * data: [{ label, count, color? }]
 */
export function BarChart({ data, title, height = 280 }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barW = 100; // percent of available width per bar slot
  const rowH = 32;
  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        padding: "20px 24px",
        background: "var(--bg)",
      }}
    >
      {title && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
      )}
      <div
        style={{
          marginTop: title ? 16 : 0,
          display: "grid",
          gridTemplateColumns: "100px 1fr 48px",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg)",
          alignItems: "center",
        }}
      >
        {data.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", color: "var(--fg-muted)", padding: "16px 0" }}>
            No data
          </div>
        ) : null}
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <Row
              key={d.label}
              label={d.label}
              count={d.count}
              pct={pct}
              color={d.color || "var(--accent)"}
            />
          );
        })}
      </div>
      <span
        style={{
          fontSize: 0,
          height: 0,
          display: "block",
          width: barW + "%",
          minHeight: 0,
          minWidth: 0,
          maxHeight: 0,
          marginTop: 0,
        }}
        aria-hidden
      />
      <span style={{ display: "none" }}>{height}{rowH}</span>
    </div>
  );
}

function Row({ label, count, pct, color }) {
  return (
    <>
      <span
        style={{
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
          textTransform: "lowercase",
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        title={label}
      >
        {label}
      </span>
      <div
        style={{
          height: 16,
          background: "var(--rule)",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            transition: "width .3s ease",
          }}
        />
      </div>
      <span
        style={{
          textAlign: "right",
          color: "var(--fg)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
    </>
  );
}

/**
 * Mini sparkline. data: array of numbers.
 */
export function Sparkline({ data, width = 360, height = 60, color = "var(--accent)" }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          border: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        No data
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
