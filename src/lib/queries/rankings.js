/**
 * Ranking queries for the Versuz V0 web app.
 *
 * Two data paths:
 *   - fixtures (default): reads from `lib/fixtures/seed.js` so the UI builds
 *     end-to-end without Supabase.
 *   - live: when `NEXT_PUBLIC_SUPABASE_URL` is set, queries Supabase via the
 *     server client. Skills + CLAUDE.md rows are mapped to the same shape the
 *     marketplace + skill detail components already consume.
 *
 * The Elo-driven `rank` field stays null until the bench engine has populated
 * `judge_scores`. Marketplace falls back to verification_level + github_stars.
 */

import {
  SKILLS,
  CATEGORIES,
  FEATURED_BATTLE,
  SKILL_DETAILS,
  CYCLE,
  BENCHMARK_MATRIX,
  TASK_SUITES,
} from "@/lib/fixtures/seed";
import { cache } from "react";
import { CLAUDE_MD_FILES, PROJECT_CATEGORIES } from "@/lib/fixtures/claude-md";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computePrior } from "@/lib/utils";

const HAS_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const CATEGORY_LABELS = {
  document: "Document",
  sql: "SQL",
  data: "Data",
  web: "Web",
  shell: "Shell",
  code: "Code",
  other: "Other",
};

const PROJECT_CATEGORY_LABELS = {
  nextjs: "Next.js",
  react: "React",
  "python-data": "Python data",
  "backend-api": "Backend API",
  mobile: "Mobile",
  devops: "DevOps",
  "ml-training": "ML training",
  generic: "Generic",
  other: "Other",
};

function withTierDefaults(skill) {
  return {
    tier: "free",
    verificationLevel: 0,
    priceUsd: null,
    ...skill,
  };
}

/**
 * Map a Supabase skills row → marketplace card shape.
 */
function mapSkillRow(row) {
  const meta = row.metadata || {};
  const base = withTierDefaults({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: CATEGORY_LABELS[row.category] || row.category,
    categoryId: row.category,
    author: meta.author || meta.owner || null,
    repo: meta.repo || null,
    github: row.github_url ? row.github_url.replace(/^https?:\/\//, "") : null,
    stars: row.github_stars || 0,
    forks: meta.forks ?? null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    pushedAt: meta.pushed_at || null,
    installs: null,
    rank: null,
    elo: null,
    metadata: meta,
    skill_md_content: row.skill_md_content || null,
    tier: row.tier || "free",
    priceUsd: row.price_usd,
    verificationLevel: row.verification_level ?? 0,
    isOfficial: !!row.is_official,
    benchTier: row.bench_tier ?? null,
    privateStoragePath: row.private_storage_path || null,
    promotedUntil: row.promoted_until || null,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    qualityRationale: row.quality_rationale || null,
  });
  base.prior = computePrior(base);
  base.isBoosted = base.promotedUntil ? new Date(base.promotedUntil) > new Date() : false;
  return base;
}

/**
 * Map a Supabase claude_md_files row → marketplace card shape.
 */
function mapClaudeMdRow(row) {
  const meta = row.metadata || {};
  const base = {
    id: row.id,
    slug: row.slug,
    description: row.description,
    project_category: row.project_category,
    author: meta.author || meta.owner || null,
    repo: meta.repo || null,
    github: row.github_url ? row.github_url.replace(/^https?:\/\//, "") : null,
    word_count: row.word_count,
    stars: row.github_stars || 0,
    forks: meta.forks ?? null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    pushedAt: meta.pushed_at || null,
    installs: null,
    rank: null,
    metadata: meta,
    content: row.content || null,
    tier: row.tier || "free",
    priceUsd: row.price_usd,
    verificationLevel: row.verification_level ?? 0,
    isOfficial: !!row.is_official,
    benchTier: row.bench_tier ?? null,
    promotedUntil: row.promoted_until || null,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    qualityRationale: row.quality_rationale || null,
  };
  base.prior = computePrior(base);
  base.isBoosted = base.promotedUntil ? new Date(base.promotedUntil) > new Date() : false;
  return base;
}

// `cache()` dedupes within a single request: calling liveSkills() multiple
// times during one page render hits Supabase exactly once. Critical for the
// marketplace + landing pages which need both the items and derived
// categories (otherwise 4× the queries).
/**
 * Per-repo dampening : compte combien d'items partagent un même (owner, repo).
 * Le prior utilise sqrt(N) pour dampener stars/forks → un mega-repo qui
 * contribute 20 SKILL.md ne flood plus les premières pages.
 * Mute le item.metadata.repoSkillCount + recompute prior après le mapping.
 */
function applyRepoSkillCount(items) {
  const counts = new Map();
  for (const it of items) {
    const owner = it.metadata?.owner;
    const repo = it.metadata?.repo;
    if (!owner || !repo) continue;
    const key = `${String(owner).toLowerCase()}/${String(repo).toLowerCase()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const it of items) {
    const owner = it.metadata?.owner;
    const repo = it.metadata?.repo;
    if (!owner || !repo) continue;
    const key = `${String(owner).toLowerCase()}/${String(repo).toLowerCase()}`;
    const n = counts.get(key) || 1;
    it.metadata = { ...it.metadata, repoSkillCount: n };
    // Recompute prior maintenant que le count est connu
    it.prior = computePrior(it);
  }
  return items;
}

async function enrichWithBenchScores(items, kind) {
  if (!items || items.length === 0) return items;
  const sb = await createSupabaseServerClient();
  if (!sb) return items;
  const { data } = await sb
    .from("rankings")
    .select("skill_id, claude_md_id, avg_score, task_count")
    .eq("subject_kind", kind)
    .not("avg_score", "is", null);
  if (!data) return items;
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const byId = new Map(data.map((r) => [r[idCol], r]));
  return items.map((it) => {
    const r = byId.get(it.id);
    if (!r) return it;
    // Keep 2-decimal precision so marketplace/profile show the true score
    // (e.g. 64.23 instead of integer 64). UI components format via toFixed(1).
    const raw = Number(r.avg_score) || 0;
    return {
      ...it,
      elo: Math.round(raw * 100) / 100,
      benchTaskCount: r.task_count || 0,
    };
  });
}

const liveSkills = cache(async () => {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("skills")
    .select(
      "id, slug, name, description, category, github_url, github_stars, tier, price_usd, verification_level, is_official, metadata, promoted_until, quality_score, quality_rationale, bench_tier"
    )
    // Boosted items first (NULLS LAST), then verified, then stars, then name.
    // Boost expiration is filtered client-side via mapSkillRow.isBoosted.
    .order("promoted_until", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    console.warn(`[rankings] live skills query failed: ${error.message}`);
    return null;
  }
  const mapped = applyRepoSkillCount((data || []).map(mapSkillRow));
  return enrichWithBenchScores(mapped, "skill");
});

const liveClaudeMds = cache(async () => {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("claude_md_files")
    .select(
      "id, slug, description, project_category, github_url, github_stars, word_count, tier, price_usd, verification_level, is_official, metadata, promoted_until, quality_score, quality_rationale, bench_tier"
    )
    // Filter out content-poor stubs : a CLAUDE.md with < 40 words (~50
    // tokens) is almost always a placeholder / marker file, not real
    // project context. Hides false positives from the marketplace.
    .or("word_count.gte.40,word_count.is.null")
    .order("promoted_until", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: true });
  if (error) {
    console.warn(`[rankings] live claude_md query failed: ${error.message}`);
    return null;
  }
  const mapped = applyRepoSkillCount((data || []).map(mapClaudeMdRow));
  return enrichWithBenchScores(mapped, "claude_md");
});

export async function getCurrentCycle() {
  if (!HAS_SUPABASE) return CYCLE;
  const sb = await createSupabaseServerClient();
  if (!sb) return null;

  // 1. Is there a cycle actively running right now?
  const { data: running } = await sb
    .from("cycles")
    .select("id, scope, started_at, status")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (running) {
    // Pull the 5 most recent benched items as a marquee feed
    const { data: recentRanks } = await sb
      .from("rankings")
      .select("subject_slug, subject_name, avg_score")
      .not("avg_score", "is", null)
      .order("avg_score", { ascending: false })
      .limit(5);
    return {
      id: running.id,
      scope: running.scope,
      startedAt: running.started_at,
      status: "running",
      recent: (recentRanks || []).map((r) => `${r.subject_name || r.subject_slug} · ${Number(r.avg_score).toFixed(1)}`),
      nextTick: "live",
    };
  }

  // 2. No running cycle — pull the most recent completed one (last 7d) to display
  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lastCompleted } = await sb
    .from("cycles")
    .select("id, scope, completed_at")
    .eq("status", "completed")
    .gte("completed_at", SEVEN_DAYS_AGO)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCompleted) {
    const { data: recentRanks } = await sb
      .from("rankings")
      .select("subject_slug, subject_name, avg_score")
      .not("avg_score", "is", null)
      .order("avg_score", { ascending: false })
      .limit(5);
    return {
      id: lastCompleted.id,
      scope: lastCompleted.scope,
      completedAt: lastCompleted.completed_at,
      status: "completed",
      recent: (recentRanks || []).map((r) => `${r.subject_name || r.subject_slug} · ${Number(r.avg_score).toFixed(1)}`),
      nextTick: "—",
    };
  }

  return null; // Genuinely no cycle in the last 7 days → ticker falls back to "idle"
}

export async function getStandings(category) {
  let list;
  if (HAS_SUPABASE) {
    list = (await liveSkills()) || [];
  } else {
    list = SKILLS.map(withTierDefaults);
  }

  if (!category || category === "all") return list;
  const cat = category.toLowerCase();
  return list.filter(
    (s) =>
      (s.category || "").toLowerCase() === cat ||
      (s.categoryId || "").toLowerCase() === cat
  );
}

/**
 * Lightweight index-size counts pour la landing page.
 * Single `count: "exact", head: true` Supabase query par table — pas de
 * row payload, juste le count. ~5ms total. Falls back aux fixtures
 * lengths quand Supabase n'est pas configuré.
 */
export async function getIndexCounts() {
  if (!HAS_SUPABASE) {
    return { skills: SKILLS.length, claudeMds: 0, asOf: new Date().toISOString() };
  }
  const sb = await createSupabaseServerClient();
  if (!sb) {
    return { skills: SKILLS.length, claudeMds: 0, asOf: new Date().toISOString() };
  }
  const [skillsRes, claudeMdRes] = await Promise.all([
    sb.from("skills").select("id", { count: "exact", head: true }),
    sb.from("claude_md_files").select("id", { count: "exact", head: true }).gte("word_count", 40),
  ]);
  return {
    skills: skillsRes.count ?? 0,
    claudeMds: claudeMdRes.count ?? 0,
    asOf: new Date().toISOString(),
  };
}

export async function getCategories() {
  if (!HAS_SUPABASE) return CATEGORIES;
  const skills = (await liveSkills()) || [];
  return buildCategoryList(skills, "categoryId");
}

/**
 * Categories that are bench-rankable. Excludes "all" (filter helper) and
 * "other" (catch-all bucket without a task suite — items there appear in
 * /marketplace but not in /leaderboard).
 */
export async function getRankableCategories() {
  const list = await getCategories();
  return list.filter((c) => c.id !== "all" && c.id !== "other");
}

/**
 * Ranked skills in a single category, sorted by avg_score desc.
 * Empty array until the bench engine has scored the category.
 */
/**
 * Lifetime stats per judge_model. Used pour le panel "Meet the Judges"
 * sur /leaderboard. Retourne pour chaque juge :
 *   - count : total scores donnés
 *   - avg : moyenne lifetime
 *   - cost : total $$ dépensé sur ce juge
 *   - calibrationDelta : avg(judge) - avg(global) → spot la dérive
 */
export async function getJudgeLifetimeStats() {
  if (!HAS_SUPABASE) return [];
  const sb = await createSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("judge_scores")
    .select("judge_model, score, cost_usd");
  if (error || !data || data.length === 0) return [];
  const groups = new Map();
  let globalSum = 0;
  let globalCount = 0;
  for (const r of data) {
    const s = Number(r.score) || 0;
    const cost = Number(r.cost_usd) || 0;
    globalSum += s;
    globalCount += 1;
    const cur = groups.get(r.judge_model) || { count: 0, sum: 0, cost: 0 };
    cur.count += 1;
    cur.sum += s;
    cur.cost += cost;
    groups.set(r.judge_model, cur);
  }
  const globalAvg = globalCount > 0 ? globalSum / globalCount : 0;
  return Array.from(groups.entries())
    .map(([model, { count, sum, cost }]) => ({
      model,
      count,
      avg: count > 0 ? sum / count : 0,
      cost,
      calibrationDelta: (count > 0 ? sum / count : 0) - globalAvg,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * All ranked items for a kind, sorted by avg_score desc (flat list).
 * Used by the new flat leaderboard page (LMArena-style).
 */
/**
 * Average axes (correctness/format/completeness/usefulness/depth) per subject.
 * Aggregates across ALL judges + ALL tasks. Returns Map<subjectId, {axes}>.
 * 2-step query to dodge the PostgREST embedded-filter footgun.
 */
async function getAxesAvgBySubject(sb, kind /* unused subjectIds for compat */) {
  const { data, error } = await sb.rpc("axes_by_subject", { p_kind: kind });
  if (error) {
    console.warn(`[rankings] axes_by_subject RPC failed: ${error.message}`);
    return new Map();
  }
  const result = new Map();
  for (const row of data || []) {
    result.set(row.subject_id, {
      instruction_following: Number(row.instruction_following),
      correctness: Number(row.correctness),
      completeness: Number(row.completeness),
      usefulness: Number(row.usefulness),
      safety: Number(row.safety),
    });
  }
  return result;
}

export async function getAllRankings(kind = "skill") {
  if (!HAS_SUPABASE) return [];
  const sb = await createSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("rankings")
    .select("subject_slug, subject_name, category, avg_score, task_count, successful_tasks, skill_id, claude_md_id")
    .eq("subject_kind", kind)
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false });
  if (error || !data) return [];
  const ids = data.map((r) => (kind === "skill" ? r.skill_id : r.claude_md_id)).filter(Boolean);
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const sel = kind === "skill"
    ? "id, slug, name, category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until"
    : "id, slug, description, project_category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until";
  const { data: details } = await sb.from(table).select(sel).in("id", ids);
  const byId = new Map((details || []).map((d) => [d.id, d]));
  const axesById = await getAxesAvgBySubject(sb, kind, ids);

  const benchedIds = new Set(ids);

  const benchedRows = data.map((r) => {
    const id = kind === "skill" ? r.skill_id : r.claude_md_id;
    const d = byId.get(id) || {};
    const meta = d.metadata || {};
    const axes = axesById.get(id) || null;
    let composite = Number(r.avg_score) || 0;
    if (axes) {
      const w = { instruction_following: 0.35, correctness: 0.30, completeness: 0.20, usefulness: 0.10, safety: 0.05 };
      let s = 0, wsum = 0;
      for (const k of Object.keys(w)) {
        if (axes[k] != null && Number.isFinite(axes[k])) {
          s += axes[k] * w[k];
          wsum += w[k];
        }
      }
      if (wsum > 0) composite = s / wsum;
    }
    return {
      slug: r.subject_slug,
      name: r.subject_name || d.name || d.slug,
      author: meta.author || meta.owner || null,
      category: r.category,
      categoryId: r.category,
      avg_score: composite,
      score: composite,
      elo: composite,
      signal: "bench", // ← differentiator for the UI badge
      task_count: r.task_count,
      tier: d.tier || "free",
      priceUsd: d.price_usd ?? null,
      verificationLevel: d.verification_level ?? 0,
      isOfficial: !!d.is_official,
      stars: d.github_stars ?? 0,
      promotedUntil: d.promoted_until || null,
      isBoosted: d.promoted_until ? new Date(d.promoted_until) > new Date() : false,
      taskCount: r.task_count || 0,
      successfulTasks: r.successful_tasks || 0,
      axes,
      delta: 0,
    };
  });

  // Quality-only rows : items with quality_score but no bench yet. Pulled from
  // the main table and slotted into the leaderboard with signal="quality" so
  // the UI can render a different badge + slightly muted styling.
  const qualityTable = kind === "skill" ? "skills" : "claude_md_files";
  const qualitySelect = kind === "skill"
    ? "id, slug, name, category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until, quality_score"
    : "id, slug, description, project_category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until, quality_score";
  const { data: qualityData } = await sb
    .from(qualityTable)
    .select(qualitySelect)
    .not("quality_score", "is", null)
    .order("quality_score", { ascending: false })
    .limit(2000);
  const qualityRows = (qualityData || [])
    .filter((d) => !benchedIds.has(d.id))
    .map((d) => {
      const meta = d.metadata || {};
      const q = Number(d.quality_score) || 0;
      return {
        slug: d.slug,
        name: d.name || d.slug,
        author: meta.author || meta.owner || null,
        category: kind === "skill" ? d.category : d.project_category,
        categoryId: kind === "skill" ? d.category : d.project_category,
        avg_score: q,
        score: q,
        elo: q,
        signal: "quality", // ← cold-start LLM-rate, no bench
        task_count: 0,
        tier: d.tier || "free",
        priceUsd: d.price_usd ?? null,
        verificationLevel: d.verification_level ?? 0,
        isOfficial: !!d.is_official,
        stars: d.github_stars ?? 0,
        promotedUntil: d.promoted_until || null,
        isBoosted: d.promoted_until ? new Date(d.promoted_until) > new Date() : false,
        taskCount: 0,
        successfulTasks: 0,
        axes: null,
        delta: 0,
      };
    });

  const rows = [...benchedRows, ...qualityRows];

  // Sort : bench first (within bench, by composite DESC), then quality (by
  // quality_score DESC). Tiebreak on stars then slug for stability.
  rows.sort((a, b) => {
    if (a.signal !== b.signal) return a.signal === "bench" ? -1 : 1;
    if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    return (a.slug || "").localeCompare(b.slug || "");
  });
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getCategoryRankings(category, kind = "skill") {
  if (!HAS_SUPABASE) return [];
  const sb = await createSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("rankings")
    .select("subject_slug, subject_name, category, avg_score, task_count, successful_tasks, skill_id, claude_md_id")
    .eq("subject_kind", kind)
    .eq("category", category)
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false });
  if (error || !data) return [];

  // Beef the rows avec les métadonnées du skill (tier, verification, author,
  // boost, etc.) — sinon SkillRow affiche NaN partout. On joint via une 2e
  // query parce que la matview rankings est trop slim.
  const ids = data.map((r) => (kind === "skill" ? r.skill_id : r.claude_md_id)).filter(Boolean);
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const sel = kind === "skill"
    ? "id, slug, name, category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until"
    : "id, slug, description, project_category, tier, price_usd, verification_level, is_official, github_stars, metadata, promoted_until";
  const { data: details } = await sb.from(table).select(sel).in("id", ids);
  const byId = new Map((details || []).map((d) => [d.id, d]));
  const axesById = await getAxesAvgBySubject(sb, kind, ids);

  const rows = data.map((r) => {
    const id = kind === "skill" ? r.skill_id : r.claude_md_id;
    const d = byId.get(id) || {};
    const meta = d.metadata || {};
    const axes = axesById.get(id) || null;
    let composite = Number(r.avg_score) || 0;
    if (axes) {
      const w = { instruction_following: 0.35, correctness: 0.30, completeness: 0.20, usefulness: 0.10, safety: 0.05 };
      let s = 0, wsum = 0;
      for (const k of Object.keys(w)) {
        if (axes[k] != null && Number.isFinite(axes[k])) {
          s += axes[k] * w[k];
          wsum += w[k];
        }
      }
      if (wsum > 0) composite = s / wsum;
    }
    return {
      slug: r.subject_slug,
      name: r.subject_name || d.name || d.slug,
      author: meta.author || meta.owner || null,
      category: r.category,
      categoryId: r.category,
      avg_score: composite,
      score: composite,
      elo: composite,
      task_count: r.task_count,
      tier: d.tier || "free",
      priceUsd: d.price_usd ?? null,
      verificationLevel: d.verification_level ?? 0,
      isOfficial: !!d.is_official,
      stars: d.github_stars ?? 0,
      promotedUntil: d.promoted_until || null,
      isBoosted: d.promoted_until ? new Date(d.promoted_until) > new Date() : false,
      taskCount: r.task_count || 0,
      successfulTasks: r.successful_tasks || 0,
      axes,
      delta: 0,
    };
  });
  rows.sort((a, b) => {
    if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    return (a.slug || "").localeCompare(b.slug || "");
  });
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Inter-judge disagreement summary for a subject. Reads all judge_scores
 * for outputs that came from this subject, groups by judge_model, returns
 * { perJudge, stdev, agreementLabel }. Empty arrays when bench hasn't run.
 *
 * `agreementLabel` :
 *   - high (stdev < 8) → judges agree, score is reliable
 *   - mid  (stdev 8-18) → typical spread, acceptable
 *   - low  (stdev > 18) → judges disagree, take score with a grain of salt
 */
export async function getJudgeDisagreement({ kind = "skill", subjectId }) {
  if (!HAS_SUPABASE || !subjectId) return null;
  const sb = await createSupabaseServerClient();
  if (!sb) return null;

  const { data, error } = await sb.rpc("judge_disagreement", {
    p_kind: kind,
    p_subject_id: subjectId,
  });
  if (error) {
    console.warn(`[rankings] judge_disagreement RPC failed: ${error.message}`);
    return null;
  }
  if (!data || data.length === 0) return null;

  const judges = data.map((row) => ({
    model: row.judge_model,
    count: row.score_count,
    avg: Number(row.avg_score) || 0,
    scores: [], // per-call scores no longer needed for the UI
    axes: row.axes && typeof row.axes === "object"
      ? Object.fromEntries(
          Object.entries(row.axes).map(([k, v]) => [
            k,
            v == null ? null : Number(v),
          ])
        )
      : null,
    sampleRationale: row.sample_rationale || null,
  }));

  // Stdev across judge avgs (not across individual scores — we want the
  // disagreement BETWEEN judges, not noise WITHIN one judge's calls).
  const judgeMeans = judges.map((j) => j.avg);
  const overallMean = judgeMeans.reduce((a, b) => a + b, 0) / judgeMeans.length;
  const variance =
    judgeMeans.reduce((acc, m) => acc + Math.pow(m - overallMean, 2), 0) /
    judgeMeans.length;
  const stdev = Math.sqrt(variance);
  const agreementLabel = stdev < 8 ? "high" : stdev <= 18 ? "mid" : "low";

  return { judges, stdev, overallMean, agreementLabel };
}

/**
 * Map of `<kind>:<slug>` → { rank, category, avg_score } across ALL
 * categories. Used by MarketplaceCard to show a "TOP N" badge when a skill
 * is in the top 3 / 5 / 10 of its category. One round-trip total.
 */
export async function getAllRanksBySlug() {
  if (!HAS_SUPABASE) return {};
  const sb = await createSupabaseServerClient();
  if (!sb) return {};
  const { data, error } = await sb
    .from("rankings")
    .select("subject_kind, subject_slug, category, avg_score")
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false });
  if (error || !data) return {};
  // Walk through, assigning rank-within-category. Data is already sorted
  // globally by avg_score desc — partition by (kind, category) then number.
  const counters = new Map();
  const out = {};
  for (const r of data) {
    const key = `${r.subject_kind}:${r.category}`;
    const next = (counters.get(key) || 0) + 1;
    counters.set(key, next);
    out[`${r.subject_kind}:${r.subject_slug}`] = {
      rank: next,
      category: r.category,
      avg_score: r.avg_score,
    };
  }
  return out;
}

/**
 * Top topics across the registry (skills + claude-md), aggregated from the
 * GitHub `topics` field on each repo. Used as an entry-point cloud on the
 * landing page — clicking sends to /marketplace?topics=<topic>.
 */
export async function getTopTopics(limit = 18) {
  const [skills, claudeMds] = await Promise.all([
    HAS_SUPABASE ? liveSkills() : Promise.resolve(SKILLS.map(withTierDefaults)),
    HAS_SUPABASE ? liveClaudeMds() : Promise.resolve(CLAUDE_MD_FILES),
  ]);
  const counts = new Map(); // topic → { skillCount, claudeCount }
  for (const it of skills || []) {
    const ts = Array.isArray(it.topics) ? it.topics : [];
    for (const t of ts) {
      if (!t || typeof t !== "string") continue;
      const cur = counts.get(t) || { skillCount: 0, claudeCount: 0 };
      cur.skillCount += 1;
      counts.set(t, cur);
    }
  }
  for (const it of claudeMds || []) {
    const ts = Array.isArray(it.topics) ? it.topics : [];
    for (const t of ts) {
      if (!t || typeof t !== "string") continue;
      const cur = counts.get(t) || { skillCount: 0, claudeCount: 0 };
      cur.claudeCount += 1;
      counts.set(t, cur);
    }
  }
  return [...counts.entries()]
    .map(([id, c]) => ({ id, count: c.skillCount + c.claudeCount, skillCount: c.skillCount, claudeCount: c.claudeCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Top topics restreint à un seul kind (skill ou claude_md). Utilisé par la
 * landing pour afficher 2 sections parallèles → fini le pb "MCP=218 mais
 * marketplace=130" car chaque chip = vraie stat du kind cliqué.
 */
export async function getTopTopicsByKind(kind, limit = 12) {
  const source = kind === "claude_md"
    ? (HAS_SUPABASE ? (await liveClaudeMds()) || [] : CLAUDE_MD_FILES)
    : (HAS_SUPABASE ? (await liveSkills()) || [] : SKILLS.map(withTierDefaults));
  const counts = new Map();
  for (const it of source) {
    const ts = Array.isArray(it.topics) ? it.topics : [];
    for (const t of ts) {
      if (!t || typeof t !== "string") continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

/**
 * Categories that actually have completed rankings (judges scored them).
 * Empty list until the bench engine runs a real cycle. Used by the
 * leaderboard which should NOT mix in unranked scraped items.
 */
export async function getLeaderboardCategories(kind = "skill") {
  if (!HAS_SUPABASE) return [];
  const sb = await createSupabaseServerClient();
  if (!sb) return [];
  const counts = new Map();

  // Benched item IDs (so we can exclude them from the quality count below)
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const { data: benched } = await sb
    .from("rankings")
    .select(`category, ${idCol}`)
    .eq("subject_kind", kind)
    .not("avg_score", "is", null);
  const benchedIds = new Set();
  for (const row of benched || []) {
    counts.set(row.category, (counts.get(row.category) || 0) + 1);
    if (row[idCol]) benchedIds.add(row[idCol]);
  }

  // Quality-only items (have quality_score, NOT already benched)
  const qualityTable = kind === "skill" ? "skills" : "claude_md_files";
  const catCol = kind === "skill" ? "category" : "project_category";
  const { data: qualityRows } = await sb
    .from(qualityTable)
    .select(`id, ${catCol}`)
    .not("quality_score", "is", null)
    .limit(5000);
  for (const row of qualityRows || []) {
    if (benchedIds.has(row.id)) continue; // already counted as benched
    const c = row[catCol];
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }

  const labels = kind === "skill" ? CATEGORY_LABELS : PROJECT_CATEGORY_LABELS;
  return [...counts.entries()].map(([id, count]) => ({
    id,
    label: labels[id] || id,
    count,
  }));
}

export function getCategoryIds() {
  return CATEGORIES.map((c) => c.id);
}

export async function getTopSkills(limit = 10) {
  const list = await getStandings();
  return list.slice(0, limit);
}

export async function getSkillBySlug(slug) {
  if (HAS_SUPABASE) {
    const sb = await createSupabaseServerClient();
    if (sb) {
      const { data, error } = await sb
        .from("skills")
        .select(
          "id, slug, name, description, category, github_url, github_stars, tier, price_usd, verification_level, is_official, metadata, skill_md_content, scraped_at, private_storage_path, promoted_until, quality_score, quality_rationale"
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) console.warn(`[rankings] getSkillBySlug live failed: ${error.message}`);
      if (!data) return null;
      const mapped = mapSkillRow(data);
      // Enrich avec les bench data si dispo (avg_score + task_count) pour
      // l'afficher dans le §01 Stats sur la skill detail page.
      const { data: ranking } = await sb
        .from("rankings")
        .select("avg_score, task_count, successful_tasks")
        .eq("subject_kind", "skill")
        .eq("skill_id", data.id)
        .maybeSingle();
      if (ranking?.avg_score != null) {
        // Pull the same composite (weighted from 5 axes) used by getAllRankings
        // so leaderboard and detail page always show the SAME number.
        const axesMap = await getAxesAvgBySubject(sb, "skill");
        const axes = axesMap.get(data.id) || null;
        const w = { instruction_following: 0.35, correctness: 0.30, completeness: 0.20, usefulness: 0.10, safety: 0.05 };
        let composite = Number(ranking.avg_score) || 0;
        if (axes) {
          let s = 0, wsum = 0;
          for (const k of Object.keys(w)) {
            if (axes[k] != null && Number.isFinite(axes[k])) {
              s += axes[k] * w[k];
              wsum += w[k];
            }
          }
          if (wsum > 0) composite = s / wsum;
        }
        mapped.benchScore = Math.round(composite * 100) / 100;
        mapped.taskCount = ranking.task_count || 0;
        mapped.successfulTasks = ranking.successful_tasks || 0;
        mapped.elo = mapped.benchScore;
      }
      return mapped;
    }
    return null;
  }
  const skill = SKILLS.find((s) => s.slug === slug);
  if (!skill) return null;
  const detail = SKILL_DETAILS[slug];
  return withTierDefaults({ ...skill, ...(detail || {}) });
}

export async function getFeaturedBattle() {
  // Real battles require bench engine output; null until then.
  return HAS_SUPABASE ? null : FEATURED_BATTLE;
}

export async function getBenchmarkMatrix() {
  if (HAS_SUPABASE) return { skills: [], suites: [] };
  return { skills: BENCHMARK_MATRIX, suites: TASK_SUITES };
}

export async function getSiblingSkills(slug, count = 4) {
  const list = await getStandings();
  const idx = list.findIndex((s) => s.slug === slug);
  if (idx === -1) return [];
  const before = list.slice(Math.max(0, idx - count), idx);
  const after = list.slice(idx + 1, idx + 1 + count);
  return [...before, ...after];
}

/* ---------- CLAUDE.md leaderboard queries ---------- */

export async function getProjectCategories() {
  if (!HAS_SUPABASE) return PROJECT_CATEGORIES;
  const list = (await liveClaudeMds()) || [];
  return buildCategoryList(list, "project_category", PROJECT_CATEGORY_LABELS).filter(
    (c) => c.id !== "all"
  );
}

export function getProjectCategoryIds() {
  return PROJECT_CATEGORIES.map((c) => c.id);
}

export async function getClaudeMds(category) {
  let list;
  if (HAS_SUPABASE) {
    list = (await liveClaudeMds()) || [];
  } else {
    list = CLAUDE_MD_FILES;
  }
  if (!category) return list;
  return list.filter((c) => c.project_category === category);
}

export async function getClaudeMdBySlug(slug) {
  if (HAS_SUPABASE) {
    const sb = await createSupabaseServerClient();
    if (sb) {
      const { data, error } = await sb
        .from("claude_md_files")
        .select(
          "id, slug, description, project_category, github_url, github_stars, word_count, tier, price_usd, verification_level, is_official, metadata, content, scraped_at, quality_score, quality_rationale, promoted_until, private_storage_path"
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) console.warn(`[rankings] getClaudeMdBySlug live failed: ${error.message}`);
      if (!data) return null;
      const mapped = mapClaudeMdRow(data);
      // Enrich with bench data (avg_score + task_count) so the detail page §01
      // can show the real bench score with full precision.
      const { data: ranking } = await sb
        .from("rankings")
        .select("avg_score, task_count, successful_tasks")
        .eq("subject_kind", "claude_md")
        .eq("claude_md_id", data.id)
        .maybeSingle();
      if (ranking?.avg_score != null) {
        const axesMap = await getAxesAvgBySubject(sb, "claude_md");
        const axes = axesMap.get(data.id) || null;
        const w = { instruction_following: 0.35, correctness: 0.30, completeness: 0.20, usefulness: 0.10, safety: 0.05 };
        let composite = Number(ranking.avg_score) || 0;
        if (axes) {
          let s = 0, wsum = 0;
          for (const k of Object.keys(w)) {
            if (axes[k] != null && Number.isFinite(axes[k])) {
              s += axes[k] * w[k];
              wsum += w[k];
            }
          }
          if (wsum > 0) composite = s / wsum;
        }
        mapped.benchScore = Math.round(composite * 100) / 100;
        mapped.taskCount = ranking.task_count || 0;
        mapped.successfulTasks = ranking.successful_tasks || 0;
        mapped.elo = mapped.benchScore;
      }
      return mapped;
    }
    return null;
  }
  return CLAUDE_MD_FILES.find((c) => c.slug === slug) || null;
}

/* ---------- helpers ---------- */

function buildCategoryList(items, key, labels = CATEGORY_LABELS) {
  const counts = new Map();
  for (const it of items) {
    const k = it[key];
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return [
    { id: "all", label: "All", count: items.length },
    ...sorted.map(([id, count]) => ({
      id,
      label: labels[id] || id,
      count,
    })),
  ];
}
