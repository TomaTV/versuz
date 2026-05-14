"use client";

import { useState, useSyncExternalStore } from "react";

// Snippet URL = the prod base (versuz.dev / NEXT_PUBLIC_SITE_URL) so creators
// copy-paste something that works for the public README.
// Preview URL = the current origin, so the <img> resolves on localhost too.
const PROD_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

const subscribeOrigin = () => () => {};
const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : PROD_BASE;

export function EmbedBadgeBlock({ kind, slug, name }) {
  const previewBase = useSyncExternalStore(subscribeOrigin, getOrigin, () => PROD_BASE);

  const badgeUrl = `${PROD_BASE}/badge/${kind}/${slug}`;
  const detailUrl = `${PROD_BASE}/${kind === "claude-md" ? "claude-md" : "skills"}/${slug}`;
  const previewBadgeUrl = `${previewBase}/badge/${kind}/${slug}`;
  const markdown = `[![Versuz · ${name}](${badgeUrl})](${detailUrl})`;
  const html = `<a href="${detailUrl}"><img src="${badgeUrl}" alt="Versuz · ${name}" /></a>`;

  const [tab, setTab] = useState("markdown");
  const [copied, setCopied] = useState(false);
  const snippet =
    tab === "markdown" ? markdown : tab === "html" ? html : badgeUrl;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        background: "var(--surface)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Embed badge
        </span>
        <div
          style={{
            display: "flex",
            gap: 0,
            border: "1px solid var(--rule)",
            background: "var(--bg)",
          }}
        >
          {["markdown", "html", "url"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "4px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: tab === t ? "var(--fg)" : "transparent",
                color: tab === t ? "var(--bg)" : "var(--fg-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Preview — fixed aspect ratio frame so the SVG never overflows. */}
      <a
        href={`/${kind === "claude-md" ? "claude-md" : "skills"}/${slug}`}
        style={{
          alignSelf: "flex-start",
          display: "inline-block",
          lineHeight: 0,
          border: "1px solid var(--rule)",
          background: "var(--bg)",
          padding: 4,
          maxWidth: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewBadgeUrl}
          alt={`Versuz · ${name}`}
          width={360}
          height={64}
          style={{
            display: "block",
            width: 360,
            height: "auto",
            maxWidth: "100%",
            aspectRatio: "360 / 64",
          }}
        />
      </a>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          alignItems: "stretch",
        }}
        className="vz-embed-snippet"
      >
        <code
          style={{
            margin: 0,
            padding: "10px 12px",
            border: "1px solid var(--rule)",
            background: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg)",
            overflowX: "auto",
            whiteSpace: "nowrap",
            display: "block",
            minWidth: 0,
          }}
        >
          {snippet}
        </code>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: "0 16px",
            border: "1px solid var(--rule-strong)",
            background: copied ? "var(--accent)" : "var(--fg)",
            color: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "background .15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
