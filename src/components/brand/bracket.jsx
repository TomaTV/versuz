export function Bracket({ children, padding = 24, color = "var(--rule-strong)" }) {
  const corners = [
    { top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    { top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    { bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    { bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
  ];
  return (
    <div style={{ position: "relative", padding }}>
      {corners.map((style, i) => (
        <span
          key={i}
          aria-hidden
          style={{ position: "absolute", width: 18, height: 18, ...style }}
        />
      ))}
      {children}
    </div>
  );
}
