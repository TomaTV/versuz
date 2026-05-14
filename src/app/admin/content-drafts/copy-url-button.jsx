"use client";

import { useState } from "react";

export function CopyUrlButton({ url, label = "Copy URL" }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: "8px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: copied ? "var(--bg)" : "var(--fg)",
        background: copied ? "var(--accent)" : "var(--bg)",
        border: copied ? "1px solid var(--accent)" : "1px solid var(--rule)",
        cursor: "pointer",
        letterSpacing: "0.04em",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}
