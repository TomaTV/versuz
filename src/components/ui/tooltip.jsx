"use client";

import { useState, useRef, useEffect, useId } from "react";

/**
 * Tooltip — accessible, mobile-friendly replacement for native title=.
 *
 * Why : native `title=` doesn't render on mobile (touch has no hover),
 * and the desktop popup is unstyled / browser-themed. Versuz' 4-badge
 * stack (tier / verification / quality / official) needs explanations
 * to be readable on a phone — that's where 51% of the traffic lives.
 *
 * Behavior :
 *   - Desktop : hover/focus shows the bubble.
 *   - Mobile : tap toggles the bubble, second tap closes it.
 *   - Esc / click-outside dismisses.
 *   - aria-describedby wires the bubble to the trigger for screen readers.
 *
 * Usage :
 *   <Tooltip label="Free — scraped from a public GitHub repo.">
 *     <TierBadge tier="free" />
 *   </Tooltip>
 *
 * The trigger element is wrapped in a span with role="button" + tabindex.
 * Pass cursor="help" via the child's existing style if you want that
 * affordance. This component doesn't override cursor.
 */
export function Tooltip({ label, children, placement = "top", maxWidth = 280 }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e) => {
      if (
        bubbleRef.current?.contains(e.target) ||
        triggerRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [open]);

  if (!label) return children;

  const bubble = open ? (
    <span
      ref={bubbleRef}
      id={id}
      role="tooltip"
      style={{
        position: "absolute",
        bottom: placement === "top" ? "calc(100% + 8px)" : undefined,
        top: placement === "bottom" ? "calc(100% + 8px)" : undefined,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        maxWidth,
        width: "max-content",
        padding: "8px 12px",
        fontFamily: "var(--font-geist)",
        fontSize: 12,
        lineHeight: 1.5,
        color: "var(--bone)",
        background: "var(--ink)",
        border: "1px solid var(--ink)",
        boxShadow: "0 6px 24px -8px color-mix(in oklab, var(--ink) 70%, transparent)",
        pointerEvents: "auto",
        letterSpacing: "0.01em",
        textAlign: "left",
        textTransform: "none",
        whiteSpace: "normal",
      }}
    >
      {label}
    </span>
  ) : null;

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      role="button"
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        // Mobile : tap toggles. Desktop hover already handles the show ;
        // the click just gives keyboards/touch users a way in.
        if (e.detail === 0) return; // synthetic, ignore
        setOpen((v) => !v);
      }}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        outline: "none",
      }}
    >
      {children}
      {bubble}
    </span>
  );
}
