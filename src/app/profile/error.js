"use client";

export default function ProfileError({ error, reset }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 64px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 56,
          fontWeight: 400,
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        Profile <em style={{ color: "var(--accent)" }}>unreachable</em>.
      </h1>
      <p
        style={{
          marginTop: 24,
          fontFamily: "var(--font-display)",
          fontSize: 20,
          lineHeight: 1.4,
          color: "var(--fg-muted)",
        }}
      >
        {error?.message || "Something went wrong loading your profile."}
      </p>
      <button
        onClick={() => reset()}
        className="vz-btn-ghost"
        style={{ marginTop: 32, cursor: "pointer" }}
      >
        Retry <span style={{ fontFamily: "var(--font-mono)" }}>↻</span>
      </button>
    </div>
  );
}
