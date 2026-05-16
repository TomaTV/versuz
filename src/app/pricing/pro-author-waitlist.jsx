"use client";

import { useState } from "react";

/**
 * ProAuthorWaitlist — email capture for the upcoming Pro Author tier
 * ($9/mo). Validates intent before we build Stripe Subscriptions +
 * migration 0054. POST /api/pro-author/waitlist writes to `subscribers`
 * with source='pro-author-waitlist'.
 */
export function ProAuthorWaitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | ok | error
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/pro-author/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        setStatus("error");
        setError(body.error || "Could not record. Try again.");
        return;
      }
      setStatus("ok");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Network error");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
        aria-hidden
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          required
          maxLength={320}
          autoComplete="email"
          disabled={status === "submitting" || status === "ok"}
          style={{
            flex: "1 1 220px",
            padding: "12px 14px",
            fontFamily: "var(--font-geist)",
            fontSize: 14,
            color: "var(--fg)",
            background: "var(--bg)",
            border: "1px solid var(--rule-strong, var(--rule))",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "submitting" || status === "ok"}
          style={{
            padding: "12px 22px",
            background: status === "ok" ? "var(--sage)" : "var(--accent)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor:
              status === "submitting" || status === "ok" ? "default" : "pointer",
            opacity: status === "submitting" ? 0.6 : 1,
            transition: "background 0.15s ease, opacity 0.15s ease",
          }}
        >
          {status === "ok" ? "✓ On the list" : status === "submitting" ? "…" : "Notify me →"}
        </button>
      </div>
      {status === "error" && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--crimson)",
            letterSpacing: "0.04em",
          }}
        >
          {error}
        </span>
      )}
      {status === "ok" && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--sage)",
            letterSpacing: "0.04em",
          }}
        >
          Saved. First 50 on the list get 3 months at $4.50 — we&apos;ll email
          when the tier opens.
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        First 50 signups : 3 months at $4.50 (50% off) when the tier ships.
      </span>
    </form>
  );
}
