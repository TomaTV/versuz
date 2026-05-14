export function LegalPage({ title, subtitle, lastUpdated, children }) {
  return (
    <>
      <header style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Versuz · Legal
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "var(--fg)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 18,
              lineHeight: 1.5,
              color: "var(--fg-muted)",
              maxWidth: 720,
            }}
          >
            {subtitle}
          </p>
        )}
        {lastUpdated && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              marginTop: 4,
            }}
          >
            Last updated · {lastUpdated}
          </span>
        )}
      </header>
      <div className="vz-legal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
    </>
  );
}

export function LegalSection({ id, title, children }) {
  return (
    <section
      id={id}
      style={{
        paddingTop: 24,
        borderTop: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}
