import { getSkillBySlug } from "@/lib/queries/rankings";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const item = await getSkillBySlug(slug);
  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  // Return a slim, stable shape (don't leak the whole metadata blob).
  const meta = item.metadata || {};
  return Response.json(
    {
      api_version: "v1",
      kind: "skill",
      item: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        category: item.categoryId || item.category,
        tier: item.tier,
        price_usd: item.priceUsd,
        verification_level: item.verificationLevel,
        stars: item.stars,
        forks: item.forks,
        topics: item.topics,
        license: meta.license || null,
        pushed_at: item.pushedAt,
        github_url: item.github
          ? `https://${item.github}`
          : meta.owner && meta.repo
            ? `https://github.com/${meta.owner}/${meta.repo}`
            : null,
        author: item.author,
        repo: item.repo,
        skill_type: meta.skill_type || null,
        tools: meta.tools || [],
        bundle_files: meta.bundle_files || [],
        prior: item.prior,
        elo: item.elo ?? null,
      },
    },
    {
      headers: {
        // Skill content evolves at most 1×/24h (bench cycle 06:00 UTC).
        // 1h cache + SWR 24h amortit massivement les hits CLI / bot crawl.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
