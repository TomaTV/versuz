import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, SectionHeader } from "@/components/section";
import { getSkillBySlug } from "@/lib/queries/rankings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { displayJudgeModel } from "@/lib/judges";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) return { title: "Skill not found — Versuz" };
  return {
    title: `${skill.name} · runs — Versuz`,
    description: `Audit trail of bench cycles for ${skill.name}. Each run shows the task, the agent output, and per-judge scores.`,
  };
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

async function loadRuns(sb, skillId) {
  if (!sb || !skillId) return [];
  const { data, error } = await sb
    .from("run_jobs")
    .select(
      "id, status, output_id, completed_at, error_message, cycle_id, task_id, attempts"
    )
    .eq("skill_id", skillId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error || !data) return [];

  const taskIds = [...new Set(data.map((j) => j.task_id))];
  const outputIds = [...new Set(data.map((j) => j.output_id).filter(Boolean))];

  const [tasksRes, outputsRes, scoresRes] = await Promise.all([
    taskIds.length
      ? sb.from("tasks").select("id, title, slug").in("id", taskIds)
      : Promise.resolve({ data: [] }),
    outputsRes2(sb, outputIds),
    outputIds.length
      ? sb
          .from("judge_scores")
          .select("output_id, judge_model, score, rationale")
          .in("output_id", outputIds)
      : Promise.resolve({ data: [] }),
  ]);
  const tasksById = new Map((tasksRes.data || []).map((t) => [t.id, t]));
  const outputsById = new Map((outputsRes.data || []).map((o) => [o.id, o]));
  const scoresByOutput = new Map();
  for (const s of scoresRes.data || []) {
    if (!scoresByOutput.has(s.output_id)) scoresByOutput.set(s.output_id, []);
    scoresByOutput.get(s.output_id).push(s);
  }

  return data.map((j) => ({
    id: j.id,
    status: j.status,
    completedAt: j.completed_at,
    errorMessage: j.error_message,
    attempts: j.attempts,
    task: tasksById.get(j.task_id) || null,
    output: outputsById.get(j.output_id) || null,
    scores: scoresByOutput.get(j.output_id) || [],
  }));
}

async function outputsRes2(sb, ids) {
  if (!ids.length) return { data: [] };
  return await sb
    .from("run_outputs")
    .select("id, output, cost_usd, duration_ms, model_used, created_at")
    .in("id", ids);
}

export default async function SkillRunsPage({ params }) {
  const { slug } = await params;
  const detail = await getSkillBySlug(slug);
  if (!detail) notFound();

  const sb = await createSupabaseServerClient();
  const runs = await loadRuns(sb, detail.id);

  return (
    <div>
      <section
        style={{
          padding: "clamp(40px, 6vw, 64px) clamp(16px, 4.5vw, 64px) 24px",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <Link
          href={`/skills/${slug}`}
          className="vz-nav-link"
          style={{
            color: "var(--fg-muted)",
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          ← {detail.name}
        </Link>
      </section>

      <Section eyebrow={`Audit trail · ${detail.name}`} markerColor="var(--azure)" paddingY={32}>
        <SectionHeader
          title={
            runs.length === 0 ? (
              <>
                No <em style={{ color: "var(--accent)" }}>runs</em> yet.
              </>
            ) : (
              <>
                {runs.length} run{runs.length === 1 ? "" : "s"} on the bench.
              </>
            )
          }
          subtitle={
            runs.length === 0
              ? "This skill hasn't been executed by the bench engine yet. Once a cycle runs, every (task × judge) outcome lands here for full transparency."
              : "Each run shows the task, the agent output, and per-judge scores. Cached outputs reuse a previous identical-input run."
          }
        />

        {runs.length === 0 ? (
          <div
            style={{
              marginTop: 48,
              padding: "60px 32px",
              border: "1px solid var(--rule)",
              background: "var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            Bench engine idle for this skill.
            <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)" }}>
              Status proxy: <Link href="/status" className="vz-link">/status</Link>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
            {runs.map((r) => (
              <RunCard key={r.id} run={r} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function RunCard({ run }) {
  const isError = run.status === "error";
  const isCached = run.status === "cached";
  return (
    <article
      style={{
        border: "1px solid var(--rule)",
        padding: "20px 24px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              color:
                isError ? "var(--danger)" : isCached ? "var(--fg-muted)" : "var(--sage)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
            }}
          >
            {run.status}
          </span>
          {run.task && (
            <span style={{ color: "var(--fg)" }}>
              task: {run.task.title}
            </span>
          )}
        </div>
        <span>{fmtDate(run.completedAt)}</span>
      </header>

      {run.output && (
        <details
          style={{
            marginTop: 14,
            border: "1px solid var(--rule)",
            background: "var(--surface)",
          }}
        >
          <summary
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            output · {run.output.model_used} · {run.output.duration_ms}ms · ${(run.output.cost_usd ?? 0).toFixed(4)}
          </summary>
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderTop: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.55,
              color: "var(--fg)",
              maxHeight: 320,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {run.output.output?.text || "(empty)"}
          </pre>
        </details>
      )}

      {run.scores.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 0,
            border: "1px solid var(--rule)",
          }}
        >
          {run.scores.map((s, i) => (
            <div
              key={s.judge_model}
              style={{
                padding: "12px 16px",
                borderRight: i < run.scores.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                {displayJudgeModel(s.judge_model)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Number(s.score).toFixed(0)}
                <span style={{ fontSize: 14, color: "var(--fg-muted)", marginLeft: 4 }}>/100</span>
              </span>
              {s.rationale && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {s.rationale}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isError && run.errorMessage && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            border: "1px solid rgba(153,27,27,0.4)",
            color: "var(--danger)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.04em",
          }}
        >
          {run.errorMessage}
        </div>
      )}
    </article>
  );
}
