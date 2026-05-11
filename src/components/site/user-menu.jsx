"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function UserMenu({ label, isAdmin, signOutAction }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          letterSpacing: "0.04em",
          color: "var(--fg)",
          background: open ? "var(--surface)" : "transparent",
          border: "1px solid var(--rule)",
          cursor: "pointer",
          transition: "background .15s ease",
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 220,
            background: "var(--bg)",
            border: "1px solid var(--rule-strong)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
          }}
        >
          <MenuLink href="/profile" onClick={() => setOpen(false)}>
            Profile
          </MenuLink>
          <MenuLink href="/submit" onClick={() => setOpen(false)}>
            Submit a skill
          </MenuLink>
          {isAdmin && (
            <MenuLink href="/admin" onClick={() => setOpen(false)} accent>
              Admin console
            </MenuLink>
          )}
          <div style={{ height: 1, background: "var(--rule)" }} />
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.06em",
                color: "var(--fg-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              className="vz-menu-item"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, onClick, accent, children }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      style={{
        padding: "12px 16px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        color: accent ? "var(--accent)" : "var(--fg)",
        textDecoration: "none",
      }}
      className="vz-menu-item"
    >
      {children}
    </Link>
  );
}
