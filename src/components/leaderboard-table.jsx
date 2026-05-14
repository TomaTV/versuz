"use client";

import { useState, useMemo } from "react";
import { SkillRow, SkillRowHeader } from "@/components/skill-row";

const MIN_SCORE_OPTIONS = [
  { id: 0, label: "Any" },
  { id: 50, label: "50+" },
  { id: 60, label: "60+" },
  { id: 70, label: "70+" },
  { id: 80, label: "80+" },
];

const HIST_BUCKETS = 10; // distribution histogram: 10 buckets of 10 points each

export function LeaderboardTable({ items }) {
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [signalFilter, setSignalFilter] = useState("all"); // "all" | "bench" | "quality"
  const [minScore, setMinScore] = useState(0);

  const counts = useMemo(() => {
    const bench = items.filter((r) => r.signal === "bench").length;
    const quality = items.filter((r) => r.signal === "quality").length;
    return { all: items.length, bench, quality };
  }, [items]);

  /**
   * Aggregate stats — mean / median / stdev / max — computed over the full
   * `items` list (not filtered), so the strip stays stable when user filters.
   * Distribution histogram : 10 buckets de 10 points (0-9, 10-19, ..., 90-100).
   */
  const stats = useMemo(() => {
    const scores = items
      .map((r) => r.avg_score)
      .filter((s) => typeof s === "number" && !Number.isNaN(s));
    if (scores.length === 0) {
      return { mean: 0, median: 0, stdev: 0, max: 0, histogram: new Array(HIST_BUCKETS).fill(0) };
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance =
      scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length;
    const stdev = Math.sqrt(variance);
    const max = sorted[sorted.length - 1];
    const histogram = new Array(HIST_BUCKETS).fill(0);
    for (const s of scores) {
      const idx = Math.min(HIST_BUCKETS - 1, Math.floor(s / 10));
      histogram[idx] += 1;
    }
    return { mean, median, stdev, max, histogram };
  }, [items]);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = items;
    if (signalFilter !== "all") {
      filtered = filtered.filter((r) => r.signal === signalFilter);
    }
    if (minScore > 0) {
      filtered = filtered.filter((r) => (r.avg_score ?? 0) >= minScore);
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
  }, [items, sort, query, signalFilter, minScore]);

  const maxHistVal = Math.max(1, ...stats.histogram);

  return (
    <div>
      {/* Stats strip removed per UX feedback — Ranked/Mean/Median/Stdev/Top
          + histogram was clutter above the actual ranking table. The row
          count is already shown in the section header copy. */}

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

        <span
          aria-hidden
          style={{
            marginLeft: 8,
            marginRight: 4,
            height: 16,
            borderLeft: "1px solid var(--rule)",
            opacity: 0.6,
          }}
        />

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Min score
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{
              padding: "5px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
              border: minScore > 0 ? "1px solid var(--accent)" : "1px solid var(--rule)",
              background: "var(--bg)",
              color: minScore > 0 ? "var(--accent)" : "var(--fg)",
              cursor: "pointer",
            }}
          >
            {MIN_SCORE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {(signalFilter !== "all" || minScore > 0 || query) && (
          <button
            type="button"
            onClick={() => {
              setSignalFilter("all");
              setMinScore(0);
              setQuery("");
            }}
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--crimson)",
              background: "transparent",
              border: "1px solid var(--rule)",
              cursor: "pointer",
            }}
          >
            ↺ Clear
          </button>
        )}
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
                padding: "64px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  padding: "3px 9px",
                  color: "var(--fg-muted)",
                  border: "1px solid var(--rule-strong)",
                }}
              >
                0 matches
              </span>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--fg)",
                }}
              >
                {query
                  ? <>No match for &ldquo;<em style={{ color: "var(--accent)" }}>{query}</em>&rdquo;.</>
                  : <>No items pass the active filters.</>}
              </p>
              <button
                type="button"
                onClick={() => { setQuery(""); setSignalFilter("all"); setMinScore(0); }}
                style={{
                  marginTop: 4,
                  padding: "8px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: "var(--accent)",
                  background: "transparent",
                  border: "1px solid var(--accent)",
                }}
              >
                ↺ Clear filters
              </button>
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

function Stat({ label, value, accent }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: accent,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
