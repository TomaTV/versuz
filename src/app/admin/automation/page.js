import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  GH_WORKFLOWS,
  VERCEL_CRONS,
  withNextRun,
  fetchWorkflowRuns,
  fetchBenchBudget,
} from "@/lib/admin/automation";
import { nextRun, formatRelative, formatUTC, formatParis } from "@/lib/admin/cron-utils";

export const revalidate = 60;

export const metadata = {
  title: "Automation — Admin — Versuz",
  robots: { index: false, follow: false },
};

const COLORS = {
  ok: "rgb(80,180,120)",
  warn: "rgb(229,166,68)",
  err: "rgb(220,80,80)",
  idle: "rgba(20,18,14,0.22)",
  ember: "rgb(229,118,68)",
  blue: "rgb(110,150,220)",
};

const styles = {
  section: { marginTop: 48 },
  h2: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    color: "var(--fg)",
    margin: "0 0 4px 0",
  },
  eyebrow: {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--fg-muted)",
  },
  mono: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.04em",
    color: "var(--fg-muted)",
  },
};

function dotForRun(run) {
  if (!run) return COLORS.idle;
  if (run.status === "in_progress" || run.status === "queued") return COLORS.warn;
  if (run.conclusion === "success") return COLORS.ok;
  if (run.conclusion === "failure" || run.conclusion === "cancelled") return COLORS.err;
  return COLORS.idle;
}

function StatusDot({ color, size = 8 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: size,
        background: color,
      }}
    />
  );
}

function RunStrip({ runs }) {
  const slots = [...runs.slice(0, 5)];
  while (slots.length < 5) slots.push(null);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {slots.map((r, i) => (
        <span
          key={i}
          title={r ? `${r.conclusion || r.status} · ${formatRelative(new Date(r.startedAt))}` : "no run"}
          style={{
            width: 22,
            height: 6,
            background: dotForRun(r),
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Top KPI strip ────────────────────────────────────────────────────
function KpiStrip({ kpis }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "var(--rule)",
        border: "1px solid var(--rule)",
        marginTop: 24,
      }}
    >
      {kpis.map((k) => (
        <div
          key={k.label}
          style={{
            padding: "20px 22px",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={styles.eyebrow}>{k.label}</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: k.color || "var(--fg)",
              lineHeight: 1,
            }}
          >
            {k.value}
          </div>
          {k.hint && <div style={styles.mono}>{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── 24h timeline visual (2 lanes : GH workflows / Vercel crons) ──────

// Assigns a "row" (0, 1, or 2) to each labeled marker so adjacent labels
// don't collide horizontally. Labels are ~60px wide → each row holds markers
// at least ~10% of timeline width apart (24h × 0.10 = 2.4h).
function stackLabels(markers) {
  const MIN_GAP_PCT = 10; // 2.4h gap before two labels share a row
  const ROWS = [-Infinity, -Infinity, -Infinity];
  return markers.map((m) => {
    if (!m.showLabel) return { ...m, labelRow: 0 };
    const pct = (m.hourFloat / 24) * 100;
    for (let row = 0; row < ROWS.length; row++) {
      if (pct - ROWS[row] >= MIN_GAP_PCT) {
        ROWS[row] = pct;
        return { ...m, labelRow: row };
      }
    }
    // All rows full — just stack on bottom row
    return { ...m, labelRow: ROWS.length - 1 };
  });
}

function TimelineLane({ label, color, markers, nowHourFloat }) {
  const stacked = stackLabels(markers);
  const maxRow = stacked.reduce((acc, m) => Math.max(acc, m.labelRow), 0);
  const laneHeight = 28 + (maxRow + 1) * 14; // base 28 + 14px per label row
  return (
    <div style={{ position: "relative", height: laneHeight, marginBottom: 12 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 90,
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 6,
          gap: 8,
        }}
      >
        <span style={{ width: 8, height: 8, background: color, borderRadius: 2, marginTop: 4 }} />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--fg)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Lane background bar */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 0,
            right: 0,
            height: 4,
            background: "var(--surface)",
            borderRadius: 2,
          }}
        />
        {/* Markers */}
        {stacked.map((m, i) => {
          const past = m.hourFloat < nowHourFloat;
          const labelTop = 32 + m.labelRow * 14;
          return (
            <div
              key={i}
              title={`${m.name} · ${String(m.hour).padStart(2, "0")}:${String(m.minute).padStart(2, "0")} UTC`}
              style={{
                position: "absolute",
                top: 8,
                left: `${(m.hourFloat / 24) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 12,
                  height: 20,
                  background: past ? "rgba(20,18,14,0.2)" : color,
                  borderRadius: 2,
                }}
              />
              {m.showLabel && (
                <>
                  {/* Connector line from marker to label row */}
                  {m.labelRow > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 22,
                        width: 1,
                        height: labelTop - 22,
                        background: "rgba(20,18,14,0.15)",
                      }}
                    />
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: labelTop,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: past ? "var(--fg-muted)" : "var(--fg)",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.04em",
                      opacity: past ? 0.55 : 1,
                      padding: "0 3px",
                      background: "var(--bg)",
                    }}
                  >
                    {String(m.hour).padStart(2, "0")}:{String(m.minute).padStart(2, "0")} {m.name}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timeline24h({ ghMarkers, vercelMarkers }) {
  const now = new Date();
  const nowHourFloat = now.getUTCHours() + now.getUTCMinutes() / 60;
  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 18,
        }}
      >
        <div style={styles.eyebrow}>
          Today (UTC) · {now.toISOString().slice(0, 10)}
        </div>
        <div style={{ ...styles.mono, fontSize: 11 }}>
          Now · {now.toISOString().slice(11, 16)} UTC · {formatParis(now)}
        </div>
      </div>
      <div style={{ position: "relative", padding: "12px 0 28px" }}>
        {/* Hour ticks header */}
        <div style={{ position: "relative", height: 18, marginLeft: 100 }}>
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                left: `${(h / 24) * 100}%`,
                transform: "translateX(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.08em",
              }}
            >
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>
        {/* Vertical grid + NOW line (spans both lanes) */}
        <div
          style={{
            position: "absolute",
            left: 100,
            right: 0,
            top: 30,
            bottom: 28,
            pointerEvents: "none",
          }}
        >
          {[3, 6, 9, 12, 15, 18, 21].map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${(h / 24) * 100}%`,
                width: 0,
                borderLeft: "1px dashed var(--rule)",
                opacity: 0.6,
              }}
            />
          ))}
          {/* NOW line on top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(nowHourFloat / 24) * 100}%`,
              width: 0,
              borderLeft: `1.5px dashed ${COLORS.ember}`,
            }}
          />
        </div>
        <div style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
          <TimelineLane
            label="GitHub"
            color={COLORS.ember}
            markers={ghMarkers}
            nowHourFloat={nowHourFloat}
          />
          <TimelineLane
            label="Vercel"
            color={COLORS.blue}
            markers={vercelMarkers}
            nowHourFloat={nowHourFloat}
          />
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 24,
            ...styles.mono,
            fontSize: 10,
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 4, background: "rgba(20,18,14,0.2)" }} />
            PAST
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 4, background: COLORS.ember }} />
            UPCOMING (GH)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 4, background: COLORS.blue }} />
            UPCOMING (VERCEL)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: `1px dashed ${COLORS.ember}`,
              }}
            />
            NOW
          </span>
        </div>
      </div>
    </div>
  );
}

// Extract "today's hour float" from a cron — only handles fixed-hour schedules,
// which is what we use. Returns null if cron runs multiple times per day (will
// fall back to a different presentation).
function todayHoursForCron(schedule) {
  // schedule like "0 3 * * *" or "5 */4 * * *"
  const [m, h] = schedule.split(/\s+/);
  const minute = m === "*" ? 0 : Number(m.replace(/[^\d]/g, "")) || 0;
  if (h.startsWith("*/")) {
    const step = Number(h.slice(2));
    const hours = [];
    for (let v = 0; v < 24; v += step) hours.push(v);
    return hours.map((hr) => ({ hour: hr, minute, hourFloat: hr + minute / 60 }));
  }
  const hr = Number(h);
  return [{ hour: hr, minute, hourFloat: hr + minute / 60 }];
}

// ─── Compact card with run strip ──────────────────────────────────────
async function WorkflowCard({ workflow }) {
  const { configured, runs, error } = await fetchWorkflowRuns(workflow.id, 5);
  const item = withNextRun(workflow);
  const lastRun = runs[0];
  const overallStatus = lastRun
    ? lastRun.conclusion === "success"
      ? "OK"
      : lastRun.conclusion === "failure"
        ? "FAIL"
        : lastRun.status === "in_progress"
          ? "RUNNING"
          : (lastRun.conclusion || lastRun.status).toUpperCase()
    : configured
      ? "NO RUNS"
      : "—";
  const statusColor = lastRun
    ? dotForRun(lastRun)
    : COLORS.idle;
  return (
    <div
      style={{
        padding: "20px 24px",
        background: "var(--surface)",
        borderLeft: `4px solid ${statusColor}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 240px",
          gap: 20,
          alignItems: "center",
        }}
      >
        {/* BIG status chip on left */}
        <div
          style={{
            background: statusColor,
            color: "#fff",
            padding: "8px 0",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            borderRadius: 2,
          }}
        >
          {overallStatus}
        </div>
        {/* Name + description */}
        <div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "baseline",
              marginBottom: 6,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 400,
                color: "var(--fg)",
                margin: 0,
              }}
            >
              {item.name}
            </h3>
            <span style={{ ...styles.mono, fontSize: 10 }}>
              cron <code>{item.schedule}</code>
            </span>
          </div>
          <div
            style={{
              ...styles.mono,
              fontSize: 11,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            {item.description}
          </div>
          <div style={{ ...styles.mono, fontSize: 10, marginTop: 6, opacity: 0.7 }}>
            {item.cost}
          </div>
        </div>
        {/* Next run + run strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ ...styles.eyebrow, marginBottom: 2 }}>NEXT IN</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {formatRelative(item.nextRunAt).replace("in ", "").replace(" ago", " ago")}
            </div>
            <div style={{ ...styles.mono, fontSize: 10, marginTop: 4 }}>
              {formatUTC(item.nextRunAt)} · {formatParis(item.nextRunAt)}
            </div>
          </div>
          {configured ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={styles.eyebrow}>Last 5</div>
              <RunStrip runs={runs} />
            </div>
          ) : (
            <div style={{ ...styles.mono, fontSize: 10, opacity: 0.6 }}>
              GH_ADMIN_TOKEN needed
            </div>
          )}
        </div>
      </div>
      {error && (
        <div style={{ ...styles.mono, marginTop: 10, color: COLORS.err }}>
          API error: {error}
        </div>
      )}
    </div>
  );
}

function VercelCronCard({ cron }) {
  const item = withNextRun(cron);
  return (
    <div
      style={{
        padding: "20px 24px",
        background: "var(--surface)",
        borderLeft: `4px solid ${COLORS.blue}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 240px",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: COLORS.blue,
            color: "#fff",
            padding: "8px 0",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            borderRadius: 2,
          }}
        >
          VERCEL
        </div>
        <div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "baseline",
              marginBottom: 6,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 400,
                color: "var(--fg)",
                margin: 0,
              }}
            >
              {item.name}
            </h3>
            <span style={{ ...styles.mono, fontSize: 10 }}>
              cron <code>{item.schedule}</code>
            </span>
          </div>
          <div
            style={{
              ...styles.mono,
              fontSize: 11,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            {item.description}
          </div>
          <div style={{ ...styles.mono, fontSize: 10, marginTop: 6, opacity: 0.6 }}>
            {item.path}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...styles.eyebrow, marginBottom: 2 }}>NEXT IN</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              color: "var(--fg)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {formatRelative(item.nextRunAt).replace("in ", "")}
          </div>
          <div style={{ ...styles.mono, fontSize: 10, marginTop: 4 }}>
            {formatUTC(item.nextRunAt)} · {formatParis(item.nextRunAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Budget visual ────────────────────────────────────────────────────
async function BudgetCard() {
  const sb = createSupabaseAdminClient();
  const { spend, cap, cycles } = await fetchBenchBudget(sb);
  const pct = Math.min(100, (spend / cap) * 100);
  const barColor = pct < 60 ? COLORS.ok : pct < 90 ? COLORS.warn : COLORS.err;

  // Group cycles by day for the bar chart
  const byDay = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of cycles) {
    const day = c.started_at?.slice(0, 10);
    if (day && byDay.has(day)) {
      byDay.set(day, byDay.get(day) + Number(c.actual_cost_usd || 0));
    }
  }
  const days = [...byDay.entries()];
  const maxDay = Math.max(0.01, ...days.map(([, v]) => v));
  const dailyCap = cap / 30;

  return (
    <div style={{ padding: "24px 28px", background: "var(--surface)", border: "1px solid var(--rule)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={styles.eyebrow}>30-DAY BENCH SPEND</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--fg)",
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            ${spend.toFixed(2)}
            <span
              style={{
                fontSize: 18,
                color: "var(--fg-muted)",
                marginLeft: 8,
                letterSpacing: 0,
              }}
            >
              / ${cap}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={styles.eyebrow}>USAGE</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              color: barColor,
              fontWeight: 600,
            }}
          >
            {pct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div
        style={{
          position: "relative",
          height: 80,
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        {/* Daily cap line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${(dailyCap / maxDay) * 100}%`,
            height: 1,
            background: "rgba(229,166,68,0.4)",
            zIndex: 1,
          }}
        />
        {days.map(([day, val]) => (
          <div
            key={day}
            title={`${day} · $${val.toFixed(2)}`}
            style={{
              flex: 1,
              height: `${Math.max(2, (val / maxDay) * 100)}%`,
              background: val > dailyCap ? COLORS.warn : val > 0 ? COLORS.ember : "var(--rule)",
              opacity: val > 0 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...styles.mono,
          fontSize: 9,
          letterSpacing: "0.1em",
        }}
      >
        <span>30 DAYS AGO</span>
        <span>TODAY · DAILY CAP ${dailyCap.toFixed(2)}</span>
      </div>

      {/* Recent cycles */}
      <div style={{ marginTop: 24 }}>
        <div style={{ ...styles.eyebrow, marginBottom: 8 }}>Recent cycles</div>
        {cycles.length === 0 && (
          <div style={styles.mono}>No completed cycles yet.</div>
        )}
        {cycles.slice(0, 6).map((c) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 90px 70px 80px",
              gap: 12,
              padding: "6px 0",
              borderBottom: "1px solid var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--fg-muted)" }}>#{c.id}</span>
            <span style={{ color: "var(--fg)" }}>{c.scope}</span>
            <span
              style={{
                color:
                  c.status === "completed"
                    ? COLORS.ok
                    : c.status === "partial"
                      ? COLORS.warn
                      : "var(--fg-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: 10,
              }}
            >
              {c.status}
            </span>
            <span style={{ textAlign: "right" }}>
              ${Number(c.actual_cost_usd || 0).toFixed(2)}
            </span>
            <span style={{ color: "var(--fg-muted)", textAlign: "right" }}>
              {formatRelative(new Date(c.started_at))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default async function AutomationPage() {
  const sb = createSupabaseAdminClient();

  // Pre-fetch all workflow runs in parallel (avoids serial waterfall during render)
  const ghRunsPromises = GH_WORKFLOWS.map((w) => fetchWorkflowRuns(w.id, 5));
  const [budget, ...ghRuns] = await Promise.all([
    fetchBenchBudget(sb),
    ...ghRunsPromises,
  ]);

  // Build 2 separate lanes (GH vs Vercel) for the timeline
  // For recurring crons (e.g. quality every 4h), only label the FIRST occurrence
  // — the row of markers makes the pattern self-evident.
  function buildLane(items) {
    const lane = [];
    items.forEach((item) => {
      const hours = todayHoursForCron(item.schedule);
      const shortName = item.name.split(" ")[0].toLowerCase();
      hours.forEach((h, idx) => {
        lane.push({
          name: shortName,
          hour: h.hour,
          minute: h.minute,
          hourFloat: h.hourFloat,
          showLabel: idx === 0, // only label first occurrence of recurring crons
        });
      });
    });
    return lane.sort((a, b) => a.hourFloat - b.hourFloat);
  }
  const ghMarkers = buildLane(GH_WORKFLOWS);
  const vercelMarkers = buildLane(VERCEL_CRONS);

  // KPIs
  const allItems = [...GH_WORKFLOWS, ...VERCEL_CRONS];
  const nextRunOverall = allItems
    .map((i) => nextRun(i.schedule))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];

  const recentFailures = ghRuns.reduce(
    (sum, r) =>
      sum + (r.runs || []).filter((x) => x.conclusion === "failure").length,
    0
  );

  const usagePct = (budget.spend / budget.cap) * 100;
  const usageColor =
    usagePct < 60 ? COLORS.ok : usagePct < 90 ? COLORS.warn : COLORS.err;

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
        Automation
      </h1>
      <div style={{ ...styles.eyebrow, marginTop: 8 }}>
        Schedules · next run · budget. All times UTC.
      </div>

      <KpiStrip
        kpis={[
          {
            label: "Total schedules",
            value: GH_WORKFLOWS.length + VERCEL_CRONS.length,
            hint: `${GH_WORKFLOWS.length} GH · ${VERCEL_CRONS.length} Vercel`,
          },
          {
            label: "Next run",
            value: formatRelative(nextRunOverall),
            hint: `${formatUTC(nextRunOverall)} · ${formatParis(nextRunOverall)}`,
          },
          {
            label: "30-day spend",
            value: `$${budget.spend.toFixed(2)}`,
            hint: `of $${budget.cap} cap`,
            color: usageColor,
          },
          {
            label: "Recent failures",
            value: recentFailures,
            hint: "last 5 runs / workflow",
            color: recentFailures > 0 ? COLORS.err : COLORS.ok,
          },
        ]}
      />

      <Timeline24h ghMarkers={ghMarkers} vercelMarkers={vercelMarkers} />

      <section style={styles.section}>
        <h2 style={styles.h2}>GitHub Actions</h2>
        <div style={styles.eyebrow}>Workflows in .github/workflows/</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            background: "var(--rule)",
        border: "1px solid var(--rule)",
            marginTop: 16,
          }}
        >
          {GH_WORKFLOWS.map((w) => (
            <WorkflowCard key={w.id} workflow={w} />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Vercel cron jobs</h2>
        <div style={styles.eyebrow}>Endpoints in vercel.json</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            background: "var(--rule)",
        border: "1px solid var(--rule)",
            marginTop: 16,
          }}
        >
          {VERCEL_CRONS.map((c) => (
            <VercelCronCard key={c.path} cron={c} />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Bench budget</h2>
        <div style={styles.eyebrow}>30-day spend via cycles.actual_cost_usd</div>
        <div style={{ marginTop: 16 }}>
          <BudgetCard />
        </div>
      </section>
    </div>
  );
}
