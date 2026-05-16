"use client";

import { useMemo, useState } from "react";

/**
 * ChangelogList — filterable, grouped, statistically-flavored view of
 * the changelog entries. Stays under 300 lines, server-fed entries
 * passed in via props (no fetch here), client-only because filtering
 * needs interactivity.
 */

const TYPE_LABELS = {
  feat: "Features",
  fix: "Fixes",
  perf: "Perf",
  infra: "Infra",
  content: "Content",
  docs: "Docs",
};

function parseYear(dateStr) {
  if (!dateStr) return "Other";
  const m = String(dateStr).match(/^(\d{4})/);
  return m ? m[1] : "Other";
}

export function ChangelogList({ entries, typeStyles }) {
  const [activeType, setActiveType] = useState("all");
  const [query, setQuery] = useState("");

  // Counts per type — computed once over the full entries set.
  const typeCounts = useMemo(() => {
    const counts = { all: 0 };
    for (const entry of entries) {
      for (const item of entry.items || []) {
        counts.all += 1;
        counts[item.type] = (counts[item.type] || 0) + 1;
      }
    }
    return counts;
  }, [entries]);

  // Filter pipeline : per-entry mapping, dropping items that don't
  // match the active filter + search query. Drops entries that end
  // up with zero items.
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .map((entry) => {
        const items = (entry.items || []).filter((item) => {
          if (activeType !== "all" && item.type !== activeType) return false;
          if (q && !String(item.body || "").toLowerCase().includes(q)) {
            return false;
          }
          return true;
        });
        return items.length > 0 ? { ...entry, items } : null;
      })
      .filter(Boolean);
  }, [entries, activeType, query]);

  // Group by year. Newest year first, entries within keep original
  // (already date-desc) order.
  const groupedByYear = useMemo(() => {
    const groups = new Map();
    for (const entry of filteredEntries) {
      const year = parseYear(entry.date);
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(entry);
    }
    return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filteredEntries]);

  const totalItems = filteredEntries.reduce(
    (s, e) => s + (e.items?.length || 0),
    0
  );
  const totalEntries = filteredEntries.length;

  const TYPES = ["all", "feat", "fix", "perf", "infra", "content", "docs"];

  return (
    <>
      {/* Stats strip */}
      <div
        style={{
          marginBottom: 24,
          padding: "16px 0",
          borderTop: "1px solid var(--rule-strong, var(--rule))",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        <span>
          <strong style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
            {totalEntries}
          </strong>{" "}
          release{totalEntries === 1 ? "" : "s"}
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>
          <strong style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
            {totalItems}
          </strong>{" "}
          item{totalItems === 1 ? "" : "s"} shipped
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>
          {Object.entries(typeCounts)
            .filter(([k]) => k !== "all" && typeCounts[k] > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${v} ${TYPE_LABELS[k]?.toLowerCase() || k}`)
            .join(" · ")}
        </span>
      </div>

      {/* Filters + search */}
      <div
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPES.map((t) => {
            const count = typeCounts[t] || 0;
            const active = activeType === t;
            const color = t === "all" ? "var(--fg)" : typeStyles[t]?.color || "var(--fg)";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                disabled={count === 0}
                style={{
                  padding: "6px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: active ? "var(--bg)" : color,
                  background: active ? color : "transparent",
                  border: `1px solid ${active ? color : "var(--rule)"}`,
                  cursor: count === 0 ? "not-allowed" : "pointer",
                  opacity: count === 0 ? 0.4 : 1,
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {t === "all" ? "All" : TYPE_LABELS[t] || t}
                <span
                  style={{
                    marginLeft: 6,
                    opacity: 0.7,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            flex: "1 1 200px",
            maxWidth: 280,
            marginLeft: "auto",
            padding: "8px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg)",
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            outline: "none",
            letterSpacing: "0.02em",
          }}
        />
      </div>

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div
          style={{
            padding: "40px 24px",
            border: "1px dashed var(--rule-strong, var(--rule))",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
          }}
        >
          No entries match this filter.{" "}
          <button
            type="button"
            onClick={() => {
              setActiveType("all");
              setQuery("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              fontFamily: "inherit",
              fontSize: "inherit",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Grouped entries */}
      {groupedByYear.map(([year, yearEntries]) => (
        <section key={year} style={{ marginBottom: 40 }}>
          <h2
            style={{
              margin: "0 0 24px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              paddingBottom: 8,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            {year}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            {yearEntries.map((entry) => (
              <article
                key={entry.date}
                id={`entry-${entry.date}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  scrollMarginTop: 96,
                }}
              >
                <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <a
                    href={`#entry-${entry.date}`}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                  >
                    {entry.date}
                    <span
                      style={{
                        marginLeft: 8,
                        opacity: 0.4,
                      }}
                    >
                      #
                    </span>
                  </a>
                  <h3
                    className="vz-changelog-title"
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(20px, 2.6vw, 28px)",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: "var(--fg)",
                    }}
                  >
                    {entry.title}
                  </h3>
                </header>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {entry.items.map((item, idx) => {
                    const style = typeStyles[item.type] || typeStyles.feat;
                    return (
                      <li
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gap: 14,
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            color: style.color,
                            border: `1px solid ${style.color}`,
                            background:
                              "color-mix(in oklab, " + style.color + " 5%, transparent)",
                            minWidth: 52,
                            textAlign: "center",
                            display: "inline-block",
                          }}
                        >
                          {style.label}
                        </span>
                        <span
                          className="vz-changelog-body"
                          style={{
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "var(--fg)",
                          }}
                        >
                          {item.body}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
