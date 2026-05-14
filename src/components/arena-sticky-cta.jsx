"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NextCycleCountdown } from "@/components/next-cycle-countdown";

/**
 * Floating CTA — apparaît après ~600px de scroll, disparaît à l'approche
 * du footer (où §08 Enter contient déjà un CTA Submit). Pas affiché sur
 * /submit, /admin, /buy/*, /promote/*, /claim/*, /profile — uniquement
 * landing + pages de découverte (marketplace, leaderboard, skills/...).
 *
 * UX intent : matérialiser la deadline du prochain bench cycle pour
 * transformer "Submit a skill" passif en action urgente avec horloge.
 */
const HIDDEN_PATHS = ["/submit", "/admin", "/buy", "/promote", "/claim", "/profile", "/success"];

export function ArenaStickyCTA() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isHidden) return;
    function update() {
      const y = window.scrollY;
      const doc = document.documentElement;
      const distanceFromBottom = doc.scrollHeight - (y + window.innerHeight);
      setVisible(y > 600);
      setNearFooter(distanceFromBottom < 800);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isHidden]);

  if (isHidden) return null;

  const show = visible && !nearFooter;

  return (
    <div
      aria-hidden={!show}
      style={{
        position: "fixed",
        right: "clamp(16px, 3vw, 32px)",
        bottom: "clamp(16px, 3vw, 32px)",
        zIndex: 60,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        pointerEvents: show ? "auto" : "none",
        transition: "opacity .25s ease, transform .25s ease",
      }}
      className="vz-arena-sticky"
    >
      <Link
        href="/submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 18px 12px 16px",
          background: "var(--fg)",
          color: "var(--bg)",
          textDecoration: "none",
          border: "1px solid var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          boxShadow:
            "0 2px 0 var(--rule-strong), 0 12px 32px -8px color-mix(in oklab, var(--ink) 30%, transparent)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            width: 8,
            height: 8,
            background: "var(--accent)",
            boxShadow:
              "0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent)",
          }}
        />
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <span style={{ fontSize: 9, opacity: 0.6, letterSpacing: "0.18em" }}>
            <NextCycleCountdown variant="long" />
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              letterSpacing: "-0.01em",
              textTransform: "none",
            }}
          >
            Enter the Arena
            <span aria-hidden style={{ marginLeft: 6 }}>→</span>
          </span>
        </span>
      </Link>
    </div>
  );
}
