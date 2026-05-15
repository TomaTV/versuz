import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300; // Vercel Pro: up to 5 min per invocation

// Note : 'other' is deliberately NOT in this set — no task suite to score
// items there. They appear in /marketplace but stay un-ranked. To promote
// them to a real category, author tasks then add the scope here + reclassify
// rows.
const ALLOWED_SCOPES = new Set([
  "skills.document",
  "skills.sql",
  "skills.data",
  "skills.web",
  "skills.shell",
  "skills.code",
  "claude-md.nextjs",
  "claude-md.react",
  "claude-md.python-data",
  "claude-md.backend-api",
  "claude-md.mobile",
  "claude-md.devops",
  "claude-md.ml-training",
  "claude-md.generic",
]);

function authorized(request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>. We accept either:
  // (a) the Vercel-Cron header is present (Vercel-internal calls)
  // (b) the manual `?secret=` query param matches CRON_SECRET (for testing)
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (isVercelCron) return true;
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected || querySecret === expected;
}

export async function GET(request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  // Mode "all" : on enqueue les 14 scopes en une fois. Coût élevé côté
  // runner, mais l'enqueue lui-même est gratuit (DB writes only).
  // Le runner respecte BENCH_BUDGET_USD pour cap la dépense.
  const isAll = !scope || scope === "all";
  if (!isAll && !ALLOWED_SCOPES.has(scope)) {
    return Response.json({ error: "Bad scope (use 'all' or one of " + [...ALLOWED_SCOPES].join(", ") + ")" }, { status: 400 });
  }
  // En mode "all", défauts conservateurs pour ne pas exploser le budget si
  // chaque scope a beaucoup d'items. User peut override via query params.
  const subjects = Number(url.searchParams.get("subjects") || (isAll ? 3 : 5));
  const tasks = Number(url.searchParams.get("tasks") || (isAll ? 3 : 5));

  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "DB unavailable" }, { status: 503 });

  const scopes = isAll ? [...ALLOWED_SCOPES] : [scope];
  const results = [];
  let totalEnqueued = 0;

  for (const sc of scopes) {
    const { kind, category } = parseScope(sc);
    const [subj, tsk] = await Promise.all([
      loadSubjects(sb, kind, category, subjects),
      loadTasks(sb, category, tasks),
    ]);
    if (!subj.length || !tsk.length) {
      results.push({
        scope: sc,
        skipped: true,
        reason: !subj.length ? "no subjects" : "no tasks",
      });
      continue;
    }
    const { data: cycle, error: cycleErr } = await sb
      .from("cycles")
      .insert({ scope: sc, status: "queued" })
      .select()
      .single();
    if (cycleErr) {
      results.push({ scope: sc, error: cycleErr.message });
      continue;
    }
    const pairs = [];
    for (const s of subj) {
      for (const t of tsk) {
        pairs.push({
          cycle_id: cycle.id,
          subject_kind: kind,
          skill_id: kind === "skill" ? s.id : null,
          claude_md_id: kind === "claude_md" ? s.id : null,
          task_id: t.id,
          status: "queued",
        });
      }
    }
    const { error: jobsErr } = await sb.from("run_jobs").insert(pairs);
    if (jobsErr) {
      results.push({ scope: sc, error: jobsErr.message, cycleId: cycle.id });
      continue;
    }
    totalEnqueued += pairs.length;
    results.push({ scope: sc, cycleId: cycle.id, enqueued: pairs.length });
  }

  // Exécution effective = `npm run bench --scope=<scope>` ou un runner cron
  // séparé. Le cron ne fait QUE l'enqueue (cheap, idempotent à 1×/jour).
  // BENCH_BUDGET_USD côté runner cape la dépense.
  return Response.json({
    ok: true,
    mode: isAll ? "all" : "single",
    subjects,
    tasks,
    totalEnqueued,
    cycles: results,
    note: isAll
      ? `Run \`npm run bench\` ${scopes.length} fois (1 par scope) pour drainer la queue, ou setup un runner cron.`
      : `Run \`node scripts/bench/index.mjs --scope=${scope}\` to execute.`,
  });
}

function parseScope(scope) {
  const i = scope.indexOf(".");
  const kindRaw = scope.slice(0, i);
  const category = scope.slice(i + 1);
  const kind = kindRaw === "claude-md" || kindRaw === "claude_md" ? "claude_md" : "skill";
  return { kind, category };
}

async function loadSubjects(sb, kind, category, limit) {
  if (kind === "skill") {
    const { data } = await sb
      .from("skills")
      .select("id")
      .eq("category", category)
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(limit);
    return data || [];
  }
  const { data } = await sb
    .from("claude_md_files")
    .select("id")
    .eq("project_category", category)
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(limit);
  return data || [];
}

async function loadTasks(sb, category, limit) {
  const { data } = await sb
    .from("tasks")
    .select("id")
    .eq("category", category)
    .order("slug", { ascending: true })
    .limit(limit);
  return data || [];
}
