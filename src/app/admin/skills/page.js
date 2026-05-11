import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RegistryAdminTable } from "@/components/admin/registry-admin-table";

export default async function SkillsAdmin({ searchParams }) {
  const params = (await searchParams) || {};
  const q = (params.q || "").trim();
  const sb = createSupabaseAdminClient();

  let rows = [];
  if (sb) {
    let query = sb
      .from("skills")
      .select("slug, name, category, tier, price_usd, verification_level, github_stars, github_url")
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(300);
    if (q) {
      const term = `%${q.replace(/[%_]/g, "\\$&")}%`;
      query = query.or(`slug.ilike.${term},name.ilike.${term}`);
    }
    const r = await query;
    rows = r.data || [];
  }

  return (
    <RegistryAdminTable
      kind="skill"
      title="Skills"
      rows={rows.map((r) => ({
        slug: r.slug,
        primary: r.name || r.slug,
        secondary: r.category,
        stars: r.github_stars || 0,
        tier: r.tier || "free",
        priceUsd: r.price_usd,
        verificationLevel: r.verification_level ?? 0,
        githubUrl: r.github_url,
      }))}
      query={q}
    />
  );
}
