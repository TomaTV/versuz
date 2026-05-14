"use client";

export default function RepoBundleError({ reset }) {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: "var(--font-sans)" }}>
      <p style={{ color: "var(--fg-muted)", marginBottom: 16 }}>Could not load this repository bundle.</p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "10px 18px",
          border: "1px solid var(--fg)",
          background: "var(--fg)",
          color: "var(--bg)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Retry
      </button>
    </div>
  );
}
