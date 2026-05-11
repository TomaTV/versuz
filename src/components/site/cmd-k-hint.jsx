"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isMac = () =>
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

export function CmdKHint() {
  const mac = useSyncExternalStore(subscribe, isMac, () => false);

  const open = () => {
    const ev = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: !mac,
      metaKey: mac,
      bubbles: true,
    });
    window.dispatchEvent(ev);
  };

  return (
    <button
      type="button"
      onClick={open}
      title="Search (Cmd+K / Ctrl+K)"
      className="vz-cmdk-hint"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        border: "1px solid var(--rule)",
        background: "var(--surface)",
        color: "var(--fg-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        cursor: "pointer",
      }}
    >
      <span>Search</span>
      <kbd
        suppressHydrationWarning
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          padding: "2px 6px",
          border: "1px solid var(--rule)",
          background: "var(--bg)",
          color: "var(--fg)",
          letterSpacing: "0.06em",
        }}
      >
        {mac ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
