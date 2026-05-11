"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CmdKSearch() {
  const [open, setOpen] = useState(false);

  // Global keyboard: Cmd+K / Ctrl+K to open, Esc to close
  useEffect(() => {
    const onKey = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  return <SearchPanel onClose={() => setOpen(false)} />;
}

function SearchPanel({ onClose }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ skills: [], claudeMds: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Debounced fetch on `q` change. setState lives inside the timeout/fetch
  // callbacks (not the effect body), so the react-hooks lint rule is happy.
  useEffect(() => {
    const term = q.trim();
    if (!term) return undefined;
    const ctrl = new AbortController();
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setActiveIndex(0);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setResults({ skills: [], claudeMds: [] });
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      ctrl.abort();
      clearTimeout(handle);
    };
  }, [q]);

  // When the search box is cleared, clear results synchronously via the change handler.
  const onQueryChange = (value) => {
    setQ(value);
    if (!value.trim()) {
      setResults({ skills: [], claudeMds: [] });
      setLoading(false);
    }
  };

  const flat = [
    ...results.skills.map((s) => ({
      kind: "skill",
      key: `s:${s.slug}`,
      href: `/skills/${s.slug}`,
      title: s.name,
      sub: `${s.category || "skill"}${s.description ? ` · ${s.description}` : ""}`,
      stars: s.stars,
    })),
    ...results.claudeMds.map((c) => ({
      kind: "claude_md",
      key: `c:${c.slug}`,
      href: `/claude-md/${c.project_category || "generic"}/${c.slug}`,
      title:
        c.author && c.repo
          ? `${c.author}/${c.repo}`
          : c.slug,
      sub: `${c.project_category || "claude.md"}${c.description ? ` · ${c.description}` : ""}`,
      stars: c.stars,
    })),
  ];

  const onKeyDownInput = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault();
      router.push(flat[activeIndex].href);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(20, 18, 14, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 24px 0",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          background: "var(--bg)",
          border: "1px solid var(--rule-strong)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Search
          </span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDownInput}
            placeholder="Find a skill or CLAUDE.md by name, author, or description…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: 16,
            }}
          />
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "2px 8px",
              border: "1px solid var(--rule)",
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {loading && (
            <div
              style={{
                padding: "16px 20px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
              }}
            >
              Searching…
            </div>
          )}
          {!loading && q.trim() && flat.length === 0 && (
            <div
              style={{
                padding: "32px 20px",
                fontFamily: "var(--font-display)",
                fontSize: 18,
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              No matches for &ldquo;{q}&rdquo;.
            </div>
          )}
          {!q.trim() && (
            <div
              style={{
                padding: "20px 20px 24px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
                lineHeight: 1.6,
              }}
            >
              Tip: search across all <strong style={{ color: "var(--fg)" }}>SKILL.md</strong> and{" "}
              <strong style={{ color: "var(--fg)" }}>CLAUDE.md</strong> in the registry. Up to 8 matches per type. Use ↑↓ to navigate, Enter to open.
            </div>
          )}
          {flat.length > 0 && (
            <Group
              title="Skills"
              items={flat.filter((x) => x.kind === "skill")}
              active={flat[activeIndex]}
              onSelect={(i) => {
                router.push(i.href);
                onClose();
              }}
            />
          )}
          {flat.length > 0 && (
            <Group
              title="CLAUDE.md"
              items={flat.filter((x) => x.kind === "claude_md")}
              active={flat[activeIndex]}
              onSelect={(i) => {
                router.push(i.href);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, items, active, onSelect }) {
  if (!items.length) return null;
  return (
    <div>
      <div
        style={{
          padding: "10px 20px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "var(--surface)",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {title}
      </div>
      {items.map((it) => {
        const isActive = active && active.key === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect(it)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "12px 20px",
              border: "none",
              background: isActive ? "var(--surface)" : "transparent",
              color: "var(--fg)",
              cursor: "pointer",
              textAlign: "left",
              borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.title}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.sub}
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
              ★ {it.stars >= 1000 ? `${(it.stars / 1000).toFixed(1)}k` : it.stars}
            </span>
          </button>
        );
      })}
    </div>
  );
}
