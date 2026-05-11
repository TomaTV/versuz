export default function ClaudeMdLoading() {
  return (
    <div>
      <section
        style={{
          padding: "96px 64px 80px",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <div className="vz-skeleton" style={{ width: 160, height: 11, marginBottom: 64 }} />
        <div className="vz-skeleton" style={{ width: 220, height: 11, marginBottom: 24 }} />
        <div className="vz-skeleton" style={{ width: "65%", height: 96, marginBottom: 32 }} />
        <div className="vz-skeleton" style={{ width: "55%", height: 22, marginBottom: 8 }} />
        <div className="vz-skeleton" style={{ width: "45%", height: 22, marginBottom: 40 }} />
        <div className="vz-skeleton" style={{ width: 200, height: 48 }} />
      </section>

      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 64px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
          className="vz-stat-grid"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "32px 24px",
                borderRight: i < 3 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className="vz-skeleton" style={{ width: 60, height: 11 }} />
              <div className="vz-skeleton" style={{ width: 100, height: 56 }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
