"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * HeroInstallStrip — compact `$ npx versuz` block in the landing hero.
 *
 * Why : the desktop CliDemo terminal on the right of the hero is hidden
 * on mobile (51% of traffic) because a black terminal block reads as
 * "for nerds only" for non-tech visitors and eats vertical space. But
 * without it, mobile visitors never learn the CLI exists until §07 —
 * past the typical scroll-out point.
 *
 * Solution : a one-line install snippet pinned right under the hero
 * search input, visible on every viewport, with a one-click copy button.
 * Tight 40px tall, mono font, ember accent on the command, no chrome.
 */
export function HeroInstallStrip() {
  const COMMAND = "npx versuz";
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        border: "1px solid var(--rule-strong, var(--rule))",
        background: "var(--ink)",
        color: "var(--bone)",
        maxWidth: 460,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      <span
        style={{
          padding: "10px 14px",
          color: "var(--accent)",
          opacity: 0.85,
          letterSpacing: "0.04em",
        }}
        aria-hidden
      >
        $
      </span>
      <code
        style={{
          flex: 1,
          padding: "10px 0",
          color: "var(--bone)",
          letterSpacing: "0.02em",
          fontFamily: "inherit",
          fontSize: 13,
        }}
      >
        {COMMAND}
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy npx versuz install command"
        style={{
          padding: "10px 16px",
          background: "transparent",
          border: "none",
          borderLeft: "1px solid color-mix(in oklab, var(--bone) 14%, transparent)",
          color: copied ? "var(--sage)" : "color-mix(in oklab, var(--bone) 80%, transparent)",
          fontFamily: "inherit",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "color 0.15s ease",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <Link
        href="/api-docs"
        prefetch={false}
        style={{
          padding: "10px 14px",
          background: "var(--accent)",
          color: "var(--bone)",
          border: "none",
          fontFamily: "inherit",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        CLI ↗
      </Link>
    </div>
  );
}
