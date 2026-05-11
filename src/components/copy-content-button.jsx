"use client";

import { useState } from "react";

/**
 * Copy-to-clipboard button. Used inside the SKILL.md / CLAUDE.md content
 * `<details>` panel on detail pages. Sits absolute top-right inside the
 * `<pre>` so it's always reachable while scrolling the content.
 */
export function CopyContentButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can fail in non-secure contexts — silently no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 2,
        padding: "6px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: copied ? "var(--bg)" : "var(--fg)",
        background: copied ? "var(--sage)" : "var(--bg)",
        border: `1px solid ${copied ? "var(--sage)" : "var(--rule-strong)"}`,
        cursor: "pointer",
        transition: "background .15s ease, color .15s ease, border-color .15s ease",
      }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}
