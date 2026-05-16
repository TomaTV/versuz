"use client";

import { useEffect, useRef, useState } from "react";

// Polling /api/stats. Mai 2026 v2 : 60s → 120s. /api/stats edge-cached 60s
// (s-maxage=60) — 120s = 2 cycles cache, garantit qu'on hit toujours un
// frame mis-à-jour. Soulage Edge Requests (cap 1M/mois, à 80%).
const POLL_MS = 120000;

function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Compact live-stats bar pour le hero — montre les counts skills/claude/judged
 * et un dot LIVE qui pulse. Polling /api/stats toutes les 60s.
 */
export function HeroLiveBar({ initialSkills, initialClaudeMds, initialJudged = 0 }) {
  const [skills, setSkills] = useState(initialSkills);
  const [claudeMds, setClaudeMds] = useState(initialClaudeMds);
  const [judged, setJudged] = useState(initialJudged);
  const [pulsing, setPulsing] = useState(false);
  const lastRef = useRef({ skills: initialSkills, claudeMds: initialClaudeMds });

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    async function poll() {
      // Skip si tab caché (cf. live-stats-grid pour le rationale).
      if (typeof document !== "undefined" && document.hidden) {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
        return;
      }
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const changed = data.skills !== lastRef.current.skills || data.claudeMds !== lastRef.current.claudeMds;
        if (changed) {
          setSkills(data.skills);
          setClaudeMds(data.claudeMds);
          if (typeof data.judged === "number") setJudged(data.judged);
          lastRef.current = { skills: data.skills, claudeMds: data.claudeMds };
          setPulsing(true);
          setTimeout(() => setPulsing(false), 1200);
        }
      } catch {}
      finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }
    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const stats = [
    { n: skills, label: "skills indexed", color: "var(--azure)" },
    { n: claudeMds, label: "CLAUDE.md files", color: "var(--sage)" },
    ...(judged > 0 ? [{ n: judged, label: "quality-judged", color: "var(--amber)" }] : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(16px, 3vw, 32px)",
        flexWrap: "wrap",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.04em",
        color: "var(--fg-muted)",
      }}
    >
      {stats.map((s) => (
        <span
          key={s.label}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, lineHeight: 1.2 }}
        >
          <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, background: s.color }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              color: "var(--fg)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 400,
              lineHeight: 1,
            }}
            suppressHydrationWarning
          >
            {fmt(s.n)}
          </span>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 10 }}>
            {s.label}
          </span>
        </span>
      ))}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          fontSize: 10,
          color: "var(--accent)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: pulsing
              ? "0 0 0 6px color-mix(in oklab, var(--accent) 35%, transparent)"
              : "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)",
            transition: "box-shadow 0.4s ease-out",
          }}
        />
        <span>Live</span>
      </span>
    </div>
  );
}
