"use client";

import { useSkillContext } from "@/components/skills/skill-user-gate";
import { CopyContentButton } from "@/components/copy-content-button";

/**
 * Premium-tier CLAUDE.md content block.
 *
 * En SSR : render le teaser paywalled (anonymous-safe → ISR-cacheable).
 * Après hydratation : si l'user est owned/authored, swap vers un download
 * button qui pointe vers la signed URL premium (TTL 7j).
 *
 * Permet à `/claude-md/[category]/[slug]/page.js` de NE PAS lire de cookies
 * au top-level, donc Next 16 peut servir le shell via ISR. Avant ce
 * refactor la page était dynamic à chaque hit (cause root du score Vercel
 * Speed Insights = 35 / Poor mai 2026).
 */
export function ClaudeMdPremiumContentBlock({
  slug,
  teaser,
  tokenCount,
  priceUsd,
}) {
  const ctx = useSkillContext({ slug, kind: "claude_md" });
  const isOwned = ctx?.isOwned ?? false;
  const isAuthored = ctx?.isAuthored ?? false;
  const downloadUrl = ctx?.premiumDownloadUrl ?? null;

  if ((isOwned || isAuthored) && downloadUrl) {
    return (
      <div
        style={{
          marginTop: 32,
          border: "1px solid var(--sage)",
          background: "color-mix(in oklab, var(--sage) 8%, transparent)",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--sage)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {isAuthored ? "◆ Yours" : "✓ Owned"} · download unlocked
        </div>
        <a
          href={downloadUrl}
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: "var(--fg)",
            color: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          Download CLAUDE.md
          <span style={{ fontFamily: "var(--font-mono)" }}>↓</span>
        </a>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--fg-muted)",
            lineHeight: 1.5,
          }}
        >
          Signed link valid for 7 days. Re-open this page anytime to refresh.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 32,
        border: "1px dashed var(--accent)",
        background: "var(--accent-soft)",
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--accent)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        🔒 Preview · paywalled
      </div>
      <pre
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.55,
          color: "var(--fg)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 200,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      >
        {teaser}
      </pre>
      <p
        style={{
          margin: "16px 0 0",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--fg-muted)",
          lineHeight: 1.5,
        }}
      >
        The full CLAUDE.md ({tokenCount} tokens) unlocks after purchase. Use{" "}
        <strong style={{ color: "var(--accent)" }}>Buy ${priceUsd}</strong> on
        the order page to checkout via Stripe.
      </p>
    </div>
  );
}

/**
 * Free-tier CLAUDE.md content : public-safe, render directement inline.
 * Pas de gating, mais reste un Client Component pour le `<details>` open
 * state (sinon SSR fait le bon job).
 *
 * En réalité c'est un pur composant présentationnel — kept here pour
 * symétrie avec le premium block.
 */
export function ClaudeMdFreeContentBlock({ content, tokenCount }) {
  return (
    <details
      style={{
        marginTop: 32,
        border: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
    >
      <summary
        style={{
          padding: "16px 24px",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
          userSelect: "none",
        }}
      >
        Show CLAUDE.md content (~{tokenCount} tokens)
      </summary>
      <div style={{ position: "relative" }}>
        <CopyContentButton text={content} label="Copy CLAUDE.md" />
        <pre
          style={{
            margin: 0,
            padding: 24,
            borderTop: "1px solid var(--rule)",
            maxHeight: 600,
            overflow: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--fg)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </pre>
      </div>
    </details>
  );
}
