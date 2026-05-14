"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/site/user-menu";
import { MobileNavMenu } from "@/components/site/mobile-nav-menu";
import { CmdKHint } from "@/components/site/cmd-k-hint";
import { signOut } from "@/lib/auth/actions";

// Client-side auth slot. Fetches /api/auth/me on mount so the surrounding
// layout/page can stay statically rendered (no cookies() call in the server
// tree → ISR works). Anonymous visitors see "Sign in" immediately; logged-in
// users see a brief flash before the user state hydrates — acceptable
// trade-off for cache HIT on the rest of the page.
export function NavAuthCluster({ links }) {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (!cancelled) setState({ loading: false, user: data.user || null });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { user } = state;
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
      <span className="vz-nav-user-cluster" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <UserMenu
            label={user.login ? `@${user.login}` : user.email || "Profile"}
            isAdmin={user.isAdmin}
            signOutAction={signOut}
          />
        ) : (
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
        )}
        <Link
          href="/submit"
          className="vz-nav-submit-ember"
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
