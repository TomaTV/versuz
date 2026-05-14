export default function Loading() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "80px 64px 120px" }}>
      <SkeletonLine width={140} height={11} style={{ marginBottom: 48 }} />

      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 120px 120px 100px",
          gap: 24,
          padding: "16px 24px",
          borderBottom: "2px solid var(--rule-strong)",
          marginBottom: 8,
        }}
      >
        <SkeletonLine width={36} height={11} />
        <SkeletonLine width={60} height={11} />
        <SkeletonLine width={50} height={11} style={{ justifySelf: "end" }} />
        <SkeletonLine width={50} height={11} style={{ justifySelf: "end" }} />
        <SkeletonLine width={40} height={11} style={{ justifySelf: "end" }} />
      </div>

      {/* Data rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr 120px 120px 100px",
              gap: 24,
              padding: "20px 24px",
              alignItems: "center",
              borderBottom: "1px solid var(--rule)",
              background: i % 2 === 0 ? "transparent" : "var(--surface-hover)",
            }}
          >
            <SkeletonLine width={32} height={20} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <SkeletonBlock width={40} height={40} style={{ borderRadius: "50%" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SkeletonLine width={180} height={14} />
                <SkeletonLine width={100} height={11} />
              </div>
            </div>
            <SkeletonLine width={70} height={20} style={{ justifySelf: "end" }} />
            <SkeletonLine width={60} height={14} style={{ justifySelf: "end" }} />
            <SkeletonLine width={40} height={14} style={{ justifySelf: "end" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonLine({ width, height = 14, style }) {
  return (
    <div
      className="vz-skeleton"
      style={{
        width,
        height,
        borderRadius: height > 20 ? 4 : 2,
        ...style,
      }}
    />
  );
}

function SkeletonBlock({ width = "100%", height = 80, style }) {
  return (
    <div
      className="vz-skeleton"
      style={{
        width,
        height,
        borderRadius: 4,
        ...style,
      }}
    />
  );
}
