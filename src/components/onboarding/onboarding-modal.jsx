"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * First-time-user modal shown on /profile. Auto-opens if localStorage
 * `versuz_onboarded_v1` is missing. Three short slides explaining what Versuz
 * is, how to earn, and what trust signals to look at.
 *
 * Persists dismissal in localStorage so it never re-shows. Bump the storage
 * key suffix (`_v2`, etc.) when you want to re-onboard everyone after a
 * meaningful product change.
 */

const STORAGE_KEY = "versuz_onboarded_v1";

const SLIDES = [
  {
    eyebrow: "01 — Browse",
    title: "A marketplace for AI-agent context",
    body: "400+ SKILL.md and CLAUDE.md files scraped from public GitHub repos, classified into 14 categories. Filter, search, and compare two side-by-side to pick the right context for your agent.",
    bullets: [
      "Quality score on every item (LLM-rated 0-100)",
      "Real Elo when bench engine has run it",
      "Top-N badges, verification levels, freshness",
    ],
    accent: "var(--accent)",
  },
  {
    eyebrow: "02 — Earn",
    title: "Submit your own. Get paid.",
    body: "Submit a SKILL.md or CLAUDE.md you authored — free or premium. Premium uses Stripe Connect with a 70/30 split (you keep 70%). Onboard once via /profile/settings, sales hit your account directly.",
    bullets: [
      "Free items = visibility + verified author badge",
      "Premium $X = revenue + private download + featured placement",
      "Boost any item for $4.99 / 30 days (top-of-grid)",
    ],
    accent: "var(--azure)",
  },
  {
    eyebrow: "03 — Trust",
    title: "Five layers of signal",
    body: "Versuz progressively verifies content so you can trust what you install. Start with a free public scrape, layer in author claim, manual review, and editorial featuring.",
    bullets: [
      "Quality score : LLM rates 5 axes (clarity, specificity, completeness…)",
      "Verification : claimed → verified → reviewed → featured",
      "Bench Elo : head-to-head LLM judging on real tasks",
    ],
    accent: "var(--sage)",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // SSR / disabled storage — no modal
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // best-effort
    }
  }, []);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && step < SLIDES.length - 1) setStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, close]);

  if (!mounted || !open) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(20, 14, 8, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "vz-onb-fadein 220ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--bg)",
          border: `1px solid ${slide.accent}`,
          padding: "36px 40px 28px",
          fontFamily: "var(--font-sans)",
          color: "var(--fg)",
          position: "relative",
          animation: "vz-onb-pop 260ms cubic-bezier(.2,.8,.3,1)",
        }}
      >
        {/* Close button (top-right) */}
        <button
          type="button"
          onClick={close}
          aria-label="Close onboarding"
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--rule-strong)",
            background: "var(--bg)",
            color: "var(--fg-muted)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Eyebrow + step indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: slide.accent,
            }}
          >
            § {slide.eyebrow}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
            }}
          >
            {step + 1} / {SLIDES.length}
          </span>
        </div>

        {/* Title */}
        <h2
          id="onboarding-title"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--fg)",
          }}
        >
          {slide.title}
        </h2>

        {/* Body */}
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--fg-muted)",
          }}
        >
          {slide.body}
        </p>

        {/* Bullets */}
        <ul
          style={{
            margin: "20px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {slide.bullets.map((b) => (
            <li
              key={b}
              style={{
                paddingLeft: 18,
                position: "relative",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--fg)",
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 6,
                  width: 6,
                  height: 6,
                  background: slide.accent,
                }}
              />
              {b}
            </li>
          ))}
        </ul>

        {/* Progress bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 28,
            marginBottom: 18,
          }}
        >
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 3,
                background: i <= step ? slide.accent : "var(--rule)",
                transition: "background .2s ease",
              }}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={close}
            style={{
              padding: "8px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <div style={{ display: "inline-flex", gap: 8 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "8px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--fg)",
                  background: "var(--bg)",
                  border: "1px solid var(--rule-strong)",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? close() : setStep(step + 1))}
              style={{
                padding: "8px 18px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--bg)",
                background: slide.accent,
                border: `1px solid ${slide.accent}`,
                cursor: "pointer",
              }}
            >
              {isLast ? "Got it ✓" : "Next →"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vz-onb-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vz-onb-pop {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
