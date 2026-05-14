import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Sparkline, BarChart, StackedBar, CHART_COLORS } from "@/components/admin/charts";
import { fetchBenchBudget } from "@/lib/admin/automation";

export const revalidate = 60;

export default async function AdminIndex() {
  const sb = createSupabaseAdminClient();
  const [{ stats, missingTables }, charts] = await Promise.all([
    loadStats(sb),
    loadCharts(sb),
  ]);

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

      <ChartsRow charts={charts} />

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

async function loadCharts(sb) {
  const empty = {
    itemsPerDay: Array(30).fill(0),
    costPerDay: Array(30).fill(0),
    dailyCap: 25 / 30,
    coverage: { raw: 0, quality: 0, benched: 0 },
    totals: { skills: 0, claudeMd: 0 },
  };
  if (!sb) return empty;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const sinceIso = since.toISOString();

  const [skillsCreated, claudeCreated, budget, qSkills, qClaude, bSkills, bClaude, tSkills, tClaude] =
    await Promise.all([
      sb
        .from("skills")
        .select("created_at")
        .gte("created_at", sinceIso)
        .limit(5000),
      sb
        .from("claude_md_files")
        .select("created_at")
        .gte("created_at", sinceIso)
        .limit(5000),
      fetchBenchBudget(sb),
      sb.from("skills").select("id", { count: "exact", head: true }).not("quality_score", "is", null),
      sb.from("claude_md_files").select("id", { count: "exact", head: true }).not("quality_score", "is", null),
      sb.from("rankings").select("subject_kind, skill_id, claude_md_id").not("avg_score", "is", null),
      Promise.resolve(null), // placeholder, rankings call covers both
      sb.from("skills").select("id", { count: "exact", head: true }),
      sb.from("claude_md_files").select("id", { count: "exact", head: true }),
    ]);

  // Items per day (last 30d)
  const dayKeys = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const itemsByDay = new Map(dayKeys.map((k) => [k, 0]));
  for (const r of skillsCreated.data || []) {
    const k = r.created_at?.slice(0, 10);
    if (itemsByDay.has(k)) itemsByDay.set(k, itemsByDay.get(k) + 1);
  }
  for (const r of claudeCreated.data || []) {
    const k = r.created_at?.slice(0, 10);
    if (itemsByDay.has(k)) itemsByDay.set(k, itemsByDay.get(k) + 1);
  }
  const itemsPerDay = dayKeys.map((k) => itemsByDay.get(k) || 0);

  // Cost per day (last 30d)
  const costByDay = new Map(dayKeys.map((k) => [k, 0]));
  for (const c of budget.cycles) {
    const k = c.started_at?.slice(0, 10);
    if (costByDay.has(k)) {
      costByDay.set(k, costByDay.get(k) + Number(c.actual_cost_usd || 0));
    }
  }
  const costPerDay = dayKeys.map((k) => costByDay.get(k) || 0);

  // Coverage donut : raw / quality (no bench) / benched
  const totalSkills = tSkills.count || 0;
  const totalClaude = tClaude.count || 0;
  const total = totalSkills + totalClaude;
  const qualityCount = (qSkills.count || 0) + (qClaude.count || 0);
  const benchedIds = new Set();
  for (const r of bSkills.data || []) {
    if (r.subject_kind === "skill" && r.skill_id) benchedIds.add(`s:${r.skill_id}`);
    if (r.subject_kind === "claude_md" && r.claude_md_id) benchedIds.add(`c:${r.claude_md_id}`);
  }
  const benched = benchedIds.size;
  const qualityOnly = Math.max(0, qualityCount - benched);
  const raw = Math.max(0, total - qualityOnly - benched);

  return {
    itemsPerDay,
    costPerDay,
    dailyCap: budget.cap / 30,
    coverage: { raw, quality: qualityOnly, benched },
    totals: { skills: totalSkills, claudeMd: totalClaude },
    spend30d: budget.spend,
    cap: budget.cap,
    itemsTotal: itemsPerDay.reduce((s, v) => s + v, 0),
  };
}

function ChartCard({ title, hint, children, height = 120 }) {
  return (
    <div
      style={{
        padding: "20px 22px",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          {title}
        </div>
        {hint && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg)",
              letterSpacing: "0.04em",
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div style={{ minHeight: height }}>{children}</div>
    </div>
  );
}

function ChartsRow({ charts }) {
  const totalItems = charts.totals.skills + charts.totals.claudeMd;
  const benchedPct = totalItems > 0 ? (charts.coverage.benched / totalItems) * 100 : 0;
  return (
    <section style={{ marginTop: 48 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 400,
          color: "var(--fg)",
          margin: "0 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        Coverage funnel
      </h2>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
          marginBottom: 16,
        }}
      >
        How much of the catalog is benched
      </div>
      <div
        style={{
          padding: "24px 28px",
          background: "var(--surface)",
          border: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                color: "var(--fg)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {totalItems.toLocaleString()}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              total items · {charts.totals.skills.toLocaleString()} skills + {charts.totals.claudeMd.toLocaleString()} claude_md
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                color: CHART_COLORS.ember,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {benchedPct < 0.01 ? "<0.01%" : `${benchedPct.toFixed(2)}%`}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              benched ({charts.coverage.benched} items)
            </div>
          </div>
        </div>
        <StackedBar
          height={24}
          segments={[
            { label: "Benched", value: charts.coverage.benched, color: CHART_COLORS.ember },
            { label: "Quality scored (not benched yet)", value: charts.coverage.quality, color: CHART_COLORS.blue },
            { label: "Raw (not yet scored)", value: charts.coverage.raw, color: "rgba(20,18,14,0.15)" },
          ]}
        />
      </div>

      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 400,
          color: "var(--fg)",
          margin: "48px 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        Activity · last 30 days
      </h2>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
          marginBottom: 16,
        }}
      >
        Items ingested · bench spend
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--rule)",
        border: "1px solid var(--rule)",
        }}
      >
        <ChartCard
          title="Items added per day"
          hint={`+${charts.itemsTotal} in 30d · ${(charts.itemsTotal / 30).toFixed(0)}/day avg`}
        >
          <Sparkline
            data={charts.itemsPerDay}
            color={CHART_COLORS.ember}
            height={120}
            emptyHint="No new items in 30 days · scrape just started"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--fg-muted)",
              letterSpacing: "0.1em",
            }}
          >
            <span>30 DAYS AGO</span>
            <span>TODAY</span>
          </div>
        </ChartCard>
        <ChartCard
          title="Bench spend per day"
          hint={`$${(charts.spend30d || 0).toFixed(2)} / $${charts.cap} cap`}
        >
          <BarChart
            data={charts.costPerDay}
            color={CHART_COLORS.ember}
            height={120}
            capLine={charts.dailyCap}
            emptyHint="No bench cycles yet · first runs daily 03:00 UTC"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--fg-muted)",
              letterSpacing: "0.1em",
            }}
          >
            <span>30 DAYS AGO</span>
            <span>DAILY CAP ${charts.dailyCap.toFixed(2)}</span>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
