"use client";

/**
 * Kebab menu for profile items. 3-dot trigger → dropdown with Edit / Boost /
 * Delete. Built on native <details>/<summary> for zero JS state, but the
 * outside-click + ESC close need useEffect, so this is a client component.
 *
 * Props :
 *   editHref     — /profile/items/<kind>/<slug>
 *   promoteHref  — /promote/<kind>/<slug>
 *   kind         — "skill" | "claude_md"
 *   slug         — item slug
 *   isFeatured   — show a "★ Featured" lock instead of Boost link
 *   deleteAction — server action for delete (formData{kind,slug})
 */

import { useEffect, useRef } from "react";
import Link from "next/link";

export function ItemMenu({ editHref, promoteHref, kind, slug, isFeatured, deleteAction }) {
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) ref.current.removeAttribute("open");
    };
    const onKey = (e) => {
      if (e.key === "Escape" && ref.current) ref.current.removeAttribute("open");
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details
      ref={ref}
      style={{ position: "relative", display: "inline-block" }}
      className="vz-item-menu"
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "6px 10px",
          border: "1px solid var(--rule-strong)",
          background: "var(--bg)",
          color: "var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          lineHeight: 1,
          userSelect: "none",
        }}
        aria-label="Item actions"
      >
        ⋯
      </summary>
      <div
        role="menu"
        style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 6px)",
          minWidth: 180,
          background: "var(--bg)",
          border: "1px solid var(--rule-strong)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          boxShadow: "0 8px 24px -8px rgba(20,18,14,0.18)",
        }}
      >
        <Link
          href={editHref}
          role="menuitem"
          style={{
            padding: "10px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.06em",
            color: "var(--fg)",
            textDecoration: "none",
          }}
          className="vz-menu-item"
        >
          Edit
        </Link>
        {isFeatured ? (
          <span
            style={{
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "var(--accent)",
              fontWeight: 500,
            }}
            title="This item is curated by Versuz — boost is not available for featured items."
          >
            ★ Featured
          </span>
        ) : (
          <Link
            href={promoteHref}
            role="menuitem"
            style={{
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "var(--amber)",
              textDecoration: "none",
            }}
            className="vz-menu-item"
          >
            ◆ Boost
          </Link>
        )}
        <div style={{ height: 1, background: "var(--rule)" }} />
        <form action={deleteAction} style={{ display: "block" }}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            role="menuitem"
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "var(--crimson)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            className="vz-menu-item"
            onClick={(e) => {
              if (!confirm(`Delete "${slug}" permanently? This can't be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </button>
        </form>
      </div>
    </details>
  );
}
