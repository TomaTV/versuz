"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { track } from "@/lib/track";
import Link from "next/link";
import { UserMenu } from "@/components/site/user-menu";
import { MobileNavMenu } from "@/components/site/mobile-nav-menu";
import { CmdKHint } from "@/components/site/cmd-k-hint";
import { signOut } from "@/lib/auth/actions";

// useLayoutEffect on server logs a warning. Swap to useEffect at SSR
// (no DOM there anyway) and to useLayoutEffect on client.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// No-flash auth slot.
//
// Both the UserMenu and the Sign-in link are ALWAYS in the DOM. The inline
// script in <head> (see layout.js) reads `localStorage['vz-auth-cache']`
// synchronously BEFORE the body parses and sets `<html data-auth>` to
// "user" or "anon". CSS in globals.css uses `html[data-auth]` selectors
// to show exactly one of the two. Result : the right CTA paints on the
// very first frame, with zero JS-driven layout shift.
//
// After hydration, /api/auth/me re-verifies in the background. If the
// verified state differs from the cache, we update both the React state
// (relabels UserMenu) AND the data-auth attribute (re-toggles which one
// CSS shows).
const AUTH_CACHE_KEY = "vz-auth-cache";
const AUTH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function writeAuthCache(user) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
  } catch {}
}

function applyAuthAttr(user) {
  if (typeof document === "undefined") return;
  try {
    const d = document.documentElement;
    if (user) {
      d.dataset.auth = "user";
      d.dataset.authLabel = user.login ? `@${user.login}` : user.email || "";
      if (user.isAdmin) d.dataset.authAdmin = "1";
      else delete d.dataset.authAdmin;
    } else {
      d.dataset.auth = "anon";
      delete d.dataset.authLabel;
      delete d.dataset.authAdmin;
    }
  } catch {}
}

function readCachedUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.ts || Date.now() - parsed.ts > AUTH_CACHE_TTL_MS) return null;
    return parsed.user || null;
  } catch {
    return null;
  }
}

export function NavAuthCluster({ links }) {
  // SSR and client first hydration both start at `null` — this makes the
  // rendered HTML strictly match, no hydration error. The cache is read
  // in useLayoutEffect (commits before browser paints), so the label/admin
  // state updates BEFORE the user can see "Account". CSS already shows the
  // right slot via <html data-auth> set by the head script.
  const [user, setUser] = useState(null);

  // Sync layout effect : read localStorage and commit the cached user
  // before paint. This is the first commit after hydration ; React renders
  // synchronously so the browser only paints the final state.
  useIsomorphicLayoutEffect(() => {
    const cached = readCachedUser();
    if (cached) setUser(cached);
  }, []);

  // Background revalidation : after first paint, hit /api/auth/me to make
  // sure the cache isn't stale (logged out from another tab, session
  // expired, etc.).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const next = data.user || null;
        writeAuthCache(next);
        applyAuthAttr(next);
        setUser(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const userActions = user
    ? [
        { id: "profile", label: `@${user.login || user.email}`, href: "/profile" },
        { id: "settings", label: "Settings", href: "/profile/settings" },
        { id: "earnings", label: "Earnings", href: "/profile/earnings" },
        ...(user.isAdmin ? [{ id: "admin", label: "Admin", href: "/admin" }] : []),
        { id: "submit", label: "Submit", href: "/submit" },
      ]
    : [
        { id: "login", label: "Sign in", href: "/login" },
        { id: "submit", label: "Submit", href: "/submit" },
      ];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, justifySelf: "end" }}>
      <MobileNavMenu links={links} userActions={userActions} signOutAction={user ? signOut : null} />
      <CmdKHint />
      <span
        className="vz-nav-user-cluster"
        style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 100 }}
        suppressHydrationWarning
      >
        {/* Both children always rendered. CSS in globals.css :
            html[data-auth="user"] → shows .vz-auth-slot__user
            html[data-auth="anon"] → shows .vz-auth-slot__anon
            no data-auth (first-ever visit) → both hidden until /api/auth/me */}
        <span className="vz-auth-slot__user">
          <UserMenu
            label={user?.login ? `@${user.login}` : user?.email || "Account"}
            isAdmin={!!user?.isAdmin}
            signOutAction={signOut}
          />
        </span>
        <span className="vz-auth-slot__anon">
          <Link
            href="/login"
            className="vz-nav-signin-ink"
            style={{
              padding: "9px 18px",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              textDecoration: "none",
              background: "var(--ink)",
              color: "var(--bone)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: "-0.005em",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
              boxShadow: "0 0 0 1px var(--ink), inset 0 -2px 0 color-mix(in oklab, black 30%, transparent)",
            }}
          >
            Sign in
          </Link>
        </span>
        <Link
          href="/submit"
          className="vz-nav-submit-ember"
          onClick={() => track("cta_submit_click", { placement: "header" })}
          style={{
            padding: "9px 18px",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            textDecoration: "none",
            background: "var(--accent)",
            color: "var(--bone)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.005em",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            boxShadow: "0 0 0 1px var(--accent), inset 0 -2px 0 color-mix(in oklab, black 18%, transparent)",
          }}
        >
          <span className="vz-nav-submit-label">Submit a skill</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1 }}>→</span>
        </Link>
      </span>
    </div>
  );
}
