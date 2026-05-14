/**
 * Marketplace loading skeleton — matches the real page structure.
 * PageHero + type toggle + categories pills + Refine bar + active chips + grid.
 *
 * Shimmer via `.vz-skeleton` class (defined in globals.css).
 */

export default function MarketplaceLoading() {
  return (
    <div>
      <section
        style={{
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <Skeleton width={120} height={11} />
        <Skeleton width="62%" height={88} style={{ marginTop: 28, maxWidth: 920 }} />
        <Skeleton width="100%" height={18} style={{ marginTop: 24, maxWidth: 680 }} />
        <Skeleton width="80%" height={18} style={{ marginTop: 8, maxWidth: 580 }} />
      </section>

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        {/* Type toggle (Skills / Claude.md) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          <Skeleton width={120} height={36} />
          <Skeleton width={140} height={36} />
        </div>

        {/* Categories row : 5-7 pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {[80, 95, 90, 110, 85, 100, 95].map((w, i) => (
            <Skeleton key={i} width={w} height={30} />
          ))}
        </div>

        {/* Refine button + result-count + search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            gap: 16,
          }}
        >
          <Skeleton width={120} height={32} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton width={240} height={32} />
            <Skeleton width={80} height={14} />
          </div>
        </div>

        {/* Card grid — 12 placeholders matching MarketplaceCard structure */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** A single marketplace card placeholder — matches MarketplaceCard layout. */
function CardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 16px 14px",
        border: "1px solid var(--rule)",
        minHeight: 220,
        background: "var(--bg)",
      }}
    >
      {/* Top row : tier badge + official badge */}
      <div style={{ display: "flex", gap: 6 }}>
        <Skeleton width={42} height={18} />
        <Skeleton width={42} height={18} />
      </div>
      {/* Name */}
      <Skeleton width="78%" height={22} style={{ marginTop: 4 }} />
      {/* Subline (author · category) */}
      <Skeleton width="48%" height={11} />
      {/* Description — 3 lines */}
      <Skeleton width="100%" height={12} style={{ marginTop: 4 }} />
      <Skeleton width="90%" height={12} />
      <Skeleton width="64%" height={12} />
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Footer stats line */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 8,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <Skeleton width="40%" height={11} />
        <Skeleton width="22%" height={11} />
      </div>
    </div>
  );
}

function Skeleton({ width, height = 12, style }) {
  return (
    <div
      className="vz-skeleton"
      style={{ width, height, ...style }}
      aria-hidden
    />
  );
}
