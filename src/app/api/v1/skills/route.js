import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computePrior } from "@/lib/utils";

const MAX_LIMIT = 100;
const ALLOWED_TIERS = new Set(["free", "premium", "featured"]);
const ALLOWED_CATS = new Set(["document", "sql", "data", "web", "shell", "code"]);

function shape(row) {
  const meta = row.metadata || {};
  const item = {
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    tier: row.tier || "free",
    price_usd: row.price_usd,
    verification_level: row.verification_level ?? 0,
    stars: row.github_stars || 0,
    forks: meta.forks ?? null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    license: meta.license || null,
    pushed_at: meta.pushed_at || null,
    github_url: row.github_url,
    skill_type: meta.skill_type || null,
  };
  item.prior = computePrior({
    stars: item.stars,
    forks: item.forks,
    description: item.description,
    pushedAt: item.pushed_at,
    metadata: meta,
    verificationLevel: item.verification_level,
  });
  return item;
}

export async function GET(request) {
  const url = new URL(request.url);
  const sb = await createSupabaseServerClient();
  if (!sb) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const offset = (page - 1) * limit;
  const category = url.searchParams.get("category");
  const tier = url.searchParams.get("tier");
  const minLevel = Number(url.searchParams.get("min_verification") || 0);
  const q = url.searchParams.get("q");
  const sortRaw = url.searchParams.get("sort") || "prior";

  let query = sb
    .from("skills")
    .select(
      "slug, name, description, category, tier, price_usd, verification_level, github_stars, github_url, metadata",
      { count: "estimated" }
    );

  if (category && ALLOWED_CATS.has(category)) query = query.eq("category", category);
  if (tier && ALLOWED_TIERS.has(tier)) query = query.eq("tier", tier);
  if (minLevel >= 1) query = query.gte("verification_level", minLevel);
  if (q && q.trim()) {
    const term = `%${q.replace(/[%_]/g, "\\$&")}%`;
    query = query.or(`name.ilike.${term},slug.ilike.${term},description.ilike.${term}`);
  }

  // We sort prior client-side after shape() since prior is computed; for the
  // DB sort we use stars (a strong proxy), then re-sort if requested.
  if (sortRaw === "stars") {
    query = query.order("github_stars", { ascending: false, nullsFirst: false });
  } else if (sortRaw === "recent") {
    query = query.order("scraped_at", { ascending: false, nullsFirst: false });
  } else if (sortRaw === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("github_stars", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let items = (data || []).map(shape);
  if (sortRaw === "prior") items.sort((a, b) => (b.prior ?? 0) - (a.prior ?? 0));

  return Response.json({
    api_version: "v1",
    kind: "skill",
    page,
    limit,
    total: count ?? items.length,
    items,
  });
}
