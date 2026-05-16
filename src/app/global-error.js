"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root error boundary — catches errors in the root layout (the `<VzNav>`,
 * `<VzTicker>`, `<VzFooter>`). Must include its own <html> + <body> tags
 * because the root layout itself failed to render.
 *
 * Per Next 16 convention: app/global-error.js.
 */
export default function GlobalError({ error, reset }) {
    useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          background: "#f2eee6",
          color: "#14120e",
          fontFamily:
            "'Geist', 'Inter', system-ui, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
        }}
      >
        <div style={{ maxWidth: 720, position: "relative" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: -32,
              top: 8,
              width: 4,
              height: 120,
              background: "#c2410c",
            }}
          />
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              fontSize: 11,
              color: "#6b6557",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                background: "#b23a3a",
                marginRight: 12,
                verticalAlign: "middle",
              }}
            />
            Error · 500
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Instrument Serif', 'Times New Roman', serif",
              fontSize: "clamp(56px, 8vw, 120px)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            Something{" "}
            <em style={{ color: "#c2410c", fontStyle: "italic" }}>broke</em>.
          </h1>
          <p
            style={{
              margin: "24px 0 32px",
              fontFamily: "'Instrument Serif', serif",
              fontSize: 20,
              lineHeight: 1.5,
              color: "#6b6557",
              maxWidth: 560,
            }}
          >
            The page hit an unexpected error. We&apos;ve logged it. You can retry, or head
            back to the home page.
          </p>
          {error?.digest && (
            <p
              style={{
                margin: "0 0 32px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#6b6557",
                letterSpacing: "0.04em",
              }}
            >
              ref · {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#14120e",
                color: "#f2eee6",
                padding: "16px 24px",
                fontFamily: "'Geist', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry ↻
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the root layout, so <Link> can't be used here. */}
            <a
              href="/"
              style={{
                padding: "16px 24px",
                textDecoration: "none",
                fontFamily: "'Geist', sans-serif",
                fontSize: 14,
                color: "#14120e",
                border: "1px solid rgba(20, 18, 14, 0.24)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
