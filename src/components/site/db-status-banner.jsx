"use client";

import { useEffect, useState } from "react";

/**
 * Sticky banner en haut de page qui détecte une panne Supabase (free tier
 * saturé, Cloudflare 522, etc.) et l'indique clairement à l'utilisateur.
 *
 * Heuristique : ping `/api/stats` au mount. Si fail (timeout, error, 5xx)
 * → on affiche le banner. Si OK mais counts à 0 partout (impossible en
 * temps normal vu 100k items) → idem.
 *
 * Le banner est dismissable (sessionStorage) — au refresh suivant on
 * re-check Supabase, mais pas dans la même session si l'user a click "x".
 *
 * Mai 2026 : ajouté après que Supabase free tier soit saturé pendant
 * plusieurs heures, donnant l'impression que le site était cassé alors
 * qu'on servait juste du cache vide.
 */

const DISMISS_KEY = "vz-db-banner-dismissed";
const CHECK_INTERVAL = 60_000; // recheck toutes les 60s tant que down

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

    async function check() {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch("/api/stats", {
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (cancelled) return;
        if (!res.ok) {
          setState({ checked: true, healthy: false });
        } else {
          const data = await res.json();
          // Counts à 0 partout = signal probable d'un fetch failed silencieusement
          // (les caches retournent les fallbacks []). En temps normal Versuz a
          // ~100k items, donc 0 = anormal.
          const healthy = (data.skills || 0) > 0 || (data.claudeMds || 0) > 0;
          setState({ checked: true, healthy });
        }
      } catch {
        if (!cancelled) setState({ checked: true, healthy: false });
      } finally {
        if (!cancelled) timer = setTimeout(check, CHECK_INTERVAL);
      }
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
