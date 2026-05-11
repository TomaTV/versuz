import { getClaudeMdBySlug } from "@/lib/queries/rankings";

// Content endpoint pour le npx versuz CLI : retourne le CLAUDE.md raw.
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const item = await getClaudeMdBySlug(slug);
  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if ((item.tier || "free") !== "free") {
    return Response.json(
      {
        error: "Premium CLAUDE.md — purchase required to download via CLI",
        slug: item.slug,
        tier: item.tier,
        price_usd: item.priceUsd,
        buy_url: `https://versuz.dev/buy/claude_md/${item.slug}`,
      },
      { status: 402 }
    );
  }
  if (!item.content) {
    return Response.json({ error: "Content not available" }, { status: 404 });
  }
  const meta = item.metadata || {};
  return Response.json({
    api_version: "v1",
    kind: "claude_md",
    slug: item.slug,
    description: item.description,
    project_category: item.project_category,
    content: item.content,
    github_url: item.github
      ? `https://${item.github}`
      : meta.owner && meta.repo
        ? `https://github.com/${meta.owner}/${meta.repo}`
        : null,
  });
}
