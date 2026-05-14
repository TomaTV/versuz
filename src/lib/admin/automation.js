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
