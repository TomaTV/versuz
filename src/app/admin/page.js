import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminIndex() {
  const sb = createSupabaseAdminClient();
  const { stats, missingTables } = await loadStats(sb);

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 56,
          fontWeight: 400,
          letterSpacing: "-0.03em",
          color: "var(--fg)",
          margin: 0,
        }}
      >
        Overview
      </h1>

      {missingTables.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            border: "1px solid rgba(178,58,58,0.4)",
            background: "rgba(178,58,58,0.06)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: "var(--danger)", marginBottom: 6, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 11 }}>
            Migrations missing
          </div>
          Tables not found in DB: <code>{missingTables.join(", ")}</code>.
          Apply{" "}
          <code>0006_task_proposals.sql</code>,{" "}
          <code>0007_submit_rls.sql</code>,{" "}
          <code>0008_skills_github_url_drop_unique.sql</code>,{" "}
          <code>0009_widen_judge_models.sql</code>{" "}
          in the Supabase SQL editor (in order).
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 0,
          border: "1px solid var(--rule)",
        }}
      >
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              padding: "32px 28px",
              borderRight: i < stats.length - 1 ? "1px solid var(--rule)" : "none",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            className="vz-cat-card"
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
              {s.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 56,
                fontWeight: 400,
                color: s.color || "var(--fg)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
                lineHeight: 0.9,
              }}
            >
              {s.value}
            </span>
            {s.hint && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {s.hint}
              </span>
            )}
          </Link>
        ))}
      </div>

      <section
        style={{
          marginTop: 64,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
          lineHeight: 1.7,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 400,
            color: "var(--fg)",
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          Common actions
        </h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <Link href="/admin/task-proposals" className="vz-link">
              Review task proposals
            </Link>{" "}
            — approve or reject Gemini-drafted tasks before they hit the bench.
          </li>
          <li>
            <Link href="/admin/skills" className="vz-link">
              Skills registry
            </Link>{" "}
            — bump verification level, change tier, hide spam.
          </li>
          <li>
            <Link href="/admin/claude-md" className="vz-link">
              CLAUDE.md registry
            </Link>{" "}
            — same controls.
          </li>
        </ul>
      </section>
    </div>
  );
}

async function loadStats(sb) {
  const fallback = [
    { label: "Skills", value: "—", href: "/admin/skills" },
    { label: "CLAUDE.md", value: "—", href: "/admin/claude-md" },
    { label: "Pending proposals", value: "—", href: "/admin/task-proposals" },
    { label: "Live tasks", value: "—", href: "/admin/task-proposals" },
  ];
  if (!sb) return { stats: fallback, missingTables: [] };

  const tryCount = async (table, filter) => {
    let q = sb.from(table).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    return { count: count ?? 0, error };
  };

  const [skills, claudeMd, pending, tasks] = await Promise.all([
    tryCount("skills"),
    tryCount("claude_md_files"),
    tryCount("task_proposals", (q) => q.eq("status", "pending")),
    tryCount("tasks"),
  ]);

  const missingTables = [];
  if (pending.error?.message?.includes("does not exist") || pending.error?.code === "42P01") {
    missingTables.push("task_proposals");
  }
  if (tasks.error?.message?.includes("does not exist") || tasks.error?.code === "42P01") {
    missingTables.push("tasks");
  }

  return {
    stats: [
      { label: "Skills", value: skills.count, href: "/admin/skills" },
      { label: "CLAUDE.md", value: claudeMd.count, href: "/admin/claude-md" },
      {
        label: "Pending proposals",
        value: missingTables.includes("task_proposals") ? "—" : pending.count,
        href: "/admin/task-proposals",
        color: pending.count > 0 ? "var(--accent)" : undefined,
        hint: missingTables.includes("task_proposals")
          ? "table missing"
          : pending.count > 0
            ? "needs review"
            : "all clear",
      },
      {
        label: "Live tasks",
        value: missingTables.includes("tasks") ? "—" : tasks.count,
        href: "/admin/task-proposals",
      },
    ],
    missingTables,
  };
}
