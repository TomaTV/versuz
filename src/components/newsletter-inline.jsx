/**
 * NewsletterInline — compact email-capture block for high-engagement
 * pages (/achievements, /blog, /best/{kind}/{cat}).
 *
 * Posts to the existing /api/subscribe endpoint (mig 0010 subscribers
 * table) via a native form action — no client JS required. The redirect
 * lands on /subscribe/success which the user can navigate back from.
 * Wave 1 utility : convert organic visitors who landed via socials into
 * a retention list before they bounce.
 *
 * Server component. Pass `source` for analytics segmentation
 * (defaults to "inline").
 */
export function NewsletterInline({
  source = "inline",
  title = "Weekly digest",
  body = "Top achievements, climbers, and what shipped — every Friday. No spam.",
  ctaLabel = "Subscribe",
}) {
  return (
    <form
      action="/api/subscribe"
      method="POST"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 22px",
        border: "1px solid var(--rule-strong, var(--rule))",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--accent)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-geist)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--fg-muted)",
          }}
        >
          {body}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* Honeypot — same convention as /api/subscribe */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
          aria-hidden
        />
        <input type="hidden" name="source" value={source} />
        <label style={{ flex: "1 1 220px" }}>
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="you@domain.com"
            maxLength={320}
            autoComplete="email"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-geist)",
              fontSize: 14,
              color: "var(--fg)",
              background: "var(--bg)",
              border: "1px solid var(--rule)",
              outline: "none",
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {ctaLabel} →
        </button>
      </div>
    </form>
  );
}
