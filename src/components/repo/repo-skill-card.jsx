"use client";

import Link from "next/link";

export function RepoSkillCard({ item, rank, kind = "skill" }) {
  const href = kind === "skill" 
    ? `/skills/${item.slug}`
    : `/claude-md/${item.project_category || "generic"}/${item.slug}`;
  const label = kind === "skill" ? "View skill →" : "View file →";

  return (
    <div
      onMouseEnter={(e) => {
        const link = e.currentTarget.querySelector('a');
        if (link) {
          link.style.background = "var(--accent)";
          link.style.borderColor = "var(--accent)";
        }
      }}
      onMouseLeave={(e) => {
        const link = e.currentTarget.querySelector('a');
        if (link) {
          link.style.background = "var(--fg)";
          link.style.borderColor = "var(--fg)";
        }
      }}
    >
      <Link
        href={href}
        style={{
          padding: "8px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--bg)",
          background: "var(--fg)",
          border: "1px solid var(--fg)",
          textDecoration: "none",
          borderRadius: 4,
          whiteSpace: "nowrap",
          transition: "background .15s ease, color .15s ease, border-color .15s ease",
          display: "inline-block",
        }}
      >
        {label}
      </Link>
    </div>
  );
}
