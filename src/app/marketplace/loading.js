export default function MarketplaceLoading() {
  return (
    <div>
      <section
        style={{
          padding: "96px 64px 64px",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <SkeletonLine width={120} height={11} />
        <SkeletonLine width="60%" height={88} style={{ marginTop: 24 }} />
        <SkeletonLine width="40%" height={20} style={{ marginTop: 24 }} />
      </section>

      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 64px 160px" }}>
        <SkeletonBlock height={48} width={180} />
        <SkeletonBlock height={120} style={{ marginTop: 32 }} />
        <SkeletonBlock height={48} style={{ marginTop: 32 }} />
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonBlock key={i} height={280} />
          ))}
        </div>
      </section>
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
        ...style,
      }}
    />
  );
}

function SkeletonBlock({ height = 80, width = "100%", style }) {
  return (
    <div
      className="vz-skeleton"
      style={{
        width,
        height,
        border: "1px solid var(--rule)",
        ...style,
      }}
    />
  );
}
