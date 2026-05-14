"use client";

import { useEffect, useState } from "react";

/**
 * Shows a short banner when the user lands on `/?subscribed=ok` after
 * submitting the footer subscribe form. Auto-dismisses after 6s.
 * The query param is cleaned from the URL so refresh doesn't re-show.
 */
export function SubscribeToast() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const s = url.searchParams.get("subscribed");
    const m = url.searchParams.get("msg");
    if (!s) return;

    setStatus(s);
    setMsg(m || (s === "ok" ? "Subscribed — check your inbox." : "Subscription failed."));
    setShow(true);

    // Clean the URL so a refresh doesn't re-show
    url.searchParams.delete("subscribed");
    url.searchParams.delete("msg");
    window.history.replaceState({}, "", url.toString());

    const timeout = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(timeout);
  }, []);

  if (!show) return null;
  const isOk = status === "ok";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 1000,
        padding: "14px 22px",
        background: isOk ? "var(--ink)" : "var(--danger, #b23a3a)",
        color: "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        boxShadow: "0 8px 24px rgba(20,18,14,0.18)",
        border: `1px solid ${isOk ? "var(--accent)" : "rgba(255,255,255,0.2)"}`,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: 6,
          background: isOk ? "var(--accent)" : "#fff",
          marginRight: 10,
          verticalAlign: "middle",
        }}
      />
      {msg}
    </div>
  );
}
