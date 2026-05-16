"use client";

import { useEffect, useState } from "react";

/**
 * Sticky banner en haut de page qui détecte une panne Supabase (free tier
 * saturé, Cloudflare 522, etc.) et l'indique clairement à l'utilisateur.
 *
 * Heuristique : ping `/api/stats` au mount sauf si sessionStorage a un OK
 * récent. Si fail (timeout, error, 5xx) → on affiche le banner et on poll
 * jusqu'au rétablissement.
 *
 * Mai 2026 (v2) : ne ping plus à chaque pageload. Cache "healthy" en
 * sessionStorage pendant 1h pour les sessions multi-pages. Polling
 * 60s → 120s, et UNIQUEMENT pendant un état unhealthy. Healthy = silence.
 */

const DISMISS_KEY = "vz-db-banner-dismissed";
const HEALTH_KEY = "vz-db-health-ok";
const HEALTH_TTL_MS = 60 * 60 * 1000; // 1h — re-verify max 1×/heure
const RECOVERY_POLL_MS = 120_000; // 2min entre tentatives quand down
const FETCH_TIMEOUT_MS = 12_000; // 12s — Supabase Free peut lag sous charge
const RETRY_DELAY_MS = 4000; // 4s entre les 2 tentatives avant de banner
const MAX_CONSECUTIVE_FAILS = 2; // Require 2 fails before crying wolf

export function DbStatusBanner() {
  const [state, setState] = useState({ checked: false, healthy: true });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let consecutiveFails = 0;

    // Skip le ping si on a un OK récent en sessionStorage. Coupe ~80%
    // des hits /api/stats pour les sessions multi-pages.
    try {
      const cached = sessionStorage.getItem(HEALTH_KEY);
      if (cached) {
        const ts = Number(cached);
        if (Number.isFinite(ts) && Date.now() - ts < HEALTH_TTL_MS) {
          setState({ checked: true, healthy: true });
          return;
        }
      }
    } catch {}

    async function pingOnce() {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch("/api/stats", { signal: ctrl.signal });
        clearTimeout(t);
        if (cancelled) return { ok: false, transient: true };
        if (!res.ok) return { ok: false, transient: false };
        const data = await res.json();
        const healthy = (data.skills || 0) > 0 || (data.claudeMds || 0) > 0;
        return { ok: healthy, transient: false };
      } catch {
        return { ok: false, transient: true };
      }
    }

    async function check() {
      const result = await pingOnce();
      if (cancelled) return;

      if (result.ok) {
        consecutiveFails = 0;
        setState({ checked: true, healthy: true });
        try {
          sessionStorage.setItem(HEALTH_KEY, String(Date.now()));
        } catch {}
        return;
      }

      consecutiveFails += 1;
      if (consecutiveFails < MAX_CONSECUTIVE_FAILS) {
        // First failure could be a slow cold cache. Retry once after a
        // short delay before showing the scary banner to a fresh visitor.
        timer = setTimeout(check, RETRY_DELAY_MS);
        return;
      }
      // Threshold hit — surface the banner + keep polling slowly until recovery.
      setState({ checked: true, healthy: false });
      timer = setTimeout(check, RECOVERY_POLL_MS);
    }

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  if (!state.checked || state.healthy || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "var(--amber)",
        color: "var(--ink)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.04em",
        flexWrap: "wrap",
        textAlign: "center",
        borderBottom: "1px solid color-mix(in oklab, var(--ink) 20%, var(--amber))",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            background: "var(--ink)",
            borderRadius: "50%",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <strong style={{ fontWeight: 600 }}>Heavy traffic right now.</strong>
      </span>
      <span style={{ opacity: 0.85 }}>
        More people are hitting Versuz than our infra is sized for. Rankings
        will be back in a minute — hang tight.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "1px solid var(--ink)",
          color: "var(--ink)",
          padding: "2px 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Got it
      </button>
    </div>
  );
}
