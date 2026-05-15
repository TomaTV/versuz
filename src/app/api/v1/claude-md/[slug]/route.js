import { getClaudeMdBySlug } from "@/lib/queries/rankings";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const item = await getClaudeMdBySlug(slug);
  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const meta = item.metadata || {};
  return Response.json({
    api_version: "v1",
    kind: "claude_md",
    item: {
      slug: item.slug,
      description: item.description,
      project_category: item.project_category,
      tier: item.tier,
      price_usd: item.priceUsd,
      verification_level: item.verificationLevel,
      stars: item.stars,
      forks: item.forks,
      word_count: item.word_count,
      topics: item.topics,
      license: meta.license || null,
      language: meta.language || null,
      pushed_at: item.pushedAt,
      github_url: item.github
        ? `https://${item.github}`
        : meta.owner && meta.repo
          ? `https://github.com/${meta.owner}/${meta.repo}`
          : null,
      author: item.author,
      repo: item.repo,
      prior: item.prior,
    },
  });
}
