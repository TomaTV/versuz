import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  GH_WORKFLOWS,
  VERCEL_CRONS,
  withNextRun,
  fetchWorkflowRuns,
  fetchBenchBudget,
  fetchAutomationStats,
  fetchHeartbeat,
} from "@/lib/admin/automation";
import {
  nextRun,
  prevRun,
  formatRelative,
  formatRelativeLong,
  formatUTC,
  formatParis,
  progressBetween,
} from "@/lib/admin/cron-utils";

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
function KpiStrip({ kpis, columns = 4 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 1,
        background: "var(--rule)",
        border: "1px solid var(--rule)",
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
          <div
            style={{
              ...styles.eyebrow,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {k.dotColor && (
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    background: k.dotColor,
                    borderRadius: 1,
                  }}
                />
              )}
              {k.label}
            </span>
            {k.trend && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color:
                    k.trend.dir === "up"
                      ? COLORS.ok
                      : k.trend.dir === "down"
                        ? COLORS.err
                        : "var(--fg-muted)",
                  letterSpacing: "0.04em",
                  textTransform: "none",
                }}
              >
                {k.trend.label}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: k.color || "var(--fg)",
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              gap: 4,
            }}
          >
            <span>{k.value}</span>
            {k.unit && (
              <span
                style={{
                  fontSize: 14,
                  color: "var(--fg-muted)",
                  letterSpacing: 0,
                }}
              >
                {k.unit}
              </span>
            )}
          </div>
          {k.hint && <div style={styles.mono}>{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Inline "throughput" chip for a workflow card ──────────────────────
function ThroughputChips({ chips }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
      }}
    >
      {chips.map((c) => (
        <div
          key={c.label}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            padding: "4px 9px",
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg)",
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              color: c.color || "var(--fg)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.value}
          </span>
          <span style={{ color: "var(--fg-muted)", fontSize: 10, letterSpacing: "0.08em" }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Progress bar from prev cron tick to next ──────────────────────────
function NextRunCountdown({ nextRunAt, schedule }) {
  const now = new Date();
  const prev = schedule ? prevRun(schedule, now) : null;
  const frac = progressBetween(prev, nextRunAt, now);
  const rel = formatRelativeLong(nextRunAt, now);
  return (
    <div style={{ textAlign: "right", minWidth: 200 }}>
      <div style={{ ...styles.eyebrow, marginBottom: 2 }}>NEXT IN</div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        <span style={{ fontSize: 28, fontVariantNumeric: "tabular-nums" }}>
          {rel.primary}
        </span>
        {rel.secondary && (
          <span
            style={{
              fontSize: 16,
              color: "var(--fg-muted)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 0,
            }}
          >
            {rel.secondary}
          </span>
        )}
      </div>
      {/* progress bar — fills from previous tick toward next */}
      <div
        style={{
          marginTop: 8,
          height: 3,
          background: "var(--rule)",
          position: "relative",
          overflow: "hidden",
        }}
        title={`${Math.round(frac * 100)}% of interval elapsed`}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${(frac * 100).toFixed(1)}%`,
            background: COLORS.ember,
          }}
        />
      </div>
      <div style={{ ...styles.mono, fontSize: 10, marginTop: 6 }}>
        {formatUTC(nextRunAt)} · {formatParis(nextRunAt)}
      </div>
    </div>
  );
}

// ─── Heartbeat banner — flag dead pipelines ───────────────────────────
//
// Each stage has an expected cadence ; if the most recent activity is
// older than the "stale" threshold, automation is silently broken and
// we surface a red banner. Defines :
//
//   scrape (daily 02:00 UTC) → stale > 26h
//   quality (every 4h)       → stale > 5h
//   bench (daily 03:00 UTC)  → stale > 26h

const HEARTBEAT_THRESHOLDS = {
  scrape: { warnH: 26, label: "Scrape", maxH: 48 },
  quality: { warnH: 5, label: "Quality judge", maxH: 12 },
  bench: { warnH: 26, label: "Bench engine", maxH: 48 },
};

function HeartbeatBanner({ heartbeat, now }) {
  const cells = ["scrape", "quality", "bench"].map((key) => {
    const ts = heartbeat[key];
    const cfg = HEARTBEAT_THRESHOLDS[key];
    const date = ts ? new Date(ts) : null;
    const ageMs = date ? now.getTime() - date.getTime() : null;
    const ageH = ageMs != null ? ageMs / 3_600_000 : null;
    const status = !date
      ? "missing"
      : ageH > cfg.maxH
        ? "dead"
        : ageH > cfg.warnH
          ? "warn"
          : "ok";
    const color =
      status === "ok"
        ? COLORS.ok
        : status === "warn"
          ? COLORS.warn
          : COLORS.err;
    return { key, cfg, date, ageH, status, color, ts };
  });

  const worst = cells.reduce((acc, c) => {
    const rank = { ok: 0, warn: 1, dead: 2, missing: 2 };
    return rank[c.status] > rank[acc.status] ? c : acc;
  });

  if (worst.status === "ok") return null;

  return (
    <div
      style={{
        marginTop: 24,
        padding: "14px 18px",
        border: `1px solid ${worst.color}`,
        background: `color-mix(in oklab, ${worst.color} 6%, var(--surface))`,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 16,
        alignItems: "center",
      }}
      className="vz-heartbeat-banner"
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          background: worst.color,
          borderRadius: "50%",
          boxShadow: `0 0 0 4px color-mix(in oklab, ${worst.color} 22%, transparent)`,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg)",
          letterSpacing: "0.04em",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: worst.color, marginRight: 8, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 10 }}>
          {worst.status === "warn" ? "WARNING" : "STALE"}
        </strong>
        {cells.map((c, i) => (
          <span key={c.key} style={{ marginRight: i < cells.length - 1 ? 16 : 0 }}>
            <span style={{ color: c.color }}>{c.cfg.label}</span>:{" "}
            {c.date
              ? c.ageH < 1
                ? `${Math.round(c.ageH * 60)}m ago`
                : c.ageH < 24
                  ? `${Math.round(c.ageH)}h ago`
                  : `${Math.round(c.ageH / 24)}d ago`
              : "never"}
          </span>
        ))}
      </div>
      <span style={{ ...styles.mono, fontSize: 10, color: "var(--fg-muted)" }}>
        check workflow logs
      </span>
    </div>
  );
}

// ─── Today's agenda — vertical list of next/past runs ─────────────────
//
// Replaces the previous horizontal 2-lane timeline (the labels collided
// at 02:00/03:00 and 04-09:00 making it unreadable). Agenda view sorts
// every scheduled occurrence today by time, splits into "upcoming" and
// "past" buckets, highlights the next imminent run.

function AgendaRow({ item, isNext, now }) {
  const past = item.runAt < now;
  const rel = formatRelativeLong(item.runAt, now);
  const isGh = item.source === "gh";
  const dotColor = past
    ? "var(--rule-strong)"
    : isGh
      ? COLORS.ember
      : COLORS.blue;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "84px 12px minmax(0, 1fr) auto",
        gap: 14,
        alignItems: "center",
        padding: isNext ? "14px 16px" : "10px 16px 10px 16px",
        background: isNext ? "color-mix(in oklab, var(--accent) 6%, var(--surface))" : "transparent",
        borderLeft: isNext ? `3px solid ${COLORS.ember}` : "3px solid transparent",
        borderBottom: "1px solid var(--rule)",
        opacity: past ? 0.5 : 1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
        }}
      >
        {String(item.hour).padStart(2, "0")}:{String(item.minute).padStart(2, "0")}
      </div>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          background: dotColor,
          borderRadius: 2,
          boxShadow: isNext
            ? `0 0 0 3px color-mix(in oklab, ${dotColor} 30%, transparent)`
            : "none",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isNext ? 18 : 15,
            color: "var(--fg)",
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        <div style={{ ...styles.mono, fontSize: 10, marginTop: 2 }}>
          {isGh ? "GitHub Actions" : "Vercel cron"} · {item.schedule}
        </div>
      </div>
      <div
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: past ? "var(--fg-muted)" : "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 90,
        }}
      >
        {past ? (
          <span>{rel.primary} ago</span>
        ) : (
          <>
            <span style={{ color: isNext ? COLORS.ember : "var(--fg)" }}>
              in {rel.primary}
            </span>
            {rel.secondary && (
              <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
                {rel.secondary}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TodayAgenda({ items }) {
  const now = new Date();
  const upcoming = items.filter((i) => i.runAt >= now).sort((a, b) => a.runAt - b.runAt);
  const past = items.filter((i) => i.runAt < now).sort((a, b) => b.runAt - a.runAt);
  const nextId = upcoming[0]?.id;

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={styles.eyebrow}>
          Today (UTC) · {now.toISOString().slice(0, 10)}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              background: COLORS.ember,
              borderRadius: "50%",
              boxShadow: `0 0 0 3px color-mix(in oklab, ${COLORS.ember} 22%, transparent)`,
            }}
          />
          NOW · {now.toISOString().slice(11, 16)} UTC · {formatParis(now)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--rule)",
          border: "1px solid var(--rule)",
        }}
        className="vz-agenda-grid"
      >
        {/* Upcoming column */}
        <div style={{ background: "var(--bg)" }}>
          <div
            style={{
              ...styles.eyebrow,
              padding: "12px 16px",
              borderBottom: "1px solid var(--rule-strong)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden style={{ width: 6, height: 6, background: COLORS.ember }} />
              Upcoming today
            </span>
            <span style={{ color: "var(--fg)" }}>{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ padding: "20px 16px", ...styles.mono, fontSize: 11 }}>
              No more runs today.
            </div>
          ) : (
            upcoming.map((it) => (
              <AgendaRow
                key={it.id}
                item={it}
                isNext={it.id === nextId}
                now={now}
              />
            ))
          )}
        </div>

        {/* Past column */}
        <div style={{ background: "var(--bg)" }}>
          <div
            style={{
              ...styles.eyebrow,
              padding: "12px 16px",
              borderBottom: "1px solid var(--rule-strong)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden style={{ width: 6, height: 6, background: "var(--rule-strong)" }} />
              Already ran today
            </span>
            <span style={{ color: "var(--fg)" }}>{past.length}</span>
          </div>
          {past.length === 0 ? (
            <div style={{ padding: "20px 16px", ...styles.mono, fontSize: 11 }}>
              Nothing yet today.
            </div>
          ) : (
            past.map((it) => (
              <AgendaRow key={it.id} item={it} isNext={false} now={now} />
            ))
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 18,
          ...styles.mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: COLORS.ember }} />
          GITHUB ACTIONS
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: COLORS.blue }} />
          VERCEL CRON
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 14,
              height: 8,
              borderLeft: `3px solid ${COLORS.ember}`,
              background: "color-mix(in oklab, var(--accent) 6%, transparent)",
            }}
          />
          NEXT UP
        </span>
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
async function WorkflowCard({ workflow, throughput }) {
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
          alignItems: "flex-start",
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
            marginTop: 4,
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
          <ThroughputChips chips={throughput} />
        </div>
        {/* Next run + run strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 14,
          }}
        >
          <NextRunCountdown nextRunAt={item.nextRunAt} schedule={item.schedule} />
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

function VercelCronCard({ cron, throughput }) {
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
          alignItems: "flex-start",
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
            marginTop: 4,
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
          <ThroughputChips chips={throughput} />
        </div>
        <NextRunCountdown nextRunAt={item.nextRunAt} schedule={item.schedule} />
      </div>
    </div>
  );
}

// ─── Budget visual ────────────────────────────────────────────────────
async function BudgetCard({ now }) {
  const sb = createSupabaseAdminClient();
  const { spend, cap, cycles } = await fetchBenchBudget(sb);
  const pct = Math.min(100, (spend / cap) * 100);
  const barColor = pct < 60 ? COLORS.ok : pct < 90 ? COLORS.warn : COLORS.err;

  // Group cycles by day for the bar chart. `now` is passed in from the
  // page (single source of truth) so the render is pure — no Date.now()
  // call inside the component, which trips the react-hooks/purity rule.
  const nowMs = now.getTime();
  const byDay = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nowMs - i * 24 * 3600 * 1000);
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

  // Pre-fetch everything in parallel (avoids serial waterfall during render)
  const ghRunsPromises = GH_WORKFLOWS.map((w) => fetchWorkflowRuns(w.id, 5));
  const [budget, stats, heartbeat, ...ghRuns] = await Promise.all([
    fetchBenchBudget(sb),
    fetchAutomationStats(sb),
    fetchHeartbeat(sb),
    ...ghRunsPromises,
  ]);

  // Per-workflow throughput chips. Keyed by workflow id / cron path.
  // "Today" = since UTC midnight (calendar day), so the number resets
  // every day and matches what you'd report as "today we scraped X items".
  const throughputByWorkflow = {
    "scrape-daily.yml": [
      {
        label: "SKILLS / TODAY",
        value: `+${stats.scrape.skillsToday.toLocaleString()}`,
        color: COLORS.ember,
      },
      {
        label: "CLAUDE.MD / TODAY",
        value: `+${stats.scrape.cmdToday.toLocaleString()}`,
        color: COLORS.ember,
      },
      {
        label: "7D TOTAL",
        value: `+${(stats.scrape.skills7d + stats.scrape.cmd7d).toLocaleString()}`,
        color: "var(--fg-muted)",
      },
    ],
    "quality-judge.yml": [
      {
        label: "JUDGED / TODAY",
        value: (stats.quality.skillsToday + stats.quality.cmdToday).toLocaleString(),
        color: COLORS.ok,
      },
      {
        label: "JUDGED / 7D",
        value: (stats.quality.skills7d + stats.quality.cmd7d).toLocaleString(),
        color: "var(--fg-muted)",
      },
      {
        label: "RATED (LIFETIME)",
        value: stats.quality.totalRated.toLocaleString(),
        color: "var(--fg-muted)",
      },
    ],
    "bench-runner.yml": [
      {
        label: "CYCLES / 7D",
        value: stats.bench.cycles7d.toLocaleString(),
        color: COLORS.ember,
      },
      {
        label: "SCORES / TODAY",
        value: stats.bench.scoresToday.toLocaleString(),
        color: COLORS.ember,
      },
      {
        label: "SCORES / 7D",
        value: stats.bench.scores7d.toLocaleString(),
        color: "var(--fg-muted)",
      },
      {
        label: "CYCLES / 30D",
        value: stats.bench.cycles30d.toLocaleString(),
        color: "var(--fg-muted)",
      },
    ],
  };

  const throughputByCron = {
    "/api/cron/bench?scope=all": [
      {
        label: "CYCLES / 7D",
        value: stats.bench.cycles7d.toLocaleString(),
        color: COLORS.blue,
      },
    ],
    "/api/cron/auto-complete-cycles": [
      {
        label: "CYCLES / 30D",
        value: stats.bench.cycles30d.toLocaleString(),
        color: COLORS.blue,
      },
    ],
  };

  // Build one flat agenda — every scheduled occurrence today, GH + Vercel,
  // each as { id, name, source, runAt, hour, minute, schedule }. Sorted
  // upstream by the TodayAgenda component.
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000);

  function buildAgenda(items, source) {
    const out = [];
    items.forEach((item) => {
      const hours = todayHoursForCron(item.schedule);
      hours.forEach((h) => {
        const runAt = new Date(todayStart);
        runAt.setUTCHours(h.hour, h.minute, 0, 0);
        if (runAt < todayStart || runAt >= todayEnd) return;
        out.push({
          id: `${source}-${item.id || item.path}-${h.hour}-${h.minute}`,
          name: item.name,
          source,
          schedule: item.schedule,
          runAt,
          hour: h.hour,
          minute: h.minute,
        });
      });
    });
    return out;
  }
  const agendaItems = [
    ...buildAgenda(GH_WORKFLOWS, "gh"),
    ...buildAgenda(VERCEL_CRONS, "vercel"),
  ];

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

      <HeartbeatBanner heartbeat={heartbeat} now={now} />

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }}>
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
        <KpiStrip
          kpis={[
            {
              label: "Scraped today",
              dotColor: COLORS.ember,
              value: (stats.scrape.skillsToday + stats.scrape.cmdToday).toLocaleString(),
              unit: "items",
              hint: `${stats.scrape.skillsToday.toLocaleString()} skills · ${stats.scrape.cmdToday.toLocaleString()} CLAUDE.md`,
              trend: (stats.scrape.skills7d + stats.scrape.cmd7d) > 0
                ? { dir: "up", label: `7d ${(stats.scrape.skills7d + stats.scrape.cmd7d).toLocaleString()}` }
                : null,
            },
            {
              label: "Judged today",
              dotColor: COLORS.ok,
              value: (stats.quality.skillsToday + stats.quality.cmdToday).toLocaleString(),
              unit: "items",
              hint: `${stats.quality.skillsToday.toLocaleString()} skills · ${stats.quality.cmdToday.toLocaleString()} CLAUDE.md`,
              trend: (stats.quality.skills7d + stats.quality.cmd7d) > 0
                ? { dir: "up", label: `7d ${(stats.quality.skills7d + stats.quality.cmd7d).toLocaleString()}` }
                : null,
            },
            {
              label: "Bench scores",
              dotColor: COLORS.ember,
              value: stats.bench.scoresToday.toLocaleString(),
              unit: "today",
              hint: `${stats.bench.scores7d.toLocaleString()} this week`,
            },
            {
              label: "Bench cycles",
              dotColor: COLORS.ember,
              value: stats.bench.cycles7d.toLocaleString(),
              unit: "/ 7d",
              hint: `${stats.bench.cycles30d.toLocaleString()} this month`,
            },
          ]}
        />
      </div>

      <TodayAgenda items={agendaItems} />

      <section style={styles.section}>
        <h2 style={styles.h2}>GitHub Actions</h2>
        <div style={styles.eyebrow}>
          {GH_WORKFLOWS.length} workflows · .github/workflows/
        </div>
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
            <WorkflowCard
              key={w.id}
              workflow={w}
              throughput={throughputByWorkflow[w.id]}
            />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Vercel cron jobs</h2>
        <div style={styles.eyebrow}>
          {VERCEL_CRONS.length} endpoints · vercel.json
        </div>
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
            <VercelCronCard
              key={c.path}
              cron={c}
              throughput={throughputByCron[c.path]}
            />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Bench budget</h2>
        <div style={styles.eyebrow}>30-day spend via cycles.actual_cost_usd</div>
        <div style={{ marginTop: 16 }}>
          <BudgetCard now={now} />
        </div>
      </section>
    </div>
  );
}
