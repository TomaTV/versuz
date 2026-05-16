"use client";

import { useState } from "react";

const SCALES = [
  { value: "", label: "Skill count — pick one" },
  { value: "1-5", label: "1-5 skills" },
  { value: "5-25", label: "5-25 skills" },
  { value: "25-100", label: "25-100 skills" },
  { value: "100+", label: "100+ skills" },
];

const USE_CASES = [
  { value: "", label: "Use case — pick one" },
  { value: "internal-dev", label: "Internal dev tools" },
  { value: "procurement", label: "AI procurement / vendor eval" },
  { value: "research", label: "Research" },
  { value: "compliance", label: "Compliance / QA" },
  { value: "other", label: "Something else" },
];

export function EnterpriseContactForm() {
  const [status, setStatus] = useState("idle"); // idle | submitting | ok | error
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/enterprise/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        setStatus("error");
        setError(body.error || "Could not send. Try emailing contact@flukxstudio.fr.");
        return;
      }
      setStatus("ok");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err.message || "Network error");
    }
  };

  if (status === "ok") {
    return (
      <div
        style={{
          padding: "28px 28px",
          border: "1px solid var(--sage)",
          background: "color-mix(in oklab, var(--sage) 6%, transparent)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 760,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--sage)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          ✓ Received
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 22,
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        >
          Got it. The founder reads every enterprise inquiry and replies within
          one business day.
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          Need to add context? Reply to the confirmation thread or email
          contact@flukxstudio.fr.
        </p>
      </div>
    );
  }

  const inputBase = {
    width: "100%",
    padding: "12px 14px",
    fontFamily: "var(--font-geist)",
    fontSize: 14,
    color: "var(--fg)",
    background: "var(--bg)",
    border: "1px solid var(--rule)",
    outline: "none",
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        maxWidth: 820,
      }}
    >
      {/* Honeypot — hidden from real users, bots fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
        aria-hidden
      />

      <FormField label="Email" required>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={320}
          placeholder="you@company.com"
          style={inputBase}
          disabled={status === "submitting"}
        />
      </FormField>

      <FormField label="Name">
        <input
          type="text"
          name="name"
          autoComplete="name"
          maxLength={120}
          placeholder="Jordan Lee"
          style={inputBase}
          disabled={status === "submitting"}
        />
      </FormField>

      <FormField label="Company">
        <input
          type="text"
          name="company"
          autoComplete="organization"
          maxLength={120}
          placeholder="Acme Corp"
          style={inputBase}
          disabled={status === "submitting"}
        />
      </FormField>

      <FormField label="Use case">
        <select
          name="useCase"
          style={inputBase}
          disabled={status === "submitting"}
          defaultValue=""
        >
          {USE_CASES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Scale">
        <select
          name="scale"
          style={inputBase}
          disabled={status === "submitting"}
          defaultValue=""
        >
          {SCALES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FormField>

      <div style={{ gridColumn: "1 / -1" }}>
        <FormField label="Anything else (optional)">
          <textarea
            name="message"
            rows={4}
            maxLength={5000}
            placeholder="Constraints, timeline, what's pushing you to look right now…"
            style={{ ...inputBase, resize: "vertical", minHeight: 80 }}
            disabled={status === "submitting"}
          />
        </FormField>
      </div>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            padding: "12px 24px",
            background: "var(--fg)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: status === "submitting" ? "wait" : "pointer",
            opacity: status === "submitting" ? 0.6 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          {status === "submitting" ? "Sending…" : "Send →"}
        </button>
        {status === "error" && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--crimson)",
              letterSpacing: "0.04em",
            }}
          >
            {error}
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
          No tracking, no list rental. Just one human reading.
        </span>
      </div>
    </form>
  );
}

function FormField({ label, required, children }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--fg-muted)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      <span>
        {label}
        {required && <span style={{ color: "var(--accent)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}
