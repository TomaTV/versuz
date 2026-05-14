import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { AutoRefreshRankings } from "@/components/admin/auto-refresh-rankings";
import { LiveElapsed, LiveEta } from "@/components/admin/live-chrono";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  retryErroredJobs,
  markCycleCompleted,
  refreshRankings,
  sweepStuckJobs,
  reopenPartialCycle,
} from "@/lib/admin/actions";

export const revalidate = 30;

async function loadCycles() {
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "supabase_admin_unavailable", cycles: [] };
  const { data: cycles, error } = await sb
    .from("cycles")
    .select("id, scope, status, started_at, completed_at, metadata")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) return { error: error.message, cycles: [] };

  // Aggregate job counts per cycle (single grouped query).
  const ids = (cycles || []).map((c) => c.id);
  let jobCounts = new Map();
  if (ids.length) {
    const { data: jobs } = await sb
      .from("run_jobs")
      .select("cycle_id, status")
      .in("cycle_id", ids);
    for (const j of jobs || []) {
      const key = `${j.cycle_id}:${j.status}`;
      jobCounts.set(key, (jobCounts.get(key) || 0) + 1);
    }
  }

  return {
    cycles: (cycles || []).map((c) => ({
      ...c,
      counts: {
        queued: jobCounts.get(`${c.id}:queued`) || 0,
        completed: jobCounts.get(`${c.id}:completed`) || 0,
        cached: jobCounts.get(`${c.id}:cached`) || 0,
        error: jobCounts.get(`${c.id}:error`) || 0,
      },
    })),
  };
}

async function loadFunnel() {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;

  // Pull bench ids first (cheap: only items that have judge_scores → ~50 rows today)
  const { data: benchedRows } = await sb
    .from("rankings")
    .select("subject_kind, skill_id, claude_md_id")
    .not("avg_score", "is", null);
  const benchedSkillIds = new Set();
  const benchedClaudeMdIds = new Set();
  for (const r of benchedRows || []) {
    if (r.subject_kind === "skill" && r.skill_id) benchedSkillIds.add(r.skill_id);
    if (r.subject_kind === "claude_md" && r.claude_md_id) benchedClaudeMdIds.add(r.claude_md_id);
  }
  const benched = benchedSkillIds.size + benchedClaudeMdIds.size;

  // Disjoint counts : raw / qualityOnly / benched are 3 NON-overlapping buckets.
  // Done per-table to keep queries cheap and per-kind coverage accurate.
  const [
    totalSkills,
    qualitySkills,
    benchedQualitySkills,
    totalClaudeMds,
    qualityClaudeMds,
    benchedQualityClaudeMds,
    pendingSkills,
    pendingClaudeMds,
  ] = await Promise.all([
    sb.from("skills").select("id", { count: "exact", head: true }),
    sb.from("skills").select("id", { count: "exact", head: true }).not("quality_score", "is", null),
    benchedSkillIds.size > 0
      ? sb.from("skills").select("id", { count: "exact", head: true })
          .not("quality_score", "is", null)
          .in("id", Array.from(benchedSkillIds))
      : Promise.resolve({ count: 0 }),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).not("quality_score", "is", null),
    benchedClaudeMdIds.size > 0
      ? sb.from("claude_md_files").select("id", { count: "exact", head: true })
          .not("quality_score", "is", null)
          .in("id", Array.from(benchedClaudeMdIds))
      : Promise.resolve({ count: 0 }),
    sb.from("skills").select("id", { count: "exact", head: true }).eq("bench_pending", true),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).eq("bench_pending", true),
  ]);

  const total = (totalSkills.count || 0) + (totalClaudeMds.count || 0);
  // qualityCount = items with quality_score (includes some that are also benched)
  const qualityCount = (qualitySkills.count || 0) + (qualityClaudeMds.count || 0);
  // qualityAndBenched = items in both buckets (quality + benched)
  const qualityAndBenched = (benchedQualitySkills.count || 0) + (benchedQualityClaudeMds.count || 0);
  // 3 disjoint buckets :
  //   benched   = total benched
  //   qualityOnly = quality but NOT benched
  //   raw       = neither
  const qualityOnly = Math.max(0, qualityCount - qualityAndBenched);
  const raw = Math.max(0, total - qualityOnly - benched);
  const pending = (pendingSkills.count || 0) + (pendingClaudeMds.count || 0);

  return {
    total,
    raw,
    qualityOnly,
    benched,
    pending,
    skills: { total: totalSkills.count || 0, benched: benchedSkillIds.size },
    claudeMds: { total: totalClaudeMds.count || 0, benched: benchedClaudeMdIds.size },
  };
}

async function loadRunningCycleProgress() {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;
  const { data: cycle } = await sb
    .from("cycles")
    .select("id, scope, started_at, status")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) return null;

  const { data: jobs } = await sb
    .from("run_jobs")
    .select("status, started_at, completed_at, output_id")
    .eq("cycle_id", cycle.id);

  const counts = { queued: 0, completed: 0, cached: 0, error: 0 };
  let durations = [];
  const outputIds = [];
  for (const j of jobs || []) {
    counts[j.status] = (counts[j.status] || 0) + 1;
    if (j.status === "completed" && j.started_at && j.completed_at) {
      durations.push(new Date(j.completed_at).getTime() - new Date(j.started_at).getTime());
    }
    if (j.output_id) outputIds.push(j.output_id);
  }
  const total = (counts.queued || 0) + (counts.completed || 0) + (counts.cached || 0) + (counts.error || 0);
  const done = (counts.completed || 0) + (counts.cached || 0);

  // Count pending judges. Two metrics :
  //   - pendingJudgeCalls : sum of (3 - scored_judges) across outputs — display only
  //   - pendingOutputs    : outputs with 0 or 1 judges (we consider an output "done"
  //                         once it has 2+/3 judges, since 1 chronic failure shouldn't
  //                         block the cycle ETA forever). Used for wall-time ETA.
  const JUDGES_PER_OUTPUT = 3;
  const MIN_JUDGES_TO_BE_DONE = 2; // tolerate 1 chronic judge failure per output
  let pendingJudgeCalls = 0;
  let pendingOutputs = 0;
  let stalledOutputs = 0;
  // perJudgeStats : model → { done, expected, pending }
  const perJudgeStats = new Map();
  if (outputIds.length > 0) {
    const { data: scoresByOutput } = await sb
      .from("judge_scores")
      .select("output_id, judge_model")
      .in("output_id", outputIds);
    const judgesPer = new Map();
    for (const r of scoresByOutput || []) {
      judgesPer.set(r.output_id, (judgesPer.get(r.output_id) || 0) + 1);
      const stats = perJudgeStats.get(r.judge_model) || { done: 0, expected: outputIds.length };
      stats.done += 1;
      perJudgeStats.set(r.judge_model, stats);
    }
    for (const oid of outputIds) {
      const scored = judgesPer.get(oid) || 0;
      const missing = Math.max(0, JUDGES_PER_OUTPUT - scored);
      pendingJudgeCalls += missing;
      if (scored < MIN_JUDGES_TO_BE_DONE) pendingOutputs += 1;
      else if (scored === MIN_JUDGES_TO_BE_DONE) stalledOutputs += 1;
    }
  }
  // Make sure all 3 expected judges show up even if they have 0 scores so far.
  // Pull from src/lib/judges.js PRESETS to stay in sync with the actual ensemble.
  const expectedJudgeModels = [
    "anthropic/claude-haiku-4-5",
    "deepseek/deepseek-v4-flash",
    "openai/gpt-5-mini",
  ];
  for (const m of expectedJudgeModels) {
    if (!perJudgeStats.has(m)) {
      perJudgeStats.set(m, { done: 0, expected: outputIds.length });
    } else {
      perJudgeStats.get(m).expected = outputIds.length;
    }
  }
  const judgeBreakdown = Array.from(perJudgeStats.entries()).map(([model, s]) => ({
    model,
    done: s.done,
    expected: s.expected,
    pending: Math.max(0, s.expected - s.done),
    pct: s.expected > 0 ? Math.round((s.done / s.expected) * 100) : 0,
  }));

  // Median agent job time (for display only)
  const medianMs = durations.length >= 5
    ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
    : 30_000;

  // ETA based on REAL throughput measured over the last 5 minutes.
  // Adapts naturally : GPT stalls → throughput drops → ETA grows.
  // No theoretical 6s-per-output guesswork.
  const FIVE_MIN_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentJudgeCount } = await sb
    .from("judge_scores")
    .select("id", { count: "exact", head: true })
    .gte("created_at", FIVE_MIN_AGO);
  const recentCompletedJobs = (jobs || []).filter(
    (j) =>
      j.status === "completed" &&
      j.completed_at &&
      new Date(j.completed_at).getTime() > Date.now() - 5 * 60 * 1000
  ).length;
  const judgesPerSec = (recentJudgeCount || 0) / 300;
  const jobsPerSec = recentCompletedJobs / 300;

  let etaMs;
  if (judgesPerSec > 0 || jobsPerSec > 0) {
    const agentEta = jobsPerSec > 0
      ? (counts.queued || 0) / jobsPerSec
      : (counts.queued || 0) * (medianMs / 1000);
    const judgeEta = judgesPerSec > 0
      ? pendingJudgeCalls / judgesPerSec
      : pendingOutputs * 6;
    etaMs = (agentEta + judgeEta) * 1000;
  } else {
    // No throughput measured (cold start) → theoretical fallback
    etaMs = (counts.queued || 0) * medianMs + pendingOutputs * 6000;
  }

  // Elapsed since cycle started
  const elapsedMs = cycle.started_at
    ? Date.now() - new Date(cycle.started_at).getTime()
    : 0;

  // Phase label : if no queued left but judges pending → "judging", else "agenting"
  let phase = "agenting";
  if (counts.queued === 0 && pendingJudgeCalls > 0) phase = "judging";
  if (counts.queued === 0 && pendingJudgeCalls === 0) phase = "finalizing";

  // OVERALL progress = (agent calls done + judge calls done) / (expected total)
  // Agent expected = total run_jobs
  // Judge expected = output_ids × 3 judges
  const agentDone = done; // completed + cached
  const agentTotal = total;
  const judgeDone = (perJudgeStats.size > 0)
    ? Array.from(perJudgeStats.values()).reduce((s, v) => s + v.done, 0)
    : 0;
  const judgeTotal = outputIds.length * JUDGES_PER_OUTPUT;
  const totalLlmCalls = agentTotal + judgeTotal;
  const totalLlmDone = agentDone + judgeDone;
  const overallPct = totalLlmCalls > 0 ? Math.round((totalLlmDone / totalLlmCalls) * 100) : 0;

  return {
    cycle,
    counts,
    total,
    done,
    progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
    overallPct,
    totalLlmCalls,
    totalLlmDone,
    agentDone,
    agentTotal,
    judgeDone,
    judgeTotal,
    judgeBreakdown,
    medianSecPerJob: Math.round(medianMs / 1000),
    etaMs,
    elapsedMs,
    pendingJudgeCalls,
    stalledOutputs,
    phase,
  };
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  // Under 10 min, show min:ss so changes are visible between auto-refreshes.
  if (s < 600) {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${String(rs).padStart(2, "0")}`;
  }
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

async function loadJudgeStats() {
  const sb = createSupabaseAdminClient();
  if (!sb) return [];
  const { data } = await sb
    .from("judge_scores")
    .select("judge_model, score");
  const grouped = new Map();
  for (const s of data || []) {
    const acc = grouped.get(s.judge_model) || { count: 0, sum: 0, scores: [] };
    const score = Number(s.score) || 0;
    acc.count += 1;
    acc.sum += score;
    acc.scores.push(score);
    grouped.set(s.judge_model, acc);
  }
  // Filter out obsolete models no longer in active ensemble
  const OBSOLETE_MODELS = new Set(["deepseek/deepseek-chat"]);
  return Array.from(grouped.entries())
    .filter(([model]) => !OBSOLETE_MODELS.has(model))
    .map(([model, { count, sum, scores }]) => {
      // 10-bucket histogram (0-9, 10-19, ..., 90-100)
      const histogram = Array(10).fill(0);
      for (const s of scores) {
        const idx = Math.min(9, Math.max(0, Math.floor(s / 10)));
        histogram[idx]++;
      }
      const sorted = [...scores].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      const min = sorted[0] || 0;
      const max = sorted[sorted.length - 1] || 0;
      return {
        model,
        count,
        avg: count > 0 ? sum / count : 0,
        median,
        min,
        max,
        histogram,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export default async function AdminCyclesPage() {
  const [{ cycles, error }, judgeStats, funnel, running] = await Promise.all([
    loadCycles(),
    loadJudgeStats(),
    loadFunnel(),
    loadRunningCycleProgress(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Auto-refresh every 15s when a cycle is running, every 60s otherwise. */}
      <AutoRefresh intervalMs={running ? 15000 : 60000} />
      {/* Auto-call refresh_rankings RPC every 30s while admin is on this page
          (Vercel cron handles it every 5 min in prod ; this is the dev parity
          + active-monitoring boost). */}
      <AutoRefreshRankings intervalMs={30000} />
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            color: "var(--fg)",
            margin: 0,
          }}
        >
          Bench cycles
        </h1>
        <form action={refreshRankings}>
          <SubmitButton>Refresh rankings RPC →</SubmitButton>
        </form>
      </header>

      {/* § 00 — Funnel : catalog coverage */}
      {funnel && (
        <Section title="§ 00 — Catalog funnel" markerColor="var(--amber)">
          <FunnelGrid funnel={funnel} />
        </Section>
      )}

      {/* § 00b — Running cycle progress + ETA */}
      {running && (
        <Section title="§ 00b — Running cycle" markerColor="var(--accent)">
          <RunningCycleCard data={running} />
        </Section>
      )}

      {error && (
        <div
          style={{
            padding: "16px 20px",
            border: "1px solid var(--crimson)",
            background: "var(--surface)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--crimson)",
          }}
        >
          {error}
        </div>
      )}

      <Section title="§ 01 — Cycles (last 20)" markerColor="var(--accent)">
        {cycles.length === 0 ? (
          <Empty>No cycles. Run <code>npm run bench:enqueue</code>.</Empty>
        ) : (
          <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
            {cycles.map((c) => (
              <CycleRow key={c.id} cycle={c} />
            ))}
          </div>
        )}
      </Section>

      <Section title="§ 02 — Judge stats (lifetime)" markerColor="var(--azure)">
        {judgeStats.length === 0 ? (
          <Empty>No scores yet.</Empty>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(judgeStats.length, 3)}, 1fr)`,
              gap: 16,
            }}
          >
            {judgeStats.map((s) => (
              <JudgeStatCard key={s.model} stat={s} />
            ))}
          </div>
        )}
      </Section>

      <Section title="§ 03 — Maintenance" markerColor="var(--sage)">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          Sweep run_jobs that have been queued more than N hours back to
          error so the next bench run skips them. Use after a `npm run bench`
          crash that left jobs hanging.
        </p>
        <form action={sweepStuckJobs} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            Hours threshold
            <input
              type="number"
              name="hours"
              defaultValue="24"
              min="1"
              max="720"
              style={{
                marginLeft: 8,
                padding: "8px 10px",
                border: "1px solid var(--rule)",
                background: "var(--bg)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg)",
                width: 80,
              }}
            />
          </label>
          <SubmitButton>Sweep stuck jobs →</SubmitButton>
        </form>
      </Section>
    </div>
  );
}

function FunnelGrid({ funnel }) {
  // Reorder : pipeline flow left→right (Raw → Quality → Benched), Pending separate.
  const flow = [
    { key: "raw", label: "Raw", value: funnel.raw, color: "var(--crimson)" },
    { key: "quality", label: "Quality", value: funnel.qualityOnly, color: "var(--amber)" },
    { key: "benched", label: "Benched", value: funnel.benched, color: "var(--sage)" },
  ];
  const flowTotal = flow.reduce((s, x) => s + x.value, 0) || 1;
  const skillsBenchedPct = funnel.skills.total > 0 ? (funnel.skills.benched / funnel.skills.total) * 100 : 0;
  const claudeMdsBenchedPct = funnel.claudeMds.total > 0 ? (funnel.claudeMds.benched / funnel.claudeMds.total) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Big number + per-kind breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--rule-strong)",
          background: "var(--surface)",
        }}
      >
        <div style={{ padding: "20px 24px", borderRight: "1px solid var(--rule)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
            Total catalog
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--fg)", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {funnel.total.toLocaleString("en-US")}
          </div>
        </div>
        <KindCoverage label="Skills" total={funnel.skills.total} benched={funnel.skills.benched} pct={skillsBenchedPct} />
        <KindCoverage label="CLAUDE.md" total={funnel.claudeMds.total} benched={funnel.claudeMds.benched} pct={claudeMdsBenchedPct} last />
      </div>

      {/* Big stacked funnel bar with inline labels */}
      <div>
        <div
          style={{
            display: "flex",
            height: 56,
            border: "1px solid var(--rule-strong)",
            background: "var(--bg)",
            overflow: "hidden",
          }}
        >
          {flow.map((s, i) => {
            const pct = (s.value / flowTotal) * 100;
            const minPct = 0.5; // tiny visible sliver
            const widthPct = Math.max(minPct, pct);
            return (
              <div
                key={s.key}
                style={{
                  width: `${widthPct}%`,
                  background: s.color,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "0 14px",
                  borderRight: i < flow.length - 1 ? "1px solid var(--bg)" : "none",
                  minWidth: 80,
                  color: "var(--bg)",
                  overflow: "hidden",
                }}
                title={`${s.label}: ${s.value.toLocaleString("en-US")} (${pct.toFixed(1)}%)`}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    opacity: 0.9,
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                    fontWeight: 500,
                  }}
                >
                  {s.value.toLocaleString("en-US")}
                  <span style={{ fontSize: 11, opacity: 0.75, marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          <span>← scraped</span>
          <span>quality cron picks up →</span>
          <span>bench runner judges →</span>
        </div>
      </div>

      {/* Separate pending callout — these are the priority items */}
      {funnel.pending > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            border: "1px solid var(--azure)",
            background: "color-mix(in oklab, var(--azure) 6%, var(--bg))",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          <span style={{ width: 8, height: 8, background: "var(--azure)", borderRadius: "50%" }} />
          <span style={{ color: "var(--fg)" }}>
            <strong style={{ fontWeight: 500 }}>{funnel.pending.toLocaleString("en-US")}</strong> items en{" "}
            <span style={{ color: "var(--azure)" }}>priority queue</span>
          </span>
          <span style={{ marginLeft: "auto", color: "var(--fg-muted)", fontSize: 10, letterSpacing: "0.06em" }}>
            bench_pending=true → judged en premier au prochain cycle
          </span>
        </div>
      )}
    </div>
  );
}

function KindCoverage({ label, total, benched, pct, last }) {
  return (
    <div style={{ padding: "20px 24px", borderRight: last ? "none" : "1px solid var(--rule)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--fg)", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {benched.toLocaleString("en-US")}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>
          / {total.toLocaleString("en-US")} benched
        </span>
      </div>
      {/* Mini progress line */}
      <div style={{ marginTop: 10, height: 4, background: "var(--rule)", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            background: pct >= 75 ? "var(--sage)" : pct >= 25 ? "var(--amber)" : "var(--crimson)",
          }}
        />
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(1)}% coverage
      </div>
    </div>
  );
}

function JudgeStatCard({ stat }) {
  const max = Math.max(1, ...stat.histogram);
  const judgeColor =
    stat.model.includes("haiku") || stat.model.includes("claude")
      ? "var(--accent)"
      : stat.model.includes("deepseek")
        ? "var(--azure)"
        : stat.model.includes("gpt")
          ? "var(--sage)"
          : "var(--amber)";

  return (
    <div
      style={{
        padding: "20px 24px",
        border: "1px solid var(--rule)",
        borderLeft: `3px solid ${judgeColor}`,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>
          {stat.model}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>
          {stat.count.toLocaleString("en-US")} scores
        </span>
      </div>

      {/* Big avg */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 44, color: "var(--fg)", fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {stat.avg.toFixed(1)}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>
          <span>avg · median {stat.median}</span>
          <span>range {stat.min}–{stat.max}</span>
        </div>
      </div>

      {/* Histogram SVG */}
      <div>
        <svg viewBox="0 0 200 60" style={{ width: "100%", height: 60, display: "block" }} preserveAspectRatio="none">
          {stat.histogram.map((count, i) => {
            const h = (count / max) * 55;
            const x = i * 20;
            return (
              <rect
                key={i}
                x={x + 1}
                y={60 - h - 5}
                width={18}
                height={h}
                fill={judgeColor}
                opacity={count === 0 ? 0.15 : 0.85}
              >
                <title>{`${i * 10}-${i * 10 + 9}: ${count} scores`}</title>
              </rect>
            );
          })}
          {/* Baseline */}
          <line x1="0" y1="55" x2="200" y2="55" stroke="var(--rule-strong)" strokeWidth="0.5" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-muted)", letterSpacing: "0.04em", marginTop: 2 }}>
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

function IconClock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8L10.5 9.5" strokeLinecap="round" />
    </svg>
  );
}

function IconHourglass({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 2h8M4 14h8" strokeLinecap="round" />
      <path d="M4 2v2.5l4 3.5 4-3.5V2M4 14v-2.5l4-3.5 4 3.5V14" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhase({ phase, size = 14 }) {
  // gear/spinner-like icon for agenting, gavel for judging, check-circle for finalizing
  if (phase === "judging") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M2 14h12M5 11l3-3 3 3" strokeLinecap="round" />
        <path d="M9.5 4.5l2 2L8 10 6 8z" strokeLinejoin="round" />
        <path d="M11 3l2 2" strokeLinecap="round" />
      </svg>
    );
  }
  if (phase === "finalizing") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M5 8.5l2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // agenting / default = spinning arrow
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M13.5 4A6 6 0 1 0 14 8.5" strokeLinecap="round" />
      <path d="M13.5 1.5V4H11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveDot({ color = "var(--accent)" }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 2px color-mix(in oklab, ${color} 30%, transparent)`,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

function RunningCycleCard({ data }) {
  const {
    cycle, counts, total, done, progressPct,
    overallPct, totalLlmCalls, totalLlmDone,
    agentDone, agentTotal, judgeDone, judgeTotal, judgeBreakdown,
    medianSecPerJob, etaMs, elapsedMs, pendingJudgeCalls, stalledOutputs, phase,
  } = data;
  const renderedAtMs = Date.now();
  return (
    <div
      style={{
        border: "1px solid var(--accent)",
        padding: "20px 24px",
        background: "color-mix(in oklab, var(--accent) 4%, var(--bg))",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            color: "var(--fg)",
            fontStyle: "italic",
          }}
        >
          Cycle #{cycle.id} · <em style={{ color: "var(--accent)" }}>{cycle.scope}</em>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {totalLlmDone.toLocaleString("en-US")} / {totalLlmCalls.toLocaleString("en-US")} LLM calls · {overallPct}%
        </span>
      </div>

      {/* Overall progress bar : combines agent + judge */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 14,
            background: "var(--rule)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${overallPct}%`,
              background: "var(--accent)",
              transition: "width 0.4s ease",
            }}
            title={`${totalLlmDone} / ${totalLlmCalls} LLM calls (agent + judges)`}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-muted)", letterSpacing: "0.06em" }}>
          <span>0%</span>
          <span>{overallPct}% overall</span>
          <span>100%</span>
        </div>
      </div>

      {/* Two-phase split : agent (left) + judges (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          padding: "14px 0",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {/* Agent phase */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Agent · DeepSeek V3
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: agentDone === agentTotal ? "var(--sage)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
              {agentDone} / {agentTotal}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--rule)" }}>
            <div
              style={{
                width: agentTotal > 0 ? `${(agentDone / agentTotal) * 100}%` : "0%",
                height: "100%",
                background: agentDone === agentTotal ? "var(--sage)" : "var(--amber)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)" }}>
            {counts.completed} completed · {counts.cached} cached · {counts.queued} queued · {counts.error} errors · median {medianSecPerJob}s
          </span>
        </div>

        {/* Judge phase */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Judges · 3-LLM ensemble
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: judgeDone === judgeTotal && judgeTotal > 0 ? "var(--sage)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
              {judgeDone} / {judgeTotal}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--rule)" }}>
            <div
              style={{
                width: judgeTotal > 0 ? `${(judgeDone / judgeTotal) * 100}%` : "0%",
                height: "100%",
                background: judgeDone === judgeTotal && judgeTotal > 0 ? "var(--sage)" : "var(--azure)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)" }}>
            {pendingJudgeCalls} pending calls · {stalledOutputs} stalled (2/3 judges)
          </span>
        </div>
      </div>

      {/* Per-judge breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Per-judge progress
        </span>
        {judgeBreakdown.map((j) => {
          const judgeColor = j.model.includes("haiku") ? "var(--accent)" : j.model.includes("deepseek") ? "var(--azure)" : "var(--sage)";
          const displayName = j.model.split("/").pop().replace(/^claude-/, "");
          return (
            <div
              key={j.model}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px, auto) 1fr 80px",
                alignItems: "center",
                gap: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg)" }}>
                <span aria-hidden style={{ width: 8, height: 8, background: judgeColor, flexShrink: 0 }} />
                {displayName}
              </span>
              <div style={{ height: 5, background: "var(--rule)", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${j.pct}%`,
                    background: judgeColor,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span style={{ textAlign: "right", color: j.pending === 0 && j.expected > 0 ? "var(--sage)" : "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
                {j.done} / {j.expected}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
          paddingTop: 10,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconClock /> Elapsed&nbsp;:&nbsp;
          <span style={{ color: "var(--fg)" }}>
            <LiveElapsed startedAtIso={cycle.started_at} />
          </span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <IconHourglass /> ETA remaining&nbsp;:&nbsp;
          <LiveEta
            etaMsAtRender={etaMs}
            renderedAtMs={renderedAtMs}
            fallbackLabel={phase === "finalizing" ? "almost done" : "—"}
          />
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>
          <IconPhase phase={phase} />
          <span style={{ color: "var(--fg)" }}>{phase}</span>
          {pendingJudgeCalls > 0 && (
            <span style={{ color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "none" }}>
              {pendingJudgeCalls} judge calls left
            </span>
          )}
          {stalledOutputs > 0 && (
            <span
              style={{ color: "var(--crimson)", letterSpacing: "0.04em", textTransform: "none" }}
              title="Outputs with 2/3 judges scored — 1 judge likely failed parse retries. Cycle won't wait for these."
            >
              · {stalledOutputs} stalled
            </span>
          )}
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--fg-muted)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <LiveDot /> live · auto-refresh 15s
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: "var(--fg-muted)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color, fontVariantNumeric: "tabular-nums", fontSize: 18, fontFamily: "var(--font-display)" }}>
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </span>
    </div>
  );
}

function CycleRow({ cycle }) {
  const total =
    cycle.counts.queued + cycle.counts.completed + cycle.counts.cached + cycle.counts.error;
  const isRunning = cycle.status === "running" || cycle.status === "queued";
  const allDone =
    total > 0 && cycle.counts.queued === 0 && cycle.counts.error === 0;
  const statusColor =
    cycle.status === "completed"
      ? "var(--sage)"
      : cycle.status === "failed"
        ? "var(--crimson)"
        : cycle.status === "partial"
          ? "var(--amber)"
          : isRunning
            ? "var(--amber)"
            : "var(--fg-muted)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 24,
        alignItems: "start",
        padding: "20px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 80 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            color: "var(--fg)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          #{cycle.id}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: statusColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {cycle.status}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        >
          {cycle.scope}
        </span>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          <Counter label="completed" value={cycle.counts.completed} color="var(--sage)" />
          <Counter label="cached" value={cycle.counts.cached} color="var(--azure)" />
          <Counter label="queued" value={cycle.counts.queued} color="var(--amber)" />
          <Counter label="error" value={cycle.counts.error} color="var(--crimson)" />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          started{" "}
          <span suppressHydrationWarning>
            {cycle.started_at ? new Date(cycle.started_at).toUTCString().slice(5, 22) : "—"}
          </span>
          {cycle.completed_at && (
            <>
              {" · completed "}
              <span suppressHydrationWarning>
                {new Date(cycle.completed_at).toUTCString().slice(5, 22)}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cycle.status === "partial" && (
          <form action={reopenPartialCycle}>
            <input type="hidden" name="cycle_id" value={cycle.id} />
            <SubmitButton small primary>
              Continue cycle →
            </SubmitButton>
          </form>
        )}
        {cycle.counts.error > 0 && (
          <form action={retryErroredJobs}>
            <input type="hidden" name="cycle_id" value={cycle.id} />
            <SubmitButton small>Retry {cycle.counts.error} errored →</SubmitButton>
          </form>
        )}
        {cycle.status !== "completed" && cycle.status !== "partial" && allDone && (
          <form action={markCycleCompleted}>
            <input type="hidden" name="cycle_id" value={cycle.id} />
            <SubmitButton small primary>
              Mark completed →
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

function Counter({ label, value, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        opacity: value === 0 ? 0.4 : 1,
      }}
    >
      <span style={{ color, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}</span>
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
    </span>
  );
}

function Section({ title, markerColor, children }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span aria-hidden style={{ width: 12, height: 12, background: markerColor }} />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        border: "1px solid var(--rule)",
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg-muted)",
        letterSpacing: "0.04em",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function SubmitButton({ children, primary = false, small = false }) {
  return (
    <button
      type="submit"
      style={{
        padding: small ? "8px 14px" : "12px 18px",
        border: primary ? "1px solid var(--accent)" : "1px solid var(--rule-strong)",
        background: primary ? "var(--accent)" : "transparent",
        color: primary ? "var(--bg)" : "var(--fg)",
        fontFamily: "var(--font-sans)",
        fontSize: small ? 12 : 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
