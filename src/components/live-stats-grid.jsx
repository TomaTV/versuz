"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { RevealStagger, RevealItem } from "@/components/motion/reveal";

// Polling /api/stats. Mai 2026 v2 : 30s → 90s. /api/stats est maintenant
// edge-cached 60s (s-maxage=60). Poll < 60s = doublon edge hit pour rien.
// 90s laisse une marge au-dessus de la TTL cache + soulage Edge Requests
// (Vercel cap 1M/mois, on est à 80%). Le tab caché coupe le polling.
const POLL_MS = 90000;

/**
 * Format plain : nombre complet avec narrow-no-break-space (U+202F) comme
 * séparateur de milliers. Lisible, propre, pas de compact bizarre.
 *
 *   999     → "999"
 *   1505    → "1 505"
 *   1605    → "1 605"
 *   12345   → "12 345"
 *   1234567 → "1 234 567"
 */
function formatKpi(raw) {
  return Math.round(raw).toLocaleString("en-US");
}

/**
 * Animé from 0 → value (au reveal) puis tween entre les valeurs au polling.
 * Render plain number avec séparateur de milliers, taille unique.
 */
function AnimatedKpi({ value, duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  // SSR + pre-animation : show real value (no "0" flash for crawlers / first paint).
  // Animation kicks in only after hydration + inView.
  const motionValue = useMotionValue(value);
  const [current, setCurrent] = useState(value);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    return motionValue.on("change", (v) => setCurrent(v));
  }, [motionValue]);

  useEffect(() => {
    if (!hydrated || !inView) return;
    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [hydrated, inView, motionValue, value, duration]);

  return <motion.span ref={ref}>{formatKpi(current)}</motion.span>;
}

/**
 * LiveStatsGrid — affiche les 3 KPI (skills / CLAUDE.md / ranked) avec
 * polling auto sur /api/stats toutes les POLL_MS. Le compteur CountUp
 * anime entre l'ancienne et la nouvelle valeur. Le timestamp "as of HH:MM
 * UTC" se met à jour à chaque fetch réussi.
 *
 * Initial values rendus côté serveur pour SSR-friendly (pas de flash 0).
 * Polling démarré uniquement après mount côté client.
 */
export function LiveStatsGrid({ initialSkills, initialClaudeMds, initialRanked, initialAsOf }) {
  const [skills, setSkills] = useState(initialSkills);
  const [claudeMds, setClaudeMds] = useState(initialClaudeMds);
  const [ranked, setRanked] = useState(initialRanked);
  const [asOf, setAsOf] = useState(initialAsOf);
  const [pulsing, setPulsing] = useState(false);
  // Per-stat delta tracker : { skills: { delta: +3, ts: <ms> } } — used to
  // flash a "+N" pill next to the number when it goes up.
  const [deltas, setDeltas] = useState({ skills: 0, claudeMds: 0, ranked: 0 });
  const lastRef = useRef({ skills: initialSkills, claudeMds: initialClaudeMds, ranked: initialRanked });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function poll() {
      // Pause le poll quand l'onglet est en background. Plus de 80% du
      // trafic bot (et un % non-trivial des users) ouvre l'onglet, scroll
      // 5s, et passe à autre chose. Pas de raison de continuer à hammer
      // Supabase pendant qu'ils sont sur YouTube.
      if (typeof document !== "undefined" && document.hidden) {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
        return;
      }
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const dSkills = data.skills - lastRef.current.skills;
        const dClaude = data.claudeMds - lastRef.current.claudeMds;
        const dRanked = data.ranked - lastRef.current.ranked;
        const changed = dSkills !== 0 || dClaude !== 0 || dRanked !== 0;
        if (changed) {
          setSkills(data.skills);
          setClaudeMds(data.claudeMds);
          setRanked(data.ranked);
          setDeltas({ skills: dSkills, claudeMds: dClaude, ranked: dRanked });
          lastRef.current = { skills: data.skills, claudeMds: data.claudeMds, ranked: data.ranked };
          // Pulse le dot "Live" 1.5s + clear deltas après 2.5s
          setPulsing(true);
          setTimeout(() => setPulsing(false), 1500);
          setTimeout(() => setDeltas({ skills: 0, claudeMds: 0, ranked: 0 }), 2500);
        }
        setAsOf(data.asOf);
      } catch {
        // Silencieux : un poll raté n'est pas grave, on retente plus tard
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const asOfLabel = (() => {
    try {
      // HH:MM:SS so the timestamp ticks at every poll, visible signal
      return new Date(asOf).toISOString().slice(11, 19);
    } catch {
      return "—";
    }
  })();

  const stats = [
    { n: skills, label: "skills indexed", color: "var(--azure)", delta: deltas.skills },
    { n: claudeMds, label: "CLAUDE.md indexed", color: "var(--sage)", delta: deltas.claudeMds },
    { n: ranked, label: "ranked so far", color: "var(--crimson)", delta: deltas.ranked },
  ];

  return (
    <>
      <RevealStagger
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0,
          marginTop: 64,
          borderTop: "1px solid var(--rule-strong)",
          borderBottom: "1px solid var(--rule)",
        }}
        className="vz-stat-grid"
      >
        {stats.map((s, i) => (
          <RevealItem
            key={s.label}
            style={{
              padding: "32px 24px",
              borderRight: i < 2 ? "1px solid var(--rule)" : "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              position: "relative",
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 32,
                right: 24,
                width: 10,
                height: 10,
                background: s.color,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(56px, 6vw, 88px)",
                fontWeight: 400,
                lineHeight: 0.9,
                color: "var(--fg)",
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                position: "relative",
                display: "inline-block",
              }}
            >
              <AnimatedKpi value={s.n} />
              {s.delta > 0 && (
                <span
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    transform: "translateX(100%)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    letterSpacing: "0.04em",
                    color: s.color,
                    background: "color-mix(in oklab, " + s.color + " 14%, var(--bg))",
                    padding: "3px 7px",
                    border: "1px solid " + s.color,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                    animation: "vz-delta-flash 2.4s ease-out forwards",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  +{s.delta}
                </span>
              )}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </span>
          </RevealItem>
        ))}
      </RevealStagger>
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
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
        <span suppressHydrationWarning>Live · as of {asOfLabel} UTC</span>
      </div>
    </>
  );
}
