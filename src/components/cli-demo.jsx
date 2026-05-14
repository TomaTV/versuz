"use client";

import { useEffect, useState } from "react";

/**
 * CliDemo — small terminal mockup that types out a Versuz CLI workflow,
 * line by line. Uses React state + setTimeout for reliable staggered reveal
 * (CSS-only stagger was fragile with Next.js hot reload + framer-motion wrappers).
 */

const LINES = [
  { kind: "prompt", text: "npx versuz search pdf", delay: 200 },
  { kind: "output", text: "→ 47 results · document", delay: 700 },
  { kind: "prompt", text: "npx versuz install pdf-generator", delay: 1200 },
  { kind: "success", text: "✓ Wrote .claude/skills/pdf-generator/SKILL.md", delay: 1900 },
];

export function CliDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    const timers = LINES.map((line, idx) =>
      setTimeout(() => {
        setVisibleCount((prev) => Math.max(prev, idx + 1));
      }, line.delay)
    );
    // Cursor starts blinking after the last line appears
    const cursorTimer = setTimeout(
      () => setCursorVisible(true),
      LINES[LINES.length - 1].delay + 500
    );
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(cursorTimer);
    };
  }, []);

  return (
    <div
      className="vz-cli-demo"
      aria-hidden
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.55,
        background: "var(--ink)",
        color: "var(--bone)",
        padding: "16px 18px",
        border: "1px solid color-mix(in oklab, var(--ink) 80%, var(--accent))",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, var(--accent) 15%, transparent), 0 24px 60px -32px color-mix(in oklab, var(--ink) 70%, transparent)",
        maxWidth: 440,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Window chrome — 3 dots top-left */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: "1px solid color-mix(in oklab, var(--bone) 12%, transparent)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)" }} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            opacity: 0.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          versuz · cli
        </span>
      </div>

      {/* Reserve vertical space so the panel doesn't jump while lines reveal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 96 }}>
        {LINES.map((line, idx) => {
          const visible = idx < visibleCount;
          return (
            <div
              key={idx}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                color:
                  line.kind === "output"
                    ? "color-mix(in oklab, var(--bone) 70%, transparent)"
                    : line.kind === "success"
                      ? "var(--sage)"
                      : "var(--bone)",
              }}
            >
              {line.kind === "prompt" && (
                <span style={{ color: "var(--accent)", marginRight: 8 }}>$</span>
              )}
              <span>{line.text}</span>
              {idx === LINES.length - 1 && cursorVisible && (
                <span className="vz-cli-cursor-blink" style={{ marginLeft: 4 }}>
                  _
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
