"use client";

import Link from "next/link";
import { useSkillContext } from "./skill-user-gate";
import { track } from "@/lib/track";

/**
 * Native promo slot user-aware. Anciennement Server Component dans
 * page.js, migré Client mai 2026 pour permettre à /skills/[slug] d'être
 * ISR-cacheable sans cookies au top-level.
 *
 *   - Authors → Boost CTA (link to /promote/{kind}/<slug>)
 *   - Visitors → "Got something better ?" → /submit
 */
export function PromoteSkillSlot({ slug, kind = "skill", skillName }) {
  const ctx = useSkillContext({ slug, kind });
  const isAuthored = ctx?.isAuthored ?? false;

  if (isAuthored) {
    const promoteKind = kind === "claude_md" ? "claude-md" : "skill";
    return (
      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 24px",
            border: "1px solid var(--accent)",
            background: "color-mix(in oklab, var(--accent) 6%, var(--surface))",
            flexWrap: "wrap",
            marginTop: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              You authored this skill
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
              }}
            >
              Boost <em style={{ color: "var(--accent)" }}>{skillName}</em> to
              the top of its category for{" "}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}>
                $4.99 / 30 days
              </span>
            </span>
          </div>
          <Link
            href={`/promote/${promoteKind}/${encodeURIComponent(slug)}`}
            onClick={() => track("cta_boost_click", { placement: "detail", slug, kind })}
            style={{
              padding: "12px 20px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--bg)",
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
          >
            Boost this skill →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "0 clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 24px",
          border: "1px solid var(--rule)",
          background: "var(--surface)",
          flexWrap: "wrap",
          marginTop: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Got something better ?
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              color: "var(--fg)",
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}
          >
            Submit your skill — it enters{" "}
            <em style={{ color: "var(--accent)" }}>tomorrow&apos;s cycle</em>.
            No fee.
          </span>
        </div>
        <Link
          href="/submit"
          onClick={() => track("cta_submit_click", { placement: "detail-visitor", slug, kind })}
          style={{
            padding: "12px 20px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--bg)",
            background: "var(--fg)",
            border: "1px solid var(--fg)",
            textDecoration: "none",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          Submit yours →
        </Link>
      </div>
    </section>
  );
}
