import { getSkillBySlug } from "@/lib/queries/rankings";

// Content endpoint for the npx versuz CLI : returns raw SKILL.md content.
// Free items : open access. Premium without auth → 402 Payment Required.
// (Premium auth via API key sera ajouté en v0.2 — pour l'instant tier=free only.)
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const item = await getSkillBySlug(slug);
  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if ((item.tier || "free") !== "free") {
    return Response.json(
      {
        error: "Premium skill — purchase required to download via CLI",
        slug: item.slug,
        tier: item.tier,
        price_usd: item.priceUsd,
        buy_url: `https://versuz.dev/buy/skill/${item.slug}`,
      },
      { status: 402 }
    );
  }
  if (!item.skill_md_content) {
    return Response.json({ error: "Content not available" }, { status: 404 });
  }
  const meta = item.metadata || {};
  return Response.json({
    api_version: "v1",
    kind: "skill",
    slug: item.slug,
    name: item.name,
    description: item.description,
    content: item.skill_md_content,
    bundle_files: meta.bundle_files || [],
    github_url: item.github
      ? `https://${item.github}`
      : meta.owner && meta.repo
        ? `https://github.com/${meta.owner}/${meta.repo}`
        : null,
  });
}
