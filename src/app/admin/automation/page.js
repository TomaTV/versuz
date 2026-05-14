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
        {formatParis(nextRunAt)}
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

// ─── Horizontal 24h timeline ──────────────────────────────────────────
// Two tracks (GH + Vercel) with a dot at each cron's hour position. The
// previous version had every dot labeled which made them collide ; this
// one drops the labels (info lives in the list below + tooltips) and
// keeps only the hour ticks underneath. NOW marker is a vertical ember
// bar across both tracks.

function DayTimeline({ items }) {
  const now = new Date();
  // All axis positions are Paris-relative so the NOW line and the marker
  // labels read off the same scale.
  const parisNowParts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const parisNowH = Number(parisNowParts.find((p) => p.type === "hour")?.value || 0);
  const parisNowM = Number(parisNowParts.find((p) => p.type === "minute")?.value || 0);
  const nowFloat = parisNowH + parisNowM / 60;
  const ghItems = items.filter((i) => i.source === "gh");
  const vercelItems = items.filter((i) => i.source === "vercel");
  const HOURS = [0, 4, 8, 12, 16, 20, 24];

  // Cluster overlapping markers (within 1.5h of each other) onto stacked
  // rows so 04:00 / 05:00 / 06:00 / 07:00 / 08:00 / 09:00 don't render as
  // one indistinguishable smudge. Each marker gets a labelRow 0/1/2 ; the
  // chart height accommodates the deepest stack.
  function stackMarkers(items) {
    const sorted = [...items].sort((a, b) => a.hourFloat - b.hourFloat);
    const ROWS = [];
    return sorted.map((m) => {
      // Try rows 0..N in order ; first row where last marker is >1.5h away wins.
      for (let r = 0; r < ROWS.length; r++) {
        if (m.hourFloat - ROWS[r] > 1.5) {
          ROWS[r] = m.hourFloat;
          return { ...m, row: r };
        }
      }
      ROWS.push(m.hourFloat);
      return { ...m, row: ROWS.length - 1 };
    });
  }

  const renderTrack = (laneItems, color, label, nowFloatVal, nowDate, allItems) => {
    const nextId = allItems
      .filter((x) => x.runAt >= nowDate)
      .sort((a, b) => a.runAt - b.runAt)[0]?.id;
    const stacked = stackMarkers(laneItems);
    const maxRow = stacked.reduce((acc, m) => Math.max(acc, m.row), 0);
    // Track height : marker (~26) + 2-line label (~22) + breathing = base 58,
    // plus 40px per extra stacking row.
    const trackHeight = 58 + maxRow * 40;
    return (
      <div
        key={label}
        style={{
          display: "grid",
          gridTemplateColumns: "70px 1fr",
          gap: 14,
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            paddingTop: 10,
          }}
        >
          <span aria-hidden style={{ width: 8, height: 8, background: color }} />
          {label}
        </div>
        <div style={{ position: "relative", height: trackHeight }}>
          {/* Lane bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 14,
              height: 4,
              background: "var(--rule)",
            }}
          />
          {/* NOW vertical line */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -4,
              bottom: 0,
              left: `${(nowFloatVal / 24) * 100}%`,
              width: 2,
              background: COLORS.ember,
              opacity: 0.6,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* Events with stacked rows + inline label (cron short name +
             Paris time). All times shown are Europe/Paris ; Intl handles
             DST automatically so the +1/+2 switch is transparent. */}
          {stacked.map((it) => {
            const past = it.runAt < nowDate;
            const isNext = !past && it.id === nextId;
            const yOffset = it.row * 40;
            const parisLabel = new Intl.DateTimeFormat("fr-FR", {
              timeZone: "Europe/Paris",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).format(it.runAt);
            // Cron short name : first word of the workflow name lowercased.
            // "Quality judge" → "quality", "Bench runner" → "bench", etc.
            const shortName = it.name.split(/\s+/)[0].toLowerCase();
            return (
              <div
                key={it.id}
                title={`${it.name} · ${parisLabel}`}
                style={{
                  position: "absolute",
                  left: `${(it.hourFloat / 24) * 100}%`,
                  top: 2 + yOffset,
                  transform: "translateX(-50%)",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: isNext ? 14 : 11,
                    height: isNext ? 26 : 22,
                    background: past
                      ? `color-mix(in oklab, ${color} 70%, var(--bg))`
                      : color,
                    border: past ? `1px solid color-mix(in oklab, ${color} 80%, var(--ink))` : "none",
                    borderRadius: 2,
                    boxShadow: isNext
                      ? `0 0 0 4px color-mix(in oklab, ${color} 30%, transparent)`
                      : "none",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "var(--bg)",
                    padding: "0 4px",
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: past ? "var(--fg-muted)" : "var(--fg)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontWeight: isNext ? 600 : 500,
                    }}
                  >
                    {shortName}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: past ? "var(--fg-muted)" : "var(--fg)",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "0.02em",
                      opacity: past ? 0.7 : 1,
                    }}
                  >
                    {parisLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
          Today · {now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" })}
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
            className="vz-pulse"
            style={{
              width: 6,
              height: 6,
              background: COLORS.ember,
              borderRadius: "50%",
              boxShadow: `0 0 0 3px color-mix(in oklab, ${COLORS.ember} 22%, transparent)`,
            }}
          />
          NOW · {formatParis(now)}
        </div>
      </div>

      <div
        style={{
          padding: "20px 20px 12px",
          border: "1px solid var(--rule-strong)",
          background: "var(--bg)",
        }}
        className="vz-day-timeline"
      >
        {/* Tracks. Each track is a 70px label + 1fr chart area. The NOW
            vertical line lives inside each chart area so its position is
            simply "left: nowFloat%". */}
        {renderTrack(ghItems, COLORS.ember, "GitHub", nowFloat, now, items)}
        {renderTrack(vercelItems, COLORS.blue, "Vercel", nowFloat, now, items)}
        {/* Hour axis — same 70px label + 1fr layout so ticks align with
            track markers. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1fr",
            gap: 14,
            marginTop: 4,
          }}
        >
          <span />
          <div style={{ position: "relative", height: 16 }}>
            {HOURS.map((h) => (
              <span
                key={h}
                style={{
                  position: "absolute",
                  left: `${(h / 24) * 100}%`,
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {String(h).padStart(2, "0")}h
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 18,
          ...styles.mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              background: `color-mix(in oklab, ${COLORS.ember} 45%, var(--bg))`,
              border: `1px solid color-mix(in oklab, ${COLORS.ember} 55%, var(--rule))`,
            }}
          />
          PAST
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: COLORS.ember }} />
          UPCOMING (GH)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: COLORS.blue }} />
          UPCOMING (VERCEL)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 2, height: 12, background: COLORS.ember, opacity: 0.7 }} />
          NOW
        </span>
      </div>
    </div>
  );
}

// ─── Simple "next runs" list ──────────────────────────────────────────
// Just the next N upcoming items, plain list. No NOW divider, no past
// rollup — the past is irrelevant once it ran, and the user only wants
// "what's coming next, when".

function NextRunsList({ items, limit = 6 }) {
  const now = new Date();
  const upcoming = items
    .filter((i) => i.runAt >= now)
    .sort((a, b) => a.runAt - b.runAt)
    .slice(0, limit);
  const nextId = upcoming[0]?.id;

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={styles.eyebrow}>
          Next runs · all times Paris
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          NOW · {formatParis(now)}
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--rule-strong)",
          background: "var(--bg)",
        }}
      >
        {upcoming.length === 0 ? (
          <div style={{ padding: "24px 20px", ...styles.mono, color: "var(--fg-muted)", fontSize: 12 }}>
            No upcoming runs in the next 24h.
          </div>
        ) : (
          upcoming.map((it, idx) => {
            const isNext = it.id === nextId;
            const isGh = it.source === "gh";
            const dotColor = isGh ? COLORS.ember : COLORS.blue;
            const rel = formatRelativeLong(it.runAt, now);
            return (
              <div
                key={it.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 18,
                  alignItems: "center",
                  padding: isNext ? "16px 20px" : "12px 20px",
                  background: isNext
                    ? "color-mix(in oklab, var(--accent) 6%, transparent)"
                    : "transparent",
                  borderLeft: isNext ? `3px solid ${COLORS.ember}` : "3px solid transparent",
                  borderBottom: idx < upcoming.length - 1 ? "1px solid var(--rule)" : "none",
                }}
                className="vz-nextrun-row"
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    background: dotColor,
                    borderRadius: 2,
                    flexShrink: 0,
                    boxShadow: isNext
                      ? `0 0 0 4px color-mix(in oklab, ${dotColor} 28%, transparent)`
                      : "none",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: isNext ? 22 : 16,
                      color: "var(--fg)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.name}
                  </div>
                  <div style={{ ...styles.mono, fontSize: 10, marginTop: 3 }}>
                    {isGh ? "GitHub Actions" : "Vercel cron"} · <code>{it.schedule}</code>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.04em",
                  }}
                >
                  {String(it.parisHour ?? it.hour).padStart(2, "0")}:{String(it.parisMinute ?? it.minute).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: isNext ? 15 : 12,
                    color: isNext ? COLORS.ember : "var(--fg)",
                    fontWeight: isNext ? 600 : 400,
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                    minWidth: 90,
                  }}
                >
                  in {rel.primary}
                  {rel.secondary && (
                    <span style={{ color: "var(--fg-muted)", marginLeft: 4, fontWeight: 400 }}>
                      {rel.secondary}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          marginTop: 10,
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
      className="vz-agenda-row"
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr auto",
        gap: 16,
        alignItems: "center",
        padding: isNext ? "16px 20px" : "10px 20px",
        background: isNext ? "color-mix(in oklab, var(--accent) 6%, var(--surface))" : "transparent",
        borderLeft: isNext ? `3px solid ${COLORS.ember}` : "3px solid transparent",
        opacity: past ? 0.55 : 1,
        position: "relative",
      }}
    >
      {/* Time + dot */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            background: dotColor,
            borderRadius: 2,
            flexShrink: 0,
            boxShadow: isNext
              ? `0 0 0 3px color-mix(in oklab, ${dotColor} 30%, transparent)`
              : "none",
          }}
        />
        <span>{String(item.hour).padStart(2, "0")}:{String(item.minute).padStart(2, "0")}</span>
      </div>
      {/* Name + source */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: isNext ? 20 : 15,
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
          {isGh ? "GitHub Actions" : "Vercel cron"} · <code>{item.schedule}</code>
        </div>
      </div>
      {/* Countdown */}
      <div
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: isNext ? 14 : 12,
          color: past ? "var(--fg-muted)" : "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 90,
        }}
      >
        {past ? (
          <span>{rel.primary} ago</span>
        ) : (
          <>
            <span style={{ color: isNext ? COLORS.ember : "var(--fg)", fontWeight: isNext ? 600 : 400 }}>
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

  // Intl-based Paris HH:MM parser → returns { hour, minute, float } for
  // a given UTC date. Used so the timeline x-axis can be Paris-relative
  // instead of UTC (matches what the user reads on each marker).
  const parisHourCache = new Map();
  function parisFloatFor(date) {
    const key = date.getTime();
    if (parisHourCache.has(key)) return parisHourCache.get(key);
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const float = hour + minute / 60;
    const result = { hour, minute, float };
    parisHourCache.set(key, result);
    return result;
  }

  function buildAgenda(items, source) {
    const out = [];
    items.forEach((item) => {
      const hours = todayHoursForCron(item.schedule);
      hours.forEach((h) => {
        const runAt = new Date(todayStart);
        runAt.setUTCHours(h.hour, h.minute, 0, 0);
        if (runAt < todayStart || runAt >= todayEnd) return;
        const paris = parisFloatFor(runAt);
        out.push({
          id: `${source}-${item.id || item.path}-${h.hour}-${h.minute}`,
          name: item.name,
          source,
          schedule: item.schedule,
          runAt,
          hour: h.hour,
          minute: h.minute,
          // hourFloat = Paris hours (drives marker position + axis ticks).
          // The user only reads Paris time so positioning by UTC would
          // create a visual offset (a 02:00 Paris marker would sit at the
          // 00h tick).
          hourFloat: paris.float,
          parisHour: paris.hour,
          parisMinute: paris.minute,
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
        Schedules · next run · budget. All times Paris.
      </div>

      <HeartbeatBanner heartbeat={heartbeat} now={now} />

      <div style={{ marginTop: 24 }}>
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
              hint: formatParis(nextRunOverall),
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
      </div>

      <DayTimeline items={agendaItems} />

      <NextRunsList items={agendaItems} />

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

      <section style={styles.section}>
        <h2 style={styles.h2}>Today&apos;s activity</h2>
        <div style={styles.eyebrow}>
          Pipeline output since 00:00 Paris · resets at midnight
        </div>
        <div style={{ marginTop: 16 }}>
          <ActivityStats stats={stats} />
        </div>
      </section>
    </div>
  );
}

// ─── Today's activity stats — final row, prominent numbers ────────────
function ActivityStats({ stats }) {
  const cards = [
    {
      label: "Scraped today",
      total: stats.scrape.skillsToday + stats.scrape.cmdToday,
      breakdown: [
        { label: "skills", value: stats.scrape.skillsToday, color: COLORS.ember },
        { label: "CLAUDE.md", value: stats.scrape.cmdToday, color: COLORS.ember },
      ],
      hint7d: stats.scrape.skills7d + stats.scrape.cmd7d,
      dot: COLORS.ember,
    },
    {
      label: "Quality judged today",
      total: stats.quality.skillsToday + stats.quality.cmdToday,
      breakdown: [
        { label: "skills", value: stats.quality.skillsToday, color: COLORS.ok },
        { label: "CLAUDE.md", value: stats.quality.cmdToday, color: COLORS.ok },
      ],
      hint7d: stats.quality.skills7d + stats.quality.cmd7d,
      dot: COLORS.ok,
    },
    {
      label: "Bench scores today",
      total: stats.bench.scoresToday,
      breakdown: [
        { label: "this week", value: stats.bench.scores7d, color: "var(--fg-muted)" },
      ],
      hint7d: null,
      dot: COLORS.ember,
    },
    {
      label: "Bench cycles · 7d",
      total: stats.bench.cycles7d,
      breakdown: [
        { label: "this month", value: stats.bench.cycles30d, color: "var(--fg-muted)" },
      ],
      hint7d: null,
      dot: COLORS.ember,
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "var(--rule)",
        border: "1px solid var(--rule)",
      }}
      className="vz-activity-grid"
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            padding: "28px 24px",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              ...styles.eyebrow,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span aria-hidden style={{ width: 6, height: 6, background: c.dot }} />
            {c.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 5vw, 64px)",
              fontWeight: 400,
              letterSpacing: "-0.03em",
              color: "var(--fg)",
              lineHeight: 0.9,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.total.toLocaleString()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {c.breakdown.map((b) => (
              <div
                key={b.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                <span>{b.label}</span>
                <span style={{ color: b.color, fontVariantNumeric: "tabular-nums" }}>
                  {b.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          {c.hint7d != null && c.hint7d > 0 && (
            <div
              style={{
                ...styles.mono,
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
                paddingTop: 6,
                borderTop: "1px dashed var(--rule)",
              }}
            >
              7d total · {c.hint7d.toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
