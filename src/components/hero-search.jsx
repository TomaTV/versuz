"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDERS = [
  "pdf extraction",
  "nextjs app router",
  "stripe payments",
  "react testing",
  "supabase migrations",
  "tailwind config",
  "claude code best practices",
  "cursor rules typescript",
];

/**
 * Inline search input in the hero — submits to /marketplace?q=<query>.
 * Replaces the "Browse N items" button as the primary CTA per UX feedback.
 * Submits on Enter or arrow click.
 *
 * Mobile (<560px) : placeholder court + bouton réduit à l'icône `→` (les
 * 13k skills + l'exemple long tronquaient sur iPhone 12 et le bouton
 * "Search" mangeait 35% du form).
 */
export function HeroSearch({ totalItems }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  // SSR renders PLACEHOLDERS[0] deterministically; we rotate to a random
  // pick only after hydration to avoid the server/client mismatch React
  // throws otherwise (Math.random() returns different values per render).
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    const mq = window.matchMedia("(max-width: 560px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function submit(e) {
    e?.preventDefault?.();
    const term = q.trim();
    if (!term) {
      router.push("/marketplace");
      return;
    }
    router.push(`/marketplace?q=${encodeURIComponent(term)}`);
  }

  const placeholderText = isMobile
    ? `Search ${totalItems > 0 ? totalItems.toLocaleString("en-US") + " " : ""}skills…`
    : `Search ${totalItems > 0 ? totalItems.toLocaleString("en-US") + " " : ""}skills · e.g. "${placeholder}"`;

  return (
    <form
      onSubmit={submit}
      role="search"
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        width: "100%",
        maxWidth: 560,
        border: "1px solid var(--rule-strong)",
        background: "var(--surface)",
        boxShadow: "inset 0 -2px 0 var(--rule)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "0 8px 0 12px" : "0 14px 0 18px",
          color: "var(--fg-muted)",
          fontSize: 16,
        }}
      >
        ⌕
      </span>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholderText}
        autoComplete="off"
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "16px 8px 16px 0",
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          color: "var(--fg)",
        }}
      />
      <button
        type="submit"
        aria-label="Search"
        className="vz-btn-primary"
        style={{
          background: "var(--accent)",
          color: "var(--bone)",
          padding: isMobile ? "0 14px" : "0 26px",
          minWidth: isMobile ? 44 : "auto",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          letterSpacing: "-0.005em",
          flexShrink: 0,
        }}
      >
        {!isMobile && <span>Search</span>}
        <span style={{ fontFamily: "var(--font-mono)" }}>→</span>
      </button>
    </form>
  );
}
