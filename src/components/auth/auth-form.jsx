"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Shared form for /login and /register. Server actions for both paths,
 * plus a GitHub OAuth button (the primary path for devs).
 */
export function AuthForm({
  kind = "signin",
  action,
  oauthAction,
  initialError = null,
  switchHref,
  switchLabel,
}) {
  const [error, setError] = useState(initialError);
  const [pending, startTransition] = useTransition();
  const params = useSearchParams();
  const nextUrl = params?.get("next") || "";

  function onSubmit(formData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  function onGitHub() {
    setError(null);
    startTransition(async () => {
      // Pass next URL via FormData so the action can persist it in a cookie
      // for the OAuth round-trip.
      const fd = new FormData();
      if (nextUrl) fd.set("next", nextUrl);
      const result = await oauthAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        background: "var(--surface)",
        padding: "32px 32px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 480,
      }}
    >
      <button
        type="button"
        onClick={onGitHub}
        disabled={pending}
        style={{
          padding: "14px 18px",
          background: "var(--fg)",
          color: "var(--bg)",
          border: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 500,
          cursor: pending ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: pending ? 0.6 : 1,
        }}
      >
        Continue with GitHub <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: "4px 0",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--rule)" }} aria-hidden />
        or
        <span style={{ flex: 1, height: 1, background: "var(--rule)" }} aria-hidden />
      </div>

      <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@somewhere.dev"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete={kind === "signup" ? "new-password" : "current-password"}
          placeholder={kind === "signup" ? "min. 8 characters" : "your password"}
        />

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--accent)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "14px 18px",
            background: "transparent",
            border: "1px solid var(--rule-strong)",
            color: "var(--fg)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            transition: "background .2s ease, border-color .2s ease",
          }}
          className="vz-btn-ghost-outline"
        >
          {pending
            ? "…"
            : kind === "signup"
              ? "Create account with email"
              : "Sign in with email"}
        </button>
      </form>

      <Link
        href={switchHref}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          textDecoration: "none",
          textAlign: "center",
        }}
        className="vz-link"
      >
        {switchLabel} <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </Link>
    </div>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <input
        {...inputProps}
        style={{
          padding: "12px 14px",
          border: "1px solid var(--rule)",
          background: "var(--bg)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--fg)",
          outline: "none",
          transition: "border-color .15s ease",
        }}
      />
    </label>
  );
}
