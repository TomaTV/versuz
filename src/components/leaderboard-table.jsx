"use client";

import { useState, useMemo } from "react";
import { SkillRow, SkillRowHeader } from "@/components/skill-row";

export function LeaderboardTable({ items }) {
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [signalFilter, setSignalFilter] = useState("all"); // "all" | "bench" | "quality"

  const counts = useMemo(() => {
    const bench = items.filter((r) => r.signal === "bench").length;
    const quality = items.filter((r) => r.signal === "quality").length;
    return { all: items.length, bench, quality };
  }, [items]);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = items;
    if (signalFilter !== "all") {
      filtered = filtered.filter((r) => r.signal === signalFilter);
    }
    if (q) {
      filtered = filtered.filter((r) => {
        const hay = `${r.name || ""} ${r.slug || ""} ${r.author || ""} ${r.category || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...filtered].sort((a, b) => {
      // When showing All : bench items float first (better signal), then quality
      if (signalFilter === "all" && a.signal !== b.signal) {
        return a.signal === "bench" ? -1 : 1;
      }
      if (sort === "name") return (a.name || a.slug).localeCompare(b.name || b.slug);
      if (sort === "score") return (b.avg_score ?? 0) - (a.avg_score ?? 0);
      const av = a.axes?.[sort];
      const bv = b.axes?.[sort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [items, sort, query, signalFilter]);

  return (
    <div>
      {/* Signal filter pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          padding: "0 4px",
          flexWrap: "wrap",
        }}
      >
        {[
          { id: "all", label: "All", color: "var(--fg)" },
          { id: "bench", label: "Benched", color: "var(--accent)" },
          { id: "quality", label: "Quality only", color: "var(--azure)" },
        ].map((p) => {
          const active = signalFilter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSignalFilter(p.id)}
              style={{
                padding: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                color: active ? "var(--bg)" : p.color,
                background: active ? p.color : "transparent",
                border: `1px solid ${active ? p.color : "var(--rule)"}`,
                transition: "all 0.18s ease",
              }}
            >
              {p.label}
              <span style={{ opacity: 0.7, marginLeft: 6, fontWeight: 400 }}>
                {counts[p.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          padding: "0 4px",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            maxWidth: 420,
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, author, category…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              border: "1px solid var(--rule-strong)",
              background: "var(--bg)",
              color: "var(--fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.02em",
              outline: "none",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--fg-muted)",
            }}
          >
            ⌕
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {ranked.length} of {items.length}
        </span>
      </div>

      <div style={{ border: "1px solid var(--rule-strong)", overflowX: "auto" }}>
        <div style={{ minWidth: 880 }}>
          <SkillRowHeader sort={sort} onSort={setSort} />
          {ranked.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
              }}
            >
              No matches for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            ranked.map((r, i) => (
              <SkillRow key={`${r.slug}-${r.category}`} skill={r} leader={i === 0 && !query} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
