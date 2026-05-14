import Link from "next/link";

/**
 * Prominent link to `/repo/[owner]/[repo]` when several Versuz rows share one GitHub repo.
 */
export function RepoBundleCallout({ href, owner, repo, total, compact = false }) {
  if (!href || !owner || !repo || total < 2) return null;

  const pad = compact ? "14px 18px" : "18px 22px";
  const titleSize = compact ? 17 : 22;

  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: compact ? 12 : 18,
        padding: pad,
        border: "2px solid var(--accent)",
        background: "var(--accent-soft)",
        textDecoration: "none",
        color: "var(--fg)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 8, minWidth: 0, flex: "1 1 220px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: compact ? 9 : 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          Repo bundle on Versuz
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: titleSize,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            wordBreak: "break-word",
          }}
        >
          {owner}/{repo}
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: compact ? 12 : 13,
            lineHeight: 1.45,
            color: "var(--fg-muted)",
            maxWidth: 560,
          }}
        >
          {total} indexed entries (SKILL.md and CLAUDE.md) from this repository — open the full bundle view.
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 11 : 12,
          letterSpacing: "0.08em",
          color: "var(--accent)",
          whiteSpace: "nowrap",
          flexShrink: 0,
          padding: compact ? "8px 0 0" : "4px 0",
        }}
      >
        Open bundle →
      </span>
    </Link>
  );
}
