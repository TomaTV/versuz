import { nextRun } from "./cron-utils";

export const GH_WORKFLOWS = [
  {
    id: "scrape-daily.yml",
    name: "Scrape daily",
    schedule: "0 2 * * *",
    description: "Sourcegraph + grep.app → adds 30–300 new items/day. Caps at SCRAPE_MAX_NEW=1000.",
    cost: "$0 (GitHub Actions)",
  },
  {
    id: "quality-judge.yml",
    name: "Quality judge",
    schedule: "5 */4 * * *",
    description: "5-axis quality rating on ~50000 items/run. Groq free tier, 8 workers.",
    cost: "$0 (Groq free tier)",
  },
  {
    id: "bench-runner.yml",
    name: "Bench runner",
    schedule: "0 3 * * *",
    description: "Drains queued bench cycle. 3-judge LMArena scoring (Haiku + DeepSeek + GPT-5 mini).",
    cost: "$1/run · $25/month cap",
  },
];

export const VERCEL_CRONS = [
  {
    path: "/api/cron/bench?scope=all",
    name: "Bench enqueue",
    schedule: "0 4 * * *",
    description: "Enqueues 14 scopes into the bench queue (drained by GH Actions one hour later).",
  },
  {
    path: "/api/cron/refresh-rankings",
    name: "Refresh rankings",
    schedule: "0 5 * * *",
    description: "Refreshes the materialized rankings view.",
  },
  {
    path: "/api/cron/sweep-stuck-jobs?hours=24",
    name: "Sweep stuck jobs",
    schedule: "0 6 * * *",
    description: "Resets bench jobs stuck > 24h.",
  },
  {
    path: "/api/cron/refresh-stripe-accounts",
    name: "Refresh Stripe accounts",
    schedule: "0 7 * * *",
    description: "Re-syncs Stripe Connect onboarding statuses.",
  },
  {
    path: "/api/cron/auto-complete-cycles",
    name: "Auto-complete cycles",
    schedule: "0 8 * * *",
    description: "Marks cycles complete when all jobs are done.",
  },
  {
    path: "/api/cron/weekly-digest",
    name: "Weekly digest",
    schedule: "0 9 * * 5",
    description: "Sends weekly Resend email digest to subscribers (Fridays).",
  },
];

export function withNextRun(item) {
  return { ...item, nextRunAt: nextRun(item.schedule) };
}

/**
 * Fetches the last N runs of a workflow from GitHub API. Returns null if
 * GH_ADMIN_TOKEN is unset — caller can display a "configure token" hint.
 */
export async function fetchWorkflowRuns(workflowId, limit = 5) {
  const token = process.env.GH_ADMIN_TOKEN;
  const repo = process.env.GITHUB_REPO || "TomaTV/versuz";
  if (!token) return { configured: false, runs: [] };

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflowId}/runs?per_page=${limit}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return { configured: true, runs: [], error: `${res.status}` };
    const json = await res.json();
    return {
      configured: true,
      runs: (json.workflow_runs || []).map((r) => ({
        id: r.id,
        status: r.status, // queued/in_progress/completed
        conclusion: r.conclusion, // success/failure/cancelled/null
        startedAt: r.run_started_at,
        url: r.html_url,
        event: r.event,
      })),
    };
  } catch (err) {
    return { configured: true, runs: [], error: err.message };
  }
}

/**
 * Throughput stats for each automation workflow.
 *
 * Returns counts in three buckets used to populate the per-workflow chips
 * and the "Activity" KPI strip. Designed for one Supabase round-trip with
 * Promise.all and `count: 'estimated'` where the filter is "all rows" — on
 * tiny windows (last 24h) we want exact counts though, so we use 'exact'
 * with a `head: true` HEAD request and rely on the indexed `scraped_at` /
 * `quality_judged_at` columns to keep it under the 3s anon timeout.
 *
 * scrape:  rows inserted in last 24h (skills + claude_md, by scraped_at)
 * quality: rows quality_judged in last 24h
 * bench:   completed cycles in last 7d + judge_scores in last 7d
 */
export async function fetchAutomationStats(sb) {
  if (!sb) {
    return {
      scrape: { skillsToday: 0, cmdToday: 0, skills7d: 0, cmd7d: 0 },
      quality: { skillsToday: 0, cmdToday: 0, skills7d: 0, cmd7d: 0, totalRated: 0 },
      bench: { cycles7d: 0, scores7d: 0, cycles30d: 0, scoresToday: 0 },
    };
  }
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const todayIso = todayUtc.toISOString();

  // Run everything in parallel — each is a HEAD count query so it's cheap.
  // "today" = since midnight UTC (calendar day) ; "7d"/"30d" = rolling.
  const [
    skillsScrapedToday,
    cmdScrapedToday,
    skillsScraped7d,
    cmdScraped7d,
    skillsJudgedToday,
    cmdJudgedToday,
    skillsJudged7d,
    cmdJudged7d,
    skillsRatedTotal,
    cyclesDone7d,
    cyclesDone30d,
    scores7d,
    scoresToday,
  ] = await Promise.all([
    sb.from("skills").select("id", { count: "exact", head: true }).gte("scraped_at", todayIso),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).gte("scraped_at", todayIso),
    sb.from("skills").select("id", { count: "exact", head: true }).gte("scraped_at", d7),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).gte("scraped_at", d7),
    sb.from("skills").select("id", { count: "exact", head: true }).gte("quality_judged_at", todayIso),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).gte("quality_judged_at", todayIso),
    sb.from("skills").select("id", { count: "exact", head: true }).gte("quality_judged_at", d7),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).gte("quality_judged_at", d7),
    sb.from("skills").select("id", { count: "estimated", head: true }).not("quality_judged_at", "is", null),
    sb.from("cycles").select("id", { count: "exact", head: true }).gte("started_at", d7).eq("status", "completed"),
    sb.from("cycles").select("id", { count: "exact", head: true }).gte("started_at", d30).eq("status", "completed"),
    sb.from("judge_scores").select("id", { count: "exact", head: true }).gte("created_at", d7),
    sb.from("judge_scores").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
  ]);

  const c = (r) => r?.count ?? 0;
  return {
    scrape: {
      skillsToday: c(skillsScrapedToday),
      cmdToday: c(cmdScrapedToday),
      skills7d: c(skillsScraped7d),
      cmd7d: c(cmdScraped7d),
    },
    quality: {
      skillsToday: c(skillsJudgedToday),
      cmdToday: c(cmdJudgedToday),
      skills7d: c(skillsJudged7d),
      cmd7d: c(cmdJudged7d),
      totalRated: c(skillsRatedTotal),
    },
    bench: {
      cycles7d: c(cyclesDone7d),
      cycles30d: c(cyclesDone30d),
      scores7d: c(scores7d),
      scoresToday: c(scoresToday),
    },
  };
}

/**
 * Heartbeat — most-recent activity timestamps per pipeline stage.
 * Compared against expected cadence to flag dead workflows :
 *
 *   - scrape  : daily at 02:00 UTC → stale if > 26h
 *   - quality : every 4h           → stale if > 5h
 *   - bench   : daily at 03:00 UTC → stale if > 26h
 *
 * If a stage is stale, automation is silently broken — the UI surfaces
 * a red banner so we don't notice 3 days later that scraping died.
 */
export async function fetchHeartbeat(sb) {
  if (!sb) {
    return { scrape: null, quality: null, bench: null };
  }
  const [scrapeRow, qualityRow, benchRow] = await Promise.all([
    sb
      .from("skills")
      .select("scraped_at")
      .order("scraped_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("skills")
      .select("quality_judged_at")
      .not("quality_judged_at", "is", null)
      .order("quality_judged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("judge_scores")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    scrape: scrapeRow.data?.scraped_at || null,
    quality: qualityRow.data?.quality_judged_at || null,
    bench: benchRow.data?.created_at || null,
  };
}

/**
 * 30-day bench spend from cycles.actual_cost_usd. Used for the budget card.
 */
export async function fetchBenchBudget(sb) {
  if (!sb) return { spend: 0, cap: 25, cycles: [] };
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await sb
    .from("cycles")
    .select("id, scope, status, started_at, completed_at, actual_cost_usd")
    .gte("started_at", since)
    .not("actual_cost_usd", "is", null)
    .order("started_at", { ascending: false })
    .limit(30);
  const cycles = data || [];
  const spend = cycles.reduce((s, c) => s + Number(c.actual_cost_usd || 0), 0);
  return { spend, cap: 25, cycles };
}
