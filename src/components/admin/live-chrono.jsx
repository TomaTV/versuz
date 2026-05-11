"use client";

import { useEffect, useState, useRef } from "react";

function formatDuration(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 600) {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${String(rs).padStart(2, "0")}`;
  }
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

/**
 * Live elapsed/ETA chrono. Ticks every second client-side based on the
 * server-rendered snapshot. Drift is corrected by the parent's 15s
 * router.refresh() (AutoRefresh).
 *
 * @param startedAtIso  cycle.started_at as ISO string
 * @param etaMsAtRender  ETA in ms at the moment of server render
 * @param renderedAtMs   Date.now() at server-render time (passed from page)
 */
export function LiveChrono({ startedAtIso, etaMsAtRender, renderedAtMs }) {
  const [now, setNow] = useState(() => renderedAtMs || Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedMs = startedAtIso ? now - new Date(startedAtIso).getTime() : 0;
  // ETA at render minus the wall-clock that has passed since the server render.
  // If positive : countdown ticks down. If would go negative : clamp to 0.
  const elapsedSinceRender = renderedAtMs ? now - renderedAtMs : 0;
  const etaMs = Math.max(0, (etaMsAtRender || 0) - elapsedSinceRender);

  return (
    <>
      <span data-chrono="elapsed">{formatDuration(elapsedMs)}</span>
      <span data-chrono="eta" data-etams={etaMs}>{etaMs > 0 ? formatDuration(etaMs) : "—"}</span>
    </>
  );
}

/** Render just the elapsed part */
export function LiveElapsed({ startedAtIso }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedMs = startedAtIso ? now - new Date(startedAtIso).getTime() : 0;
  return <span suppressHydrationWarning>{formatDuration(elapsedMs)}</span>;
}

/**
 * Render the ETA. Anti-bounce countdown :
 *  - Initialize from localStorage if recent (< 60s old) — survives F5
 *  - Else initialize from server snapshot
 *  - Tick down 1s/sec locally, persist to localStorage every tick
 *  - When a new server snapshot arrives :
 *    - If it's significantly faster (< current - 8s) : adopt (genuinely faster)
 *    - If it's significantly slower (> current + 30s) : adopt (judges stalled)
 *    - Otherwise : ignore (anti-bounce)
 */
const ETA_KEY = "vz_admin_eta_v1";

function readPersistedEta() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ETA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ms !== "number" || typeof parsed.ts !== "number") return null;
    const ageSec = (Date.now() - parsed.ts) / 1000;
    if (ageSec < 0 || ageSec > 60) return null; // too old, ignore
    const adjusted = Math.max(0, parsed.ms - ageSec * 1000);
    return adjusted;
  } catch {
    return null;
  }
}

function writePersistedEta(ms) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ETA_KEY, JSON.stringify({ ms, ts: Date.now() }));
  } catch {
    // quota or disabled — ignore
  }
}

export function LiveEta({ etaMsAtRender, renderedAtMs, fallbackLabel = "—", color }) {
  // SSR safe : start with server value, then sync to persisted on client mount.
  const [displayedEtaMs, setDisplayedEtaMs] = useState(() => Math.max(0, etaMsAtRender || 0));
  const lastServerEtaRef = useRef(etaMsAtRender);

  // On mount, prefer the localStorage value if it's recent
  useEffect(() => {
    const persisted = readPersistedEta();
    if (persisted != null) {
      setDisplayedEtaMs(persisted);
    }
  }, []);

  // Local tick : -1000ms every second + persist
  useEffect(() => {
    const t = setInterval(() => {
      setDisplayedEtaMs((prev) => {
        const next = Math.max(0, prev - 1000);
        writePersistedEta(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Server snapshot reconciliation — anti-bounce with growth-rate cap.
  // The ETA cannot grow faster than 1.5s per second of wall-clock time, so
  // a sudden "11 min" reveal lerps up gradually instead of slapping the user.
  // Faster-than-predicted snapshots are adopted instantly (good news).
  const lastSnapshotTsRef = useRef(Date.now());
  useEffect(() => {
    if (etaMsAtRender == null) return;
    if (etaMsAtRender === lastServerEtaRef.current) return;
    const now = Date.now();
    const sinceLastSnapshot = now - lastSnapshotTsRef.current;
    lastServerEtaRef.current = etaMsAtRender;
    lastSnapshotTsRef.current = now;

    setDisplayedEtaMs((prev) => {
      // Going down — adopt immediately if meaningfully faster
      if (etaMsAtRender < prev - 8000) {
        writePersistedEta(etaMsAtRender);
        return etaMsAtRender;
      }
      // Going up — cap growth so the display can't add more than 1.5s of ETA
      // per real-time second since the last snapshot. Volatile throughput
      // (GPT stalls) won't slap a 11 min reveal in the user's face.
      if (etaMsAtRender > prev) {
        const maxGrowthMs = sinceLastSnapshot * 1.5;
        const capped = Math.min(etaMsAtRender, prev + maxGrowthMs);
        writePersistedEta(capped);
        return capped;
      }
      return prev;
    });
  }, [etaMsAtRender]);

  if (displayedEtaMs <= 0) {
    return <span style={{ color: "var(--sage)" }}>{fallbackLabel}</span>;
  }
  return (
    <span suppressHydrationWarning style={{ color: color || "var(--accent)" }}>
      {formatDuration(displayedEtaMs)}
    </span>
  );
}
