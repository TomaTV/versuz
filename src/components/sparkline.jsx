export function Sparkline({ values, height = 64 }) {
  if (!values?.length) return null;
  const w = 800;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return [x, y];
  });
  const path = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      aria-label={`Trajectory: ${values[0]} → ${values[values.length - 1]}`}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
      {pts.map(([x, y], i) => {
        const last = i === pts.length - 1;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={last ? 4 : 2}
              fill={last ? "var(--accent)" : "var(--fg-muted)"}
            />
            {last && (
              <text
                x={x - 8}
                y={y - 12}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fill="var(--accent)"
              >
                {values[values.length - 1]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
