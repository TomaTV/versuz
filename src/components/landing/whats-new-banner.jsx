"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * WhatsNewBanner — sticky bottom-right card on landing that surfaces the
 * most recent unlock (Triple Crown / category winner / etc.) or a fresh
 * Featured pick. Auto-dismisses if the user has seen it this session
 * (sessionStorage). Hidden < 600px scroll so it doesn't compete with the
 * hero ; hidden above the footer so it doesn't overlap the existing CTAs.
 *
 * Renders nothing if there's no fresh event in the last 7 days.
 *
 * Wave 1 utility : the cron pushes a Triple Crown on Friday, this banner
 * fires Saturday morning when the social posts drive new visitors —
 * "look, the leaderboard is alive". Without it, returning visitors see
 * an unchanged landing.
 */

const STORAGE_KEY = "vz-whats-new-dismissed";
const DISMISS_TTL_MS = 24 * 3600 * 1000; // 24h — one fresh peek per day

export function WhatsNewBanner({ event }) {
  const [visible, setVisible] = useState(false);
  const [scrolledEnough, setScrolledEnough] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);

  useEffect(() => {
    if (!event) return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { ts, slug } = JSON.parse(raw);
        if (slug === event.slug && Date.now() - ts < DISMISS_TTL_MS) {
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [event]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolledEnough(y > 600);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setNearFooter(max - y < 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!event || !visible || !scrolledEnough || nearFooter) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ts: Date.now(), slug: event.slug })
      );
    } catch {
      /* ignore */
    }
  };

  const accent = event.color || "var(--accent)";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        maxWidth: 360,
        zIndex: 25,
        background: "var(--ink)",
        color: "var(--bone)",
        border: `1px solid ${accent}`,
        padding: "14px 16px",
        paddingRight: 40,
        boxShadow: "0 16px 40px -12px color-mix(in oklab, var(--ink) 60%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "var(--font-geist)",
        animation: "vz-whats-new-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
      className="vz-hide-mobile"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "transparent",
          border: "none",
          color: "color-mix(in oklab, var(--bone) 60%, transparent)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          cursor: "pointer",
          padding: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: accent,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {event.icon ? `${event.icon} ` : ""}
        {event.label}
      </span>
      <Link
        href={event.href}
        onClick={dismiss}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          letterSpacing: "-0.01em",
          color: "var(--bone)",
          textDecoration: "none",
          lineHeight: 1.25,
        }}
      >
        {event.name}
      </Link>
      {event.sub && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "color-mix(in oklab, var(--bone) 60%, transparent)",
            letterSpacing: "0.04em",
          }}
        >
          {event.sub}
        </span>
      )}
      <Link
        href={event.href}
        onClick={dismiss}
        style={{
          marginTop: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: accent,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          textDecoration: "underline",
          textUnderlineOffset: 4,
        }}
      >
        See it →
      </Link>
    </div>
  );
}
