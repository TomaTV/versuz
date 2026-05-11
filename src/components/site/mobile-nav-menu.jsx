"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Hamburger menu for the mobile nav. Visible only ≤ 1024px (CSS-controlled).
 * Hosts both the primary nav links AND the user cluster (profile, settings,
 * earnings, admin, sign out) so the top bar stays uncluttered on mobile.
 *
 * Auto-closes on route change + Escape, locks scroll while open.
 */
export function MobileNavMenu({ links, userActions = [], signOutAction = null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target only available client-side after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // iOS-safe scroll lock : `overflow:hidden` on body doesn't actually lock
  // scroll on iOS Safari. The reliable trick is to position:fixed the body
  // at the negative current scrollY, then restore it on close. Otherwise
  // mobile users get jarring scroll-to-top jumps.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    const prevOverflow = document.body.style.overflow;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="vz-mobile-menu-btn"
        style={{
          display: "none",
          width: 40,
          height: 40,
          padding: 0,
          border: "1px solid var(--rule-strong)",
          background: "transparent",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg)",
          position: "relative",
          zIndex: 61,
        }}
      >
        <span style={{ position: "relative", width: 18, height: 12, display: "inline-block" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: open ? 5 : 0,
              height: 2,
              background: "currentColor",
              transform: open ? "rotate(45deg)" : "none",
              transition: "transform .2s ease, top .2s ease",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 5,
              height: 2,
              background: "currentColor",
              opacity: open ? 0 : 1,
              transition: "opacity .15s ease",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: open ? 5 : 10,
              height: 2,
              background: "currentColor",
              transform: open ? "rotate(-45deg)" : "none",
              transition: "transform .2s ease, top .2s ease",
            }}
          />
        </span>
      </button>

      {/* Drawer rendered via portal to document.body to escape the
          sticky header's stacking context. Without the portal, z-index 60
          on the drawer is trapped INSIDE the header (z-index 50) and the
          page body content sits above it. */}
      {mounted && open &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
            style={{
              position: "fixed",
              top: 64,
              right: 0,
              bottom: 0,
              left: 0,
              background: "var(--bg)",
              zIndex: 9999,
              padding: "24px clamp(16px, 4.5vw, 32px) 48px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
              overflowY: "auto",
              boxShadow: "0 4px 24px -8px rgba(20,18,14,0.12)",
            }}
          >
            <DrawerSection label="Browse">
              {links.map((l) => (
                <DrawerLink key={l.id} href={l.href} pathname={pathname} label={l.label} />
              ))}
            </DrawerSection>

            {userActions.length > 0 && (
              <DrawerSection label="Account">
                {userActions.map((a) => (
                  <DrawerLink key={a.id} href={a.href} pathname={pathname} label={a.label} />
                ))}
                {signOutAction && (
                  <form action={signOutAction} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "18px 8px",
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        letterSpacing: "-0.02em",
                        color: "var(--crimson)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>Sign out</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg-muted)" }}>
                        ↗
                      </span>
                    </button>
                  </form>
                )}
              </DrawerSection>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function DrawerSection({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 8px 12px",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function DrawerLink({ href, label, pathname }) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 8px",
        borderBottom: "1px solid var(--rule)",
        fontFamily: "var(--font-display)",
        fontSize: 22,
        letterSpacing: "-0.02em",
        color: active ? "var(--accent)" : "var(--fg)",
        textDecoration: "none",
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg-muted)" }}>
        ↗
      </span>
    </Link>
  );
}
