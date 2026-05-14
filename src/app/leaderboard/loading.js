/**
 * Leaderboard loading skeleton — matches LeaderboardTable structure :
 *   - PageHero (eyebrow + title + subtitle)
 *   - Skill / CLAUDE.md toggle
 *   - Category pills
 *   - Stats strip (5 stats + histogram)
 *   - Signal filter pills + min-score select + search
 *   - Table header + 12 rows
 */

export default function LeaderboardLoading() {
  return (
    <div>
      <section
        style={{
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <Skeleton width={140} height={11} />
        <Skeleton width="48%" height={88} style={{ marginTop: 28, maxWidth: 720 }} />
        <Skeleton width="100%" height={18} style={{ marginTop: 24, maxWidth: 720 }} />
        <Skeleton width="78%" height={18} style={{ marginTop: 8, maxWidth: 620 }} />
      </section>

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 10vw, 120px)",
        }}
      >
        {/* Skill / CLAUDE.md toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          <Skeleton width={130} height={36} />
          <Skeleton width={150} height={36} />
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {[90, 100, 85, 110, 95, 90].map((w, i) => (
            <Skeleton key={i} width={w} height={28} />
          ))}
        </div>

        {/* Stats strip — 5 metrics + histogram */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr) 1.5fr",
            gap: 16,
            padding: "16px 18px",
            marginBottom: 20,
            border: "1px solid var(--rule)",
            background: "var(--surface)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width={50} height={9} />
              <Skeleton width={64} height={22} />
            </div>
          ))}
          {/* Histogram */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              height: 36,
              paddingLeft: 16,
              borderLeft: "1px solid var(--rule)",
            }}
          >
            {[12, 24, 60, 80, 95, 88, 70, 45, 22, 10].map((h, i) => (
              <Skeleton key={i} width={null} height={`${h}%`} style={{ flex: 1, minWidth: 4 }} />
            ))}
          </div>
        </div>

        {/* Signal filter pills + min-score + clear */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <Skeleton width={60} height={28} />
          <Skeleton width={90} height={28} />
          <Skeleton width={110} height={28} />
          <span style={{ width: 1, height: 16, background: "var(--rule)", margin: "auto 4px" }} />
          <Skeleton width={120} height={28} />
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Skeleton width="100%" height={36} style={{ maxWidth: 420 }} />
          <Skeleton width={80} height={11} />
        </div>

        {/* Table */}
        <div style={{ border: "1px solid var(--rule-strong)" }}>
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr repeat(5, 56px) 80px",
              gap: 8,
              padding: "12px 16px",
              borderBottom: "1px solid var(--rule-strong)",
              background: "var(--surface)",
            }}
          >
            <Skeleton width={20} height={11} />
            <Skeleton width="60%" height={11} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={32} height={11} />
            ))}
            <Skeleton width={48} height={11} />
          </div>

          {/* 12 rows */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr repeat(5, 56px) 80px",
                gap: 8,
                padding: "14px 16px",
                borderBottom: "1px solid var(--rule)",
                alignItems: "center",
              }}
            >
              <Skeleton width={24} height={14} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={10} />
              </div>
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} width={36} height={12} />
              ))}
              <Skeleton width={60} height={16} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Skeleton({ width, height = 12, style }) {
  return (
    <div
      className="vz-skeleton"
      aria-hidden
      style={{
        ...(width != null ? { width } : {}),
        height,
        ...style,
      }}
    />
  );
}
