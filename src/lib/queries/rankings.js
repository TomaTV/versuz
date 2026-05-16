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
import { unstable_cache } from "next/cache";
import { CLAUDE_MD_FILES, PROJECT_CATEGORIES } from "@/lib/fixtures/claude-md";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { computePrior } from "@/lib/utils";
import { fetchContentByPath } from "@/lib/content/storage";

// Cache TTLs for unstable_cache wrappers below.
// 60s = filter-dependent queries (marketplace pagination with searchParams)
// 300s = stable aggregates (category counts, sources, ranks-by-slug)
// 1800s = quasi-static (topics, recent upsets, sibling lists — bench cycle is daily)
const CACHE_TTL_HOT = 60;
const CACHE_TTL_STABLE = 300;
const CACHE_TTL_LONG = 1800;

const HAS_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const CATEGORY_LABELS = {
  // V0 / V1 canonical buckets
  document: "Document",
  sql: "SQL",
  data: "Data",
  web: "Web",
  shell: "Shell",
  code: "Code",
  // V1.5 agent-specific buckets (migration 0040 + classifier v3).
  "claude-skill": "Claude skill",
  codex: "Codex",
  "cursor-rule": "Cursor rule",
  "windsurf-rule": "Windsurf rule",
  antigravity: "Antigravity",
  "mcp-server": "MCP server",
  "continue-rule": "Continue rule",
  "roo-code": "Roo Code",
  cline: "Cline",
  // V1.5+ broader content buckets — catch the long-tail of "other" items.
  writing: "Writing",
  design: "Design",
  marketing: "Marketing",
  automation: "Automation",
  research: "Research",
  // V1.5++ service/platform/macOS/comms/media/testing/devops buckets
  "api-integration": "API integration",
  macos: "macOS",
  communication: "Communication",
  media: "Media",
  testing: "Testing",
  devops: "DevOps",
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
    byteCount: row.byte_count ?? null,
    forks: meta.forks ?? null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    pushedAt: meta.pushed_at || null,
    installs: null,
    rank: null,
    elo: null,
    metadata: meta,
    skill_md_content: row.skill_md_content || null,
    contentPath: row.content_path || null,
    tier: row.tier || "free",
    priceUsd: row.price_usd,
    verificationLevel: row.verification_level ?? 0,
    isOfficial: !!row.is_official,
    source: row.source || "github",
    benchTier: row.bench_tier ?? null,
    privateStoragePath: row.private_storage_path || null,
    promotedUntil: row.promoted_until || null,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    qualityRationale: row.quality_rationale || null,
    licenseSpdx: row.license_spdx || meta.license || null,
    categories: Array.isArray(row.categories) && row.categories.length > 0
      ? row.categories
      : (row.category ? [row.category] : []),
    streakDays: row.top_rank_streak_days || 0,
    streakCategory: row.top_rank_streak_category || null,
    streakStartedAt: row.top_rank_streak_started_at || null,
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
    byteCount: row.byte_count ?? null,
    stars: row.github_stars || 0,
    forks: meta.forks ?? null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    pushedAt: meta.pushed_at || null,
    installs: null,
    rank: null,
    metadata: meta,
    content: row.content || null,
    contentPath: row.content_path || null,
    tier: row.tier || "free",
    priceUsd: row.price_usd,
    verificationLevel: row.verification_level ?? 0,
    isOfficial: !!row.is_official,
    source: row.source || "github",
    benchTier: row.bench_tier ?? null,
    promotedUntil: row.promoted_until || null,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    qualityRationale: row.quality_rationale || null,
    licenseSpdx: row.license_spdx || meta.license || null,
    categories: Array.isArray(row.categories) && row.categories.length > 0
      ? row.categories
      : (row.project_category ? [row.project_category] : []),
    streakDays: row.top_rank_streak_days || 0,
    streakCategory: row.top_rank_streak_category || null,
    streakStartedAt: row.top_rank_streak_started_at || null,
  };
  base.prior = computePrior(base);
  base.isBoosted = base.promotedUntil ? new Date(base.promotedUntil) > new Date() : false;
  return base;
}

// `cache()` dedupes within a single request: calling liveSkills() multiple
// times during one page render hits Supabase exactly once.
//
// SCALE NOTE (V1.5+ ~100k items) : liveSkills / liveClaudeMds cappent à 2000
// rows max (was 20000). Suffit pour topics aggregation + sitemap top + sibling
// skills. Pour le marketplace, on utilise getPaginatedItems (range + count
// exact). Pour la landing top N, on utilise getTopRankedItems (LIMIT N).
// Pour les counts, getCategoryCounts / getIndexCounts (count head:true).
const LIVE_FETCH_CAP = 2000;
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
  const sb = createSupabasePublicClient();
  if (!sb) return items;
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const ids = items.map((it) => it.id).filter(Boolean);
  if (ids.length === 0) return items;
  const { data } = await sb
    .from("rankings")
    .select("skill_id, claude_md_id, avg_score, task_count")
    .eq("subject_kind", kind)
    .in(idCol, ids)
    .not("avg_score", "is", null);
  if (!data) return items;
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

/* ──────── Server-side paginated query for /marketplace ──────── */
const MARKETPLACE_PAGE_SIZE = 50;

async function getPaginatedItemsInternal(kind = "skill", params = {}) {
  if (!HAS_SUPABASE) {
    const items = kind === "skill" ? SKILLS.map(withTierDefaults) : CLAUDE_MD_FILES;
    return { items, total: items.length, page: 1, totalPages: 1 };
  }
  const sb = createSupabasePublicClient();
  if (!sb) return { items: [], total: 0, page: 1, totalPages: 1 };

  const page = Math.max(1, Number(params.page) || 1);
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const select = kind === "skill"
    ? "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
    : "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";

  let q = sb.from(table).select(select, { count: "exact" });

  // CLAUDE.md stub filter
  if (kind === "claude_md") {
    q = q.or("word_count.gte.40,word_count.is.null");
  }

  // Category filter — single bucket (la migration 0040 multi-cat n'est pas
  // encore appliquée en prod). À ré-activer quand `categories` jsonb existe :
  //   q = q.or(`categories.cs.["${cat}"],${catCol}.eq.${cat}`);
  const cat = params.cat;
  if (cat && cat !== "all") {
    const catCol = kind === "skill" ? "category" : "project_category";
    q = q.eq(catCol, cat);
  }

  // Tier filter
  if (params.tier && params.tier !== "all") {
    q = q.eq("tier", params.tier);
  }

  // Verification filter
  if (params.verified && params.verified !== "any") {
    q = q.gte("verification_level", Number(params.verified));
  }

  // Official filter
  if (params.official === "true") {
    q = q.eq("is_official", true);
  }

  // Quality filter
  if (params.quality && params.quality !== "any") {
    q = q.gte("quality_score", Number(params.quality));
  }

  // Source filter — the raw `source` column has many legacy values
  // (github-search, github-mass, mega-github, web-directory, etc.). We
  // can't `.eq("source", "github")` directly because that'd only match
  // 3k of 58k actual GitHub items. Map the canonical filter ids to ILIKE
  // patterns that catch all variants.
  if (params.source && params.source !== "any") {
    const s = params.source;
    if (s === "github") {
      q = q.ilike("source", "%github%");
    } else if (s === "sourcegraph") {
      q = q.ilike("source", "%sourcegraph%");
    } else if (s === "grepapp") {
      q = q.ilike("source", "%grep%");
    } else if (s === "gitlab") {
      q = q.ilike("source", "%gitlab%");
    } else if (s === "web-directory") {
      q = q.ilike("source", "%directory%");
    } else if (s === "aggregator") {
      q = q.or("source.ilike.%aggregator%,source.ilike.%awesome%");
    } else if (s === "submit") {
      q = q.or("source.eq.submit,source.ilike.submit:%");
    } else if (s === "cli") {
      q = q.or("source.eq.cli,source.ilike.cli:%");
    }
    // "other" → no good way to express NOT-in-any-known-pattern via
    // PostgREST. Skip server filter; client-side normalizeSource will
    // refine the visible page.
  }

  // Topics filter — server-side via metadata->'topics' @> jsonb_array.
  // Index GIN sur metadata créé en migration 0037.
  // Accept comma-separated `?topics=a,b,c` (AND semantic — must match all).
  let topicsArr = [];
  if (params.topics) {
    topicsArr = String(params.topics)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (topicsArr.length > 0) {
    const jsonbArr = JSON.stringify(topicsArr);
    q = q.filter("metadata->topics", "cs", jsonbArr);
  }

  // Bundle filter — considers BOTH signals to match what users see :
  //   1. is_bundled (migration 0044) : skill_type='bundled' archetype
  //   2. repo_skill_count > 1 (migration 0046) : the repo has multiple skills
  // A "bundle" badge appears on the card if EITHER is true (see marketplace-card
  // "X in bundle" pill). The filter mirrors that union :
  //   - "bundle" → is_bundled=true OR repo_skill_count>1
  //   - "single" → is_bundled=false AND repo_skill_count<=1
  if (kind === "skill" && params.bundle && params.bundle !== "any") {
    if (params.bundle === "bundle") {
      q = q.or("is_bundled.eq.true,repo_skill_count.gt.1");
    } else if (params.bundle === "single") {
      q = q.eq("is_bundled", false).lte("repo_skill_count", 1);
    }
  }

  // Token bucket — for claude_md uses the indexed `word_count` generated
  // column. For skills uses `metadata.byte_count` (backfilled from Storage
  // object size via backfill-byte-counts.mjs). approxTokens = bytes / 4.
  if (params.tokens && params.tokens !== "any") {
    const tok = params.tokens;
    if (kind === "claude_md") {
      if (tok === "small") {
        q = q.gt("word_count", 0).lt("word_count", 385);
      } else if (tok === "medium") {
        q = q.gte("word_count", 385).lte("word_count", 1539);
      } else if (tok === "large") {
        q = q.gt("word_count", 1539);
      }
    } else if (kind === "skill") {
      // Bytes thresholds = tokens × 4. Uses the indexed `byte_count`
      // generated column (migration 0048) — integer compare, not the
      // string compare on metadata->>byte_count which was broken.
      if (tok === "small") {
        q = q.gt("byte_count", 0).lt("byte_count", 2000);
      } else if (tok === "medium") {
        q = q.gte("byte_count", 2000).lte("byte_count", 8000);
      } else if (tok === "large") {
        q = q.gt("byte_count", 8000);
      }
    }
  }

  // Search
  if (params.q) {
    const term = `%${params.q}%`;
    if (kind === "skill") {
      q = q.or(`name.ilike.${term},slug.ilike.${term},description.ilike.${term}`);
    } else {
      q = q.or(`slug.ilike.${term},description.ilike.${term}`);
    }
  }

  // Sort
  const sort = params.sort || "prior";
  if (sort === "stars") {
    q = q.order("github_stars", { ascending: false, nullsFirst: false });
  } else if (sort === "quality") {
    q = q.order("quality_score", { ascending: false, nullsFirst: false });
  } else if (sort === "name") {
    q = q.order(kind === "skill" ? "name" : "slug", { ascending: true });
  } else {
    // prior / elo / recent / default — composite server sort
    q = q.order("promoted_until", { ascending: false, nullsFirst: false })
         .order("verification_level", { ascending: false })
         .order("github_stars", { ascending: false, nullsFirst: false })
         .order(kind === "skill" ? "name" : "slug", { ascending: true });
  }

  // Pagination
  const from = (page - 1) * MARKETPLACE_PAGE_SIZE;
  const to = from + MARKETPLACE_PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.warn(`[rankings] paginated ${kind} query failed: ${error.message}`);
    return { items: [], total: 0, page, totalPages: 0 };
  }

  const mapper = kind === "skill" ? mapSkillRow : mapClaudeMdRow;
  let mapped = (data || []).map(mapper);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / MARKETPLACE_PAGE_SIZE));

  // Infer owner/repo from github URL when metadata is empty (common on scraped rows).
  for (const it of mapped) {
    if (it.metadata?.owner && it.metadata?.repo) continue;
    const url =
      typeof it.github === "string" && it.github
        ? it.github.startsWith("http")
          ? it.github
          : `https://${it.github}`
        : null;
    const p = parseGithubOwnerRepo(url || "");
    if (p.owner && p.repo) {
      it.metadata = { ...it.metadata, owner: p.owner, repo: p.repo };
    }
  }

  // Apply repo skill count enrichment (needed for bundle filter)
  mapped = applyRepoSkillCount(mapped);

  // Enrich with bench scores
  mapped = await enrichWithBenchScores(mapped, kind);

  return { items: mapped, total, page, totalPages };
}

/**
 * Public wrapper : cached 60s via Next.js unstable_cache. Cache key is
 * derived from (kind, params) — each unique filter combination gets its own
 * cache entry. Hot filters (default landing, "Free", "Featured") stay warm.
 * Cold combinations pay the DB cost only every 60s.
 *
 * Why 60s : marketplace counts/items are eventually-consistent, a minute
 * lag on rank/scores is fine. The cycle completes once a day at 06:00 UTC
 * so realtime is overkill.
 */
export const getPaginatedItems = unstable_cache(
  getPaginatedItemsInternal,
  ["paginated-items"],
  { revalidate: CACHE_TTL_HOT, tags: ["paginated-items", "marketplace"] }
);

/** Parse owner/repo from github.com HTTPS or git@github.com SSH URLs. */
export function parseGithubOwnerRepo(githubUrl) {
  if (!githubUrl || typeof githubUrl !== "string") return { owner: null, repo: null };
  const s = githubUrl.trim();
  const ssh = s.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const tail = s.replace(/^https?:\/\//i, "");
  const https = tail.match(/^[^/]*github\.com\/([^/]+)\/([^/?#]+)/i);
  if (https) return { owner: https[1], repo: https[2].replace(/\.git$/i, "") };
  return { owner: null, repo: null };
}

function uniqRowsById(rows) {
  const m = new Map();
  for (const r of rows) {
    if (r?.id) m.set(r.id, r);
  }
  return [...m.values()];
}

/**
 * Skills + CLAUDE.md for one GitHub repo. Matches metadata.owner/repo OR
 * github_url containing github.com/owner/repo (many scraped rows lack metadata).
 * Used by `/repo/[owner]/[repo]` and detail-page navigation.
 */
export async function getRegistryByRepo(ownerRaw, repoRaw) {
  const owner = decodeURIComponent(String(ownerRaw || "").trim());
  const repo = decodeURIComponent(String(repoRaw || "").trim());
  if (!owner || !repo) return { skills: [], claudeMds: [], owner: ownerRaw, repo: repoRaw };

  if (!HAS_SUPABASE) {
    return { skills: [], claudeMds: [], owner, repo };
  }
  const sb = createSupabasePublicClient();
  if (!sb) return { skills: [], claudeMds: [], owner, repo };

  const skillSel =
    "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";
  const claudeSel =
    "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";

  const ghLike = `%github.com/${owner}/${repo}%`;

  const [
    { data: skillMeta, error: eSkillMeta },
    { data: skillUrl, error: eSkillUrl },
    { data: claudeMeta, error: eClaudeMeta },
    { data: claudeUrl, error: eClaudeUrl },
  ] = await Promise.all([
    sb
      .from("skills")
      .select(skillSel)
      .filter("metadata->>owner", "ilike", owner)
      .filter("metadata->>repo", "ilike", repo)
      .order("name", { ascending: true }),
    sb.from("skills").select(skillSel).ilike("github_url", ghLike).order("name", { ascending: true }),
    sb
      .from("claude_md_files")
      .select(claudeSel)
      .filter("metadata->>owner", "ilike", owner)
      .filter("metadata->>repo", "ilike", repo)
      .or("word_count.gte.40,word_count.is.null")
      .order("slug", { ascending: true }),
    sb
      .from("claude_md_files")
      .select(claudeSel)
      .ilike("github_url", ghLike)
      .or("word_count.gte.40,word_count.is.null")
      .order("slug", { ascending: true }),
  ]);

  if (eSkillMeta) console.warn(`[rankings] getRegistryByRepo skills meta: ${eSkillMeta.message}`);
  if (eSkillUrl) console.warn(`[rankings] getRegistryByRepo skills url: ${eSkillUrl.message}`);
  if (eClaudeMeta) console.warn(`[rankings] getRegistryByRepo claude meta: ${eClaudeMeta.message}`);
  if (eClaudeUrl) console.warn(`[rankings] getRegistryByRepo claude url: ${eClaudeUrl.message}`);

  const skillRows = uniqRowsById([...(skillMeta || []), ...(skillUrl || [])]).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );
  const claudeRows = uniqRowsById([...(claudeMeta || []), ...(claudeUrl || [])]).sort((a, b) =>
    (a.slug || "").localeCompare(b.slug || "")
  );

  let skills = skillRows.map(mapSkillRow);
  let claudeMds = claudeRows.map(mapClaudeMdRow);
  skills = await enrichWithBenchScores(skills, "skill");
  claudeMds = await enrichWithBenchScores(claudeMds, "claude_md");

  return { skills, claudeMds, owner, repo };
}

/**
 * Lightweight category counts for the marketplace pills.
 * Uses individual count queries per category to avoid 1000 row limit.
 * Cached 300s via Next.js unstable_cache.
 *
 * Two separate cached wrappers (one per kind) to give each its own explicit
 * cache key — relying on auto-derived arg keys was returning empty for the
 * skill kind in prod (probable cache key collision). Splitting eliminates
 * any ambiguity.
 */
async function getCategoryCountsImpl(kind) {
  if (!HAS_SUPABASE) {
    if (kind === "skill") return CATEGORIES;
    return PROJECT_CATEGORIES;
  }
  const sb = createSupabasePublicClient();
  if (!sb) return [];

  const table = kind === "skill" ? "skills" : "claude_md_files";
  const catCol = kind === "skill" ? "category" : "project_category";
  const labels = kind === "skill" ? CATEGORY_LABELS : PROJECT_CATEGORY_LABELS;

  const { data, error } = await sb.rpc("get_category_counts", {
    p_table: table,
    p_cat_col: catCol,
    p_kind: kind,
  });
  // RPC intermittently 500s on Supabase Free under load. Returning []
  // poisons the unstable_cache for 300s, which 404s every page that
  // validates a slug against this list (e.g. /best/[kind]/[category]).
  // Fall back to the static fixture so SSR keeps rendering.
  if (error || !data || data.length === 0) {
    if (error) console.warn(`[getCategoryCounts] RPC failed for ${kind}: ${error.message}`);
    return kind === "skill" ? CATEGORIES : PROJECT_CATEGORIES;
  }
  const counts = (data || []).map((r) => ({
    category: r.category,
    count: Number(r.count) || 0,
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const sorted = counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  return [
    { id: "all", label: "All", count: total },
    ...sorted.map((c) => ({ id: c.category, label: labels[c.category] || c.category, count: c.count })),
  ];
}

const getCategoryCountsSkillCached = unstable_cache(
  () => getCategoryCountsImpl("skill"),
  ["category-counts:skill"],
  { revalidate: CACHE_TTL_STABLE, tags: ["category-counts", "category-counts:skill"] }
);
const getCategoryCountsClaudeMdCached = unstable_cache(
  () => getCategoryCountsImpl("claude_md"),
  ["category-counts:claude_md"],
  { revalidate: CACHE_TTL_STABLE, tags: ["category-counts", "category-counts:claude_md"] }
);

export async function getCategoryCounts(kind = "skill") {
  return kind === "claude_md" ? getCategoryCountsClaudeMdCached() : getCategoryCountsSkillCached();
}

/**
 * Distinct normalized source values present in the DB, with counts.
 * Used to populate the marketplace Source filter — hides options that have
 * 0 items (avoids "GitLab" / "Manual" buckets that no scraper ever wrote
 * to). Normalization mirrors the client-side normalizeSource() so the
 * filter ids align.
 *
 * Returns : [{ id: "github", count: 12345 }, { id: "sourcegraph", count: 423 }, ...]
 */
async function getAvailableSourcesImpl(kind) {
  if (!HAS_SUPABASE) return [];
  const sb = createSupabasePublicClient();
  if (!sb) return [];
  const table = kind === "skill" ? "skills" : "claude_md_files";

  // 7 count-only queries (head:true) en parallèle, par bucket canonique
  // via ILIKE. Au lieu de paginer 100k rows séquentiellement (5-7s sur
  // Supabase Free), on demande à Postgres le count direct par pattern.
  // ~100ms total avec un index trigram ou btree sur lower(source).
  const buckets = [
    { id: "github", pattern: "%github%" },
    { id: "sourcegraph", pattern: "%sourcegraph%" },
    { id: "grepapp", pattern: "%grep%" },
    { id: "gitlab", pattern: "%gitlab%" },
    { id: "aggregator", pattern: "%aggregator%" },
    { id: "web-directory", pattern: "%directory%" },
    { id: "submit", pattern: "submit%" },
    { id: "cli", pattern: "cli%" },
  ];

  const results = await Promise.all(
    buckets.map(async ({ id, pattern }) => {
      const { count } = await sb
        .from(table)
        .select("id", { count: "exact", head: true })
        .ilike("source", pattern);
      return { id, count: count || 0 };
    })
  );

  return results
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
}

const getAvailableSourcesSkillCached = unstable_cache(
  () => getAvailableSourcesImpl("skill"),
  ["available-sources:skill"],
  { revalidate: CACHE_TTL_STABLE, tags: ["available-sources", "available-sources:skill"] }
);
const getAvailableSourcesClaudeMdCached = unstable_cache(
  () => getAvailableSourcesImpl("claude_md"),
  ["available-sources:claude_md"],
  { revalidate: CACHE_TTL_STABLE, tags: ["available-sources", "available-sources:claude_md"] }
);

export async function getAvailableSources(kind = "skill") {
  return kind === "claude_md" ? getAvailableSourcesClaudeMdCached() : getAvailableSourcesSkillCached();
}

/**
 * Top N rows for live<Kind> consumers. Cappé à LIVE_FETCH_CAP (2000) — assez
 * pour topics aggregation, top skills sibling list, sitemap top entries.
 * Pour le marketplace plein, voir getPaginatedItems. Pour landing top 10,
 * voir getTopRankedItems.
 */
// Top 2000 skills/claude_md — used by landing, sitemap, getTopTopics, sibling
// strip. Cached 300s cross-request via unstable_cache so multiple consumers
// share the same fetched batch instead of each hitting Supabase.
const liveSkills = unstable_cache(async () => {
  const sb = createSupabasePublicClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("skills")
    .select(
      "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
    )
    .order("promoted_until", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(LIVE_FETCH_CAP);
  if (error) {
    console.warn(`[rankings] live skills failed: ${error.message}`);
    return null;
  }
  const mapped = applyRepoSkillCount((data || []).map(mapSkillRow));
  return enrichWithBenchScores(mapped, "skill");
}, ["live-skills"], { revalidate: CACHE_TTL_STABLE, tags: ["live-skills", "marketplace"] });

const liveClaudeMds = unstable_cache(async () => {
  const sb = createSupabasePublicClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("claude_md_files")
    .select(
      "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
    )
    .or("word_count.gte.40,word_count.is.null")
    .order("promoted_until", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: true })
    .limit(LIVE_FETCH_CAP);
  if (error) {
    console.warn(`[rankings] live claude_md failed: ${error.message}`);
    return null;
  }
  const mapped = applyRepoSkillCount((data || []).map(mapClaudeMdRow));
  return enrichWithBenchScores(mapped, "claude_md");
}, ["live-claude-mds"], { revalidate: CACHE_TTL_STABLE, tags: ["live-claude-mds", "marketplace"] });

/**
 * Landing top N skills in a category. Pas de chunked fetch — une seule query
 * filtered + ORDER BY indexed (migration 0037 skills_marketplace_default_idx).
 * Utilisé par page.js qui faisait `getStandings("document").slice(0, 10)`.
 */
/**
 * Pull the top N items that were *actually benched* in a given category scope.
 * Critical distinction vs getTopRankedItems : the cycle scope category in the
 * `rankings` materialized view is INDEPENDENT from the skill's primary
 * `skills.category` (e.g. peekaboo has skill.category='macos' but was
 * benched under cycle scope 'sql'). For the home leaderboard we want skills
 * grouped by bench scope, not native taxonomy.
 *
 * Returns enriched skill rows ordered by avg_score desc, with elo stamped.
 */
export async function getBenchedTopByCategory(kind = "skill", category, limit = 10) {
  if (!HAS_SUPABASE || !category) return [];
  const sb = createSupabasePublicClient();
  if (!sb) return [];

  // 1. Pull ranking rows for this bench scope, sorted by score.
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const { data: rows } = await sb
    .from("rankings")
    .select(`${idCol}, avg_score, task_count`)
    .eq("subject_kind", kind)
    .eq("category", category)
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];

  // 2. Fetch the skill / claude_md metadata for those ids.
  const ids = rows.map((r) => r[idCol]).filter(Boolean);
  if (ids.length === 0) return [];
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const sel = kind === "skill"
    ? "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
    : "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";
  const { data: details } = await sb
    .from(table)
    .select(sel)
    .in("id", ids)
    .eq("is_archived", false);
  if (!details) return [];

  // 3. Pull per-axis breakdown so the leaderboard rows can show the
  // Instruction / Correctness / Completeness / Usefulness / Safety values
  // (otherwise SkillRow renders "—" in those columns).
  const axesById = await getAxesAvgBySubject(sb, kind);

  // 4. Map + stamp elo + axes + recomputed composite score, ordered by
  // bench score desc.
  const mapper = kind === "skill" ? mapSkillRow : mapClaudeMdRow;
  const byId = new Map(details.map((d) => [d.id, mapper(d)]));
  const W = { instruction_following: 0.35, correctness: 0.3, completeness: 0.2, usefulness: 0.1, safety: 0.05 };
  return rows
    .map((r, i) => {
      const item = byId.get(r[idCol]);
      if (!item) return null;
      const axes = axesById.get(r[idCol]) || null;
      let composite = Number(r.avg_score) || 0;
      if (axes) {
        let s = 0;
        let wsum = 0;
        for (const k of Object.keys(W)) {
          if (axes[k] != null && Number.isFinite(axes[k])) {
            s += axes[k] * W[k];
            wsum += W[k];
          }
        }
        if (wsum > 0) composite = s / wsum;
      }
      const elo = Math.round(composite * 100) / 100;
      return {
        ...item,
        elo,
        score: elo,
        avg_score: elo,
        axes,
        signal: "bench",
        benchTaskCount: r.task_count || 0,
        rank: i + 1,
      };
    })
    .filter(Boolean);
}

export const getTopRankedItems = unstable_cache(async (kind = "skill", category = null, limit = 10) => {
  if (!HAS_SUPABASE) {
    const list = kind === "skill" ? SKILLS.map(withTierDefaults) : CLAUDE_MD_FILES;
    const filtered = category
      ? list.filter((s) =>
          ((s.category || s.categoryId || s.project_category) || "").toLowerCase() === category.toLowerCase()
        )
      : list;
    return filtered.slice(0, limit);
  }
  const sb = createSupabasePublicClient();
  if (!sb) return [];
  const table = kind === "skill" ? "skills" : "claude_md_files";
  const sel = kind === "skill"
    ? "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
    : "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";
  let q = sb.from(table).select(sel);
  if (category) {
    q = q.eq(kind === "skill" ? "category" : "project_category", category);
  }
  if (kind === "claude_md") {
    q = q.or("word_count.gte.40,word_count.is.null");
  }
  q = q
    .order("promoted_until", { ascending: false, nullsFirst: false })
    .order("verification_level", { ascending: false })
    .order("github_stars", { ascending: false, nullsFirst: false })
    .order(kind === "skill" ? "name" : "slug", { ascending: true })
    .limit(limit);
  const { data, error } = await q;
  if (error) {
    console.warn(`[rankings] getTopRankedItems ${kind}/${category}: ${error.message}`);
    return [];
  }
  const mapper = kind === "skill" ? mapSkillRow : mapClaudeMdRow;
  const mapped = applyRepoSkillCount((data || []).map(mapper));
  return enrichWithBenchScores(mapped, kind);
}, ["top-ranked-items"], { revalidate: CACHE_TTL_STABLE, tags: ["top-ranked", "marketplace"] });

// Helper : race une promise contre un timeout. Si la promise n'arrive pas
// dans `ms`, retourne `fallback`. Utilisé pour les fetches Supabase pendant
// le build Vercel — si Supabase est en panne, on ne veut pas que le build
// timeout entier (60s × 3 attempts) ; on dégrade vers null et on continue.
async function raceWithTimeout(promise, ms, fallback = null) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const getCurrentCycle = unstable_cache(async () => {
  if (!HAS_SUPABASE) return CYCLE;
  const sb = createSupabasePublicClient();
  if (!sb) return null;

  // Cap chaque fetch à 5s. Si Supabase répond pas (panne, free tier saturé),
  // le ticker fallback à "idle" — bien meilleur qu'un build Vercel qui
  // timeout à 60s par page.
  const FETCH_TIMEOUT = 5000;

  try {
    const running = await raceWithTimeout(
      sb
        .from("cycles")
        .select("id, scope, started_at, status")
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data),
      FETCH_TIMEOUT
    );

    if (running) {
      const recentRanks = await raceWithTimeout(
        sb
          .from("rankings")
          .select("subject_slug, subject_name, avg_score")
          .not("avg_score", "is", null)
          .order("avg_score", { ascending: false })
          .limit(5)
          .then((r) => r.data),
        FETCH_TIMEOUT,
        []
      );
      return {
        id: running.id,
        scope: running.scope,
        startedAt: running.started_at,
        status: "running",
        recent: (recentRanks || []).map((r) => `${r.subject_name || r.subject_slug} · ${Number(r.avg_score).toFixed(1)}`),
        nextTick: "live",
      };
    }

    const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lastCompleted = await raceWithTimeout(
      sb
        .from("cycles")
        .select("id, scope, completed_at")
        .eq("status", "completed")
        .gte("completed_at", SEVEN_DAYS_AGO)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data),
      FETCH_TIMEOUT
    );

    if (lastCompleted) {
      const recentRanks = await raceWithTimeout(
        sb
          .from("rankings")
          .select("subject_slug, subject_name, avg_score")
          .not("avg_score", "is", null)
          .order("avg_score", { ascending: false })
          .limit(5)
          .then((r) => r.data),
        FETCH_TIMEOUT,
        []
      );
      return {
        id: lastCompleted.id,
        scope: lastCompleted.scope,
        completedAt: lastCompleted.completed_at,
        status: "completed",
        recent: (recentRanks || []).map((r) => `${r.subject_name || r.subject_slug} · ${Number(r.avg_score).toFixed(1)}`),
        nextTick: "—",
      };
    }
  } catch (err) {
    console.warn(`[rankings] getCurrentCycle failed: ${err.message}`);
  }

  return null;
}, ["current-cycle"], { revalidate: CACHE_TTL_STABLE, tags: ["current-cycle"] });
// CACHE_TTL_STABLE (300s) au lieu de HOT (60s) : VzTicker tape ce helper
// depuis le layout global. Sa TTL propage vers TOUTES les pages en ISR
// — `/`, `/about`, `/faq`, `/changelog`, `/methodology`, `/pricing`,
// `/api-docs`, `/feed`, `/status`... Bumping à 5min ⇒ 5× moins
// d'invocations de revalidation background sur ces pages. Le ticker tolère
// 5 min de staleness (transitions de cycle rares, 1×/jour à 06:00 UTC).

/**
 * Skills list, optionally filtered by category. Quand category fournie,
 * query SQL directe avec WHERE (pas de scan JS sur 20k items). Quand pas
 * de category, retourne le top LIVE_FETCH_CAP par défaut order.
 */
export async function getStandings(category) {
  if (!HAS_SUPABASE) {
    const list = SKILLS.map(withTierDefaults);
    if (!category || category === "all") return list;
    const cat = category.toLowerCase();
    return list.filter(
      (s) =>
        (s.category || "").toLowerCase() === cat ||
        (s.categoryId || "").toLowerCase() === cat
    );
  }
  if (!category || category === "all") {
    return (await liveSkills()) || [];
  }
  // Filter SQL-side : 1 query au lieu de fetch all + JS filter.
  return getTopRankedItems("skill", category, LIVE_FETCH_CAP);
}

/**
 * Lightweight index-size counts pour la landing page.
 * Single `count: "exact", head: true` Supabase query par table — pas de
 * row payload, juste le count. ~5ms total. Falls back aux fixtures
 * lengths quand Supabase n'est pas configuré.
 */
export const getIndexCounts = unstable_cache(async () => {
  if (!HAS_SUPABASE) {
    return { skills: SKILLS.length, claudeMds: 0, asOf: new Date().toISOString() };
  }
  const sb = createSupabasePublicClient();
  if (!sb) {
    return { skills: SKILLS.length, claudeMds: 0, asOf: new Date().toISOString() };
  }
  // Pre-migration the claude_md filter was `word_count >= 40` to skip marker-
  // file stubs (3-token CLAUDE.md placeholders). After the Storage offload,
  // `content` is NULL and the generated `word_count` is NULL too → that
  // filter excluded ALL migrated rows, breaking the landing count.
  //
  // New rule : a claude_md is "indexed" if it has content reachable from
  // anywhere (Storage path OR inline fallback for the few Forbidden) and
  // isn't archived. The marker-file stubs are now caught at scrape time
  // via the quality gate, so we don't need a word_count post-filter.
  // `count: 'estimated'` plutôt qu'`'exact'` : sur 90k+ lignes l'`exact` fait
  // un seq scan qui dépasse régulièrement le statement_timeout=3s du rôle
  // anon (surtout sous la charge parallèle de la landing), ce qui fait
  // tomber le compteur à 0 dans le snapshot ISR pendant 10 min. L'estimated
  // lit `pg_class.reltuples` (µs) et reste assez précis pour un compteur
  // décoratif. PostgREST renvoie automatiquement l'`exact` en dessous d'un
  // seuil, donc claude_md (10k) reste précis.
  const [skillsRes, claudeMdRes] = await Promise.all([
    sb
      .from("skills")
      .select("id", { count: "estimated", head: true })
      .or("is_archived.is.null,is_archived.eq.false"),
    sb
      .from("claude_md_files")
      .select("id", { count: "estimated", head: true })
      .or("is_archived.is.null,is_archived.eq.false")
      .or("content_path.not.is.null,content.not.is.null"),
  ]);
  if (skillsRes.error) {
    console.warn("[getIndexCounts] skills count failed:", skillsRes.error.message);
  }
  if (claudeMdRes.error) {
    console.warn("[getIndexCounts] claude_md count failed:", claudeMdRes.error.message);
  }
  return {
    skills: skillsRes.count ?? 0,
    claudeMds: claudeMdRes.count ?? 0,
    asOf: new Date().toISOString(),
  };
}, ["index-counts"], { revalidate: CACHE_TTL_STABLE, tags: ["index-counts"] });

export async function getCategories() {
  if (!HAS_SUPABASE) return CATEGORIES;
  // Réutilise getCategoryCounts (cached + indexed) au lieu de scanner
  // tous les items pour compter par category.
  return getCategoryCounts("skill");
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
  const sb = createSupabasePublicClient();
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
  const sb = createSupabasePublicClient();
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
  const sb = createSupabasePublicClient();
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
  const sb = createSupabasePublicClient();
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
 *
 * Cached 300s — rankings only change at cycle completion (daily 06:00 UTC).
 */
export const getAllRanksBySlug = unstable_cache(async () => {
  if (!HAS_SUPABASE) return {};
  const sb = createSupabasePublicClient();
  if (!sb) return {};
  const { data, error } = await sb
    .from("rankings")
    .select("subject_kind, subject_slug, category, avg_score")
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false });
  if (error || !data) return {};
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
}, ["all-ranks-by-slug"], { revalidate: CACHE_TTL_STABLE, tags: ["all-ranks"] });

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
// getTopTopicsByKind : RPC lourd (jsonb_array_elements aggregation). Cache
// 1800s (30 min) — les topics GitHub n'évoluent quasiment jamais et la home
// l'appelle 2× (skill + claude_md). Sans cache, Supabase free timeoutait
// fréquemment ("canceling statement due to statement timeout") en mai 2026.
const _getTopTopicsByKindCached = unstable_cache(
  async (kind, limit) => {
    if (!HAS_SUPABASE) {
      const source = kind === "claude_md" ? CLAUDE_MD_FILES : SKILLS.map(withTierDefaults);
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
    const sb = createSupabasePublicClient();
    if (!sb) return [];
    const { data, error } = await sb.rpc("top_topics_by_kind", { p_kind: kind, p_limit: limit });
    if (error) {
      console.warn(`[rankings] top_topics_by_kind RPC failed: ${error.message}`);
      return [];
    }
    return (data || []).map((r) => ({ id: r.topic, count: Number(r.count) || 0 }));
  },
  ["top-topics-by-kind"],
  { revalidate: CACHE_TTL_LONG, tags: ["rankings"] }
);

export async function getTopTopicsByKind(kind, limit = 12) {
  return _getTopTopicsByKindCached(kind, limit);
}

/**
 * Categories that actually have completed rankings (judges scored them).
 * Empty list until the bench engine runs a real cycle. Used by the
 * leaderboard which should NOT mix in unranked scraped items.
 */
// Polled toutes les 30s par /api/stats (LiveStatsGrid + HeroLiveBar) — sans
// cache, c'est 2×2 RPC Supabase / 30s / utilisateur, multiplié par les bots.
// 300s TTL : le ranking change daily, donc cohérent.
const _getLeaderboardCategoriesCached = unstable_cache(
  async (kind) => {
    if (!HAS_SUPABASE) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];
    const counts = new Map();

    const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
    const qualityTable = kind === "skill" ? "skills" : "claude_md_files";
    const catCol = kind === "skill" ? "category" : "project_category";

    const [{ data: benched }, { data: qualityRows }] = await Promise.all([
      sb
        .from("rankings")
        .select(`category, ${idCol}`)
        .eq("subject_kind", kind)
        .not("avg_score", "is", null),
      sb
        .from(qualityTable)
        .select(`id, ${catCol}`)
        .not("quality_score", "is", null)
        .limit(5000),
    ]);

    const benchedIds = new Set();
    for (const row of benched || []) {
      counts.set(row.category, (counts.get(row.category) || 0) + 1);
      if (row[idCol]) benchedIds.add(row[idCol]);
    }
    for (const row of qualityRows || []) {
      if (benchedIds.has(row.id)) continue;
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
  },
  ["leaderboard-categories"],
  { revalidate: CACHE_TTL_STABLE, tags: ["rankings"] }
);

export async function getLeaderboardCategories(kind = "skill") {
  return _getLeaderboardCategoriesCached(kind);
}

export function getCategoryIds() {
  return CATEGORIES.map((c) => c.id);
}

export async function getTopSkills(limit = 10) {
  const list = await getStandings();
  return list.slice(0, limit);
}

// getSkillBySlug : appelé par /skills/[slug] (58K invocations / 12h en mai
// 2026). Cache 5 min : un slug donné ne change qu'au scrape + au bench
// cycle (daily), donc 300s couvre la majorité des hits bot.
const _getSkillBySlugCached = unstable_cache(
  async (slug) => {
    if (HAS_SUPABASE) {
      const sb = createSupabasePublicClient();
      if (sb) {
        const { data, error } = await sb
          .from("skills")
          .select(
            "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, license_spdx, metadata, skill_md_content, content_path, scraped_at, private_storage_path, promoted_until, quality_score, quality_rationale, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
          )
          .eq("slug", slug)
          .maybeSingle();
        if (error) console.warn(`[rankings] getSkillBySlug live failed: ${error.message}`);
        if (!data) return null;
        const mapped = mapSkillRow(data);
        const parsed = parseGithubOwnerRepo(data.github_url);
        const mo = mapped.metadata?.owner || parsed.owner;
        const mr = mapped.metadata?.repo || parsed.repo;
        if (mo && mr) {
          mapped.metadata = { ...mapped.metadata, owner: mo, repo: mr };
        }
        const { data: ranking } = await sb
          .from("rankings")
          .select("avg_score, task_count, successful_tasks")
          .eq("subject_kind", "skill")
          .eq("skill_id", data.id)
          .maybeSingle();
        if (ranking?.avg_score != null) {
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
        if (!mapped.skill_md_content && mapped.contentPath) {
          mapped.skill_md_content = await fetchContentByPath(mapped.contentPath);
        }
        return mapped;
      }
      return null;
    }
    const skill = SKILLS.find((s) => s.slug === slug);
    if (!skill) return null;
    const detail = SKILL_DETAILS[slug];
    return withTierDefaults({ ...skill, ...(detail || {}) });
  },
  ["skill-by-slug"],
  { revalidate: CACHE_TTL_STABLE, tags: ["rankings"] }
);

export async function getSkillBySlug(slug) {
  return _getSkillBySlugCached(slug);
}

export async function getFeaturedBattle() {
  // Real battles require bench engine output; null until then.
  return HAS_SUPABASE ? null : FEATURED_BATTLE;
}

/**
 * Versuz-first-party Featured items — tier='featured', non-archived.
 * Surfaced on the home as a dedicated promo strip. Used for monetisation
 * inventory : Versuz keeps 100% of Featured tier revenue (vs 30/70 split
 * on Premium author-listed items).
 */
// Featured items : changement éditorial manuel (Versuz pick). 30 min TTL.
const _getFeaturedItemsCached = unstable_cache(
  async (kind, limit) => {
    if (!HAS_SUPABASE) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];
    const table = kind === "claude_md" ? "claude_md_files" : "skills";
    const sel = kind === "claude_md"
      ? "id, slug, description, project_category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
      : "id, slug, name, description, category, github_url, github_stars, byte_count, tier, price_usd, verification_level, is_official, source, license_spdx, metadata, promoted_until, quality_score, quality_rationale, bench_tier, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at";
    const { data, error } = await sb
      .from(table)
      .select(sel)
      .eq("tier", "featured")
      .eq("is_archived", false)
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    const mapper = kind === "claude_md" ? mapClaudeMdRow : mapSkillRow;
    return data.map(mapper);
  },
  ["featured-items"],
  { revalidate: CACHE_TTL_LONG, tags: ["rankings"] }
);

export async function getFeaturedItems(kind = "skill", limit = 3) {
  return _getFeaturedItemsCached(kind, limit);
}

/**
 * Detect the biggest rank changes between the current cycle and the
 * previous one for a given (kind, category). Returns the candidates
 * sorted by absolute delta desc.
 *
 * Requires rank_history populated by post-cycle-hooks.mjs. Returns []
 * when the table is empty or the cycle has no comparable predecessor.
 *
 * Each row : { subjectId, slug, name, category, currentRank, prevRank,
 *              delta, elo, kind }
 */
export async function getRecentUpsets({ cycleId, kind = "skill", minDelta = 3, limit = 20 } = {}) {
  if (!HAS_SUPABASE) return [];
  const sb = createSupabasePublicClient();
  if (!sb) return [];

  // Pick current cycle if not provided — latest snapshot in rank_history.
  let currentId = cycleId;
  if (!currentId) {
    const { data: latest } = await sb
      .from("rank_history")
      .select("cycle_id")
      .eq("subject_kind", kind)
      .order("cycle_id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return [];
    currentId = latest.cycle_id;
  }

  // Predecessor cycle — the highest cycle_id strictly less than current.
  const { data: prevCycle } = await sb
    .from("rank_history")
    .select("cycle_id")
    .eq("subject_kind", kind)
    .lt("cycle_id", currentId)
    .order("cycle_id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prevCycle) return [];
  const prevId = prevCycle.cycle_id;

  const idCol = kind === "claude_md" ? "claude_md_id" : "skill_id";

  // Pull both snapshots in one go each.
  const [{ data: current }, { data: previous }] = await Promise.all([
    sb
      .from("rank_history")
      .select(`${idCol}, category, rank, elo`)
      .eq("subject_kind", kind)
      .eq("cycle_id", currentId),
    sb
      .from("rank_history")
      .select(`${idCol}, category, rank`)
      .eq("subject_kind", kind)
      .eq("cycle_id", prevId),
  ]);

  if (!current?.length || !previous?.length) return [];

  // Build a lookup of previous rank per (subject, category).
  const prevByKey = new Map();
  for (const r of previous) {
    prevByKey.set(`${r[idCol]}:${r.category}`, r.rank);
  }

  // Compute deltas. Positive delta = rank improved (moved up).
  const deltas = [];
  for (const r of current) {
    const prevRank = prevByKey.get(`${r[idCol]}:${r.category}`);
    if (prevRank == null) continue; // brand new — skip (first_blood, not an upset)
    const delta = prevRank - r.rank; // positive when climbed
    if (Math.abs(delta) < minDelta) continue;
    deltas.push({
      subjectId: r[idCol],
      category: r.category,
      currentRank: r.rank,
      prevRank,
      delta,
      elo: r.elo != null ? Number(r.elo) : null,
      kind,
    });
  }

  // Sort by absolute delta desc, take top N.
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = deltas.slice(0, limit);

  // Enrich with name/slug for the UI / OG card.
  if (top.length === 0) return [];
  const ids = Array.from(new Set(top.map((d) => d.subjectId)));
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const sel = kind === "claude_md"
    ? "id, slug, metadata"
    : "id, slug, name";
  const { data: details } = await sb.from(table).select(sel).in("id", ids);
  const detailById = new Map((details || []).map((d) => [d.id, d]));

  return top.map((d) => {
    const detail = detailById.get(d.subjectId);
    const name = detail
      ? kind === "claude_md"
        ? (detail.metadata?.author && detail.metadata?.repo
            ? `${detail.metadata.author}/${detail.metadata.repo}`
            : detail.slug)
        : detail.name
      : "—";
    return { ...d, slug: detail?.slug, name, cycleId: currentId, prevCycleId: prevId };
  });
}

/**
 * Item achievements (Triple Crown, category_winner, streak_milestone,
 * first_blood) for a single subject. Returns the list of achievement
 * rows, sorted by most-recent first. Empty array if Supabase not
 * configured or none unlocked.
 *
 * Populated by scripts/bench/post-cycle-hooks.mjs after each bench cycle.
 */
// Achievements unlock only after a bench cycle (daily). 30 min TTL.
const _getItemAchievementsCached = unstable_cache(
  async (kind, subjectId) => {
    if (!HAS_SUPABASE || !subjectId) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];
    const col = kind === "claude_md" ? "claude_md_id" : "skill_id";
    const { data, error } = await sb
      .from("item_achievements")
      .select("id, type, category, cycle_id, metadata, unlocked_at")
      .eq(col, subjectId)
      .order("unlocked_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn(`[rankings] getItemAchievements failed: ${error.message}`);
      return [];
    }
    return data || [];
  },
  ["item-achievements"],
  { revalidate: CACHE_TTL_LONG, tags: ["rankings"] }
);

export async function getItemAchievements(kind, subjectId) {
  return _getItemAchievementsCached(kind, subjectId);
}

/**
 * Author stats — counts an author's contributions across both kinds and
 * how many of them have ranked in any cycle. Used to derive the author
 * tier (Newcomer → Veteran) on /u/[login] and /achievements.
 *
 * Same shape as /badge/author/[login]'s loadAuthorStats (identical logic
 * for tier parity). Cache 10min — change at most once per cycle (24h).
 */
const _getAuthorStatsCached = unstable_cache(
  async (loginRaw) => {
    const login = String(loginRaw || "").replace(/[^A-Za-z0-9-]/g, "");
    if (!login || !HAS_SUPABASE) return { total: 0, benched: 0 };
    const sb = createSupabasePublicClient();
    if (!sb) return { total: 0, benched: 0 };

    const prefix = `https://github.com/${login}/%`;
    const [{ data: skills }, { data: claudeMds }] = await Promise.all([
      sb.from("skills").select("id").ilike("github_url", prefix).limit(500),
      sb.from("claude_md_files").select("id").ilike("github_url", prefix).limit(500),
    ]);

    const skillIds = (skills || []).map((s) => s.id);
    const claudeIds = (claudeMds || []).map((c) => c.id);
    const total = skillIds.length + claudeIds.length;
    if (total === 0) return { total: 0, benched: 0 };

    let benched = 0;
    if (skillIds.length > 0) {
      const { count } = await sb
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("subject_kind", "skill")
        .in("skill_id", skillIds)
        .not("avg_score", "is", null);
      benched += count || 0;
    }
    if (claudeIds.length > 0) {
      const { count } = await sb
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("subject_kind", "claude_md")
        .in("claude_md_id", claudeIds)
        .not("avg_score", "is", null);
      benched += count || 0;
    }
    return { total, benched };
  },
  ["author-stats"],
  { revalidate: CACHE_TTL_LONG, tags: ["rankings"] }
);

export async function getAuthorStats(login) {
  return _getAuthorStatsCached(login);
}

/**
 * Top authors leaderboard — orders by `total` contributions, then by
 * `benched` count. Powers the /achievements wall-of-fame. We fetch a
 * wide window (top 200 distinct GitHub logins by item count) and let
 * the page filter / paginate. Cache 30min — change ~daily as new
 * scrapes land.
 */
const _getTopAuthorsCached = unstable_cache(
  async (limit = 50) => {
    if (!HAS_SUPABASE) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];

    // We don't have a denormalized "github_login → counts" view, so we
    // pull a representative window of items and aggregate in JS. 5k
    // recent items is enough to surface the top 50 authors — the rare
    // long-tail authors with 1-2 ancient items are not interesting here.
    const FETCH_LIMIT = 5000;
    const [{ data: skills }, { data: claudeMds }] = await Promise.all([
      sb
        .from("skills")
        .select("id, github_url")
        .not("github_url", "is", null)
        .order("github_stars", { ascending: false, nullsFirst: false })
        .limit(FETCH_LIMIT),
      sb
        .from("claude_md_files")
        .select("id, github_url")
        .not("github_url", "is", null)
        .order("github_stars", { ascending: false, nullsFirst: false })
        .limit(FETCH_LIMIT),
    ]);

    const authorMap = new Map();
    const recordOwner = (url, id, kind) => {
      const match = /github\.com\/([^/]+)\//.exec(url || "");
      if (!match) return;
      const login = match[1];
      // Skip enterprise/anonymous patterns
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(login)) return;
      if (!authorMap.has(login)) {
        authorMap.set(login, { login, total: 0, benched: 0, skillIds: [], claudeIds: [] });
      }
      const entry = authorMap.get(login);
      entry.total += 1;
      if (kind === "skill") entry.skillIds.push(id);
      else entry.claudeIds.push(id);
    };

    for (const s of skills || []) recordOwner(s.github_url, s.id, "skill");
    for (const c of claudeMds || []) recordOwner(c.github_url, c.id, "claude_md");

    // Compute benched in one batched RPC-style scan. We can't easily join
    // here in supabase-js without a custom RPC, so we fetch all ranked
    // ids in one shot and intersect with each author's id list.
    const [{ data: rankedSkills }, { data: rankedClaude }] = await Promise.all([
      sb
        .from("rankings")
        .select("skill_id")
        .eq("subject_kind", "skill")
        .not("avg_score", "is", null)
        .limit(5000),
      sb
        .from("rankings")
        .select("claude_md_id")
        .eq("subject_kind", "claude_md")
        .not("avg_score", "is", null)
        .limit(5000),
    ]);
    const rankedSkillSet = new Set((rankedSkills || []).map((r) => r.skill_id));
    const rankedClaudeSet = new Set((rankedClaude || []).map((r) => r.claude_md_id));

    for (const entry of authorMap.values()) {
      for (const id of entry.skillIds) if (rankedSkillSet.has(id)) entry.benched += 1;
      for (const id of entry.claudeIds) if (rankedClaudeSet.has(id)) entry.benched += 1;
    }

    const ranked = [...authorMap.values()]
      .map((a) => ({ login: a.login, total: a.total, benched: a.benched }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return b.benched - a.benched;
      })
      .slice(0, limit);

    return ranked;
  },
  ["top-authors"],
  { revalidate: 1800, tags: ["rankings"] }
);

export async function getTopAuthors(limit = 50) {
  return _getTopAuthorsCached(limit);
}

/**
 * Recent item achievements — feed for /achievements wall of fame.
 * Returns the latest N entries joined with subject metadata so we can
 * link directly to the skill / claude_md page.
 */
const _getRecentItemAchievementsCached = unstable_cache(
  async (limit = 40) => {
    if (!HAS_SUPABASE) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("item_achievements")
      .select(
        "id, subject_kind, skill_id, claude_md_id, type, category, cycle_id, metadata, unlocked_at"
      )
      .order("unlocked_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn(`[rankings] getRecentItemAchievements failed: ${error.message}`);
      return [];
    }
    const rows = data || [];
    if (rows.length === 0) return [];

    const skillIds = rows.filter((r) => r.skill_id).map((r) => r.skill_id);
    const claudeIds = rows.filter((r) => r.claude_md_id).map((r) => r.claude_md_id);
    const [{ data: skills }, { data: claudeMds }] = await Promise.all([
      skillIds.length > 0
        ? sb.from("skills").select("id, slug, name, category").in("id", skillIds)
        : Promise.resolve({ data: [] }),
      claudeIds.length > 0
        ? sb
            .from("claude_md_files")
            .select("id, slug, project_category, metadata")
            .in("id", claudeIds)
        : Promise.resolve({ data: [] }),
    ]);
    const skillById = new Map((skills || []).map((s) => [s.id, s]));
    const claudeById = new Map((claudeMds || []).map((c) => [c.id, c]));

    return rows
      .map((r) => {
        if (r.subject_kind === "skill") {
          const s = skillById.get(r.skill_id);
          if (!s) return null;
          return {
            ...r,
            slug: s.slug,
            name: s.name,
            itemCategory: s.category,
            href: `/skills/${s.slug}`,
          };
        }
        const c = claudeById.get(r.claude_md_id);
        if (!c) return null;
        const cat = c.project_category || "generic";
        return {
          ...r,
          slug: c.slug,
          name: c.metadata?.repo ? `${c.metadata.author}/${c.metadata.repo}` : c.slug,
          itemCategory: cat,
          href: `/claude-md/${cat}/${c.slug}`,
        };
      })
      .filter(Boolean);
  },
  ["recent-item-achievements"],
  { revalidate: 600, tags: ["rankings"] }
);

export async function getRecentItemAchievements(limit = 40) {
  return _getRecentItemAchievementsCached(limit);
}

/**
 * Items with active streaks — fuels the /achievements "On a streak"
 * section. Reads from skills + claude_md_files where streak > 0,
 * unioned and sorted desc.
 */
const _getStreakLeadersCached = unstable_cache(
  async (limit = 20) => {
    if (!HAS_SUPABASE) return [];
    const sb = createSupabasePublicClient();
    if (!sb) return [];

    const [{ data: skills }, { data: claudeMds }] = await Promise.all([
      sb
        .from("skills")
        .select("slug, name, category, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at")
        .gt("top_rank_streak_days", 0)
        .order("top_rank_streak_days", { ascending: false })
        .limit(limit),
      sb
        .from("claude_md_files")
        .select("slug, project_category, metadata, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at")
        .gt("top_rank_streak_days", 0)
        .order("top_rank_streak_days", { ascending: false })
        .limit(limit),
    ]);

    const skillsMapped = (skills || []).map((s) => ({
      kind: "skill",
      slug: s.slug,
      name: s.name,
      streakDays: s.top_rank_streak_days,
      streakCategory: s.top_rank_streak_category,
      itemCategory: s.category,
      href: `/skills/${s.slug}`,
    }));
    const claudeMapped = (claudeMds || []).map((c) => ({
      kind: "claude_md",
      slug: c.slug,
      name: c.metadata?.repo ? `${c.metadata.author}/${c.metadata.repo}` : c.slug,
      streakDays: c.top_rank_streak_days,
      streakCategory: c.top_rank_streak_category,
      itemCategory: c.project_category || "generic",
      href: `/claude-md/${c.project_category || "generic"}/${c.slug}`,
    }));
    return [...skillsMapped, ...claudeMapped]
      .sort((a, b) => b.streakDays - a.streakDays)
      .slice(0, limit);
  },
  ["streak-leaders"],
  { revalidate: 1800, tags: ["rankings"] }
);

export async function getStreakLeaders(limit = 20) {
  return _getStreakLeadersCached(limit);
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
  const list = await getCategoryCounts("claude_md");
  return list.filter((c) => c.id !== "all");
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

const _getClaudeMdBySlugCached = unstable_cache(
  async (slug) => {
    if (HAS_SUPABASE) {
      const sb = createSupabasePublicClient();
      if (sb) {
        const { data, error } = await sb
          .from("claude_md_files")
          .select(
            "id, slug, description, project_category, github_url, github_stars, word_count, byte_count, tier, price_usd, verification_level, is_official, license_spdx, metadata, content, content_path, scraped_at, quality_score, quality_rationale, promoted_until, private_storage_path, top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at"
          )
          .eq("slug", slug)
          .maybeSingle();
        if (error) console.warn(`[rankings] getClaudeMdBySlug live failed: ${error.message}`);
        if (!data) return null;
        const mapped = mapClaudeMdRow(data);
        const parsed = parseGithubOwnerRepo(data.github_url);
        const mo = mapped.metadata?.owner || parsed.owner;
        const mr = mapped.metadata?.repo || parsed.repo;
        if (mo && mr) {
          mapped.metadata = { ...mapped.metadata, owner: mo, repo: mr };
        }
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
        if (!mapped.content && mapped.contentPath) {
          mapped.content = await fetchContentByPath(mapped.contentPath);
        }
        return mapped;
      }
      return null;
    }
    return CLAUDE_MD_FILES.find((c) => c.slug === slug) || null;
  },
  ["claude-md-by-slug"],
  { revalidate: CACHE_TTL_STABLE, tags: ["rankings"] }
);

export async function getClaudeMdBySlug(slug) {
  return _getClaudeMdBySlugCached(slug);
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
