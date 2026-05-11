import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RegistryAdminTable } from "@/components/admin/registry-admin-table";

export default async function ClaudeMdAdmin({ searchParams }) {
  const params = (await searchParams) || {};
  const q = (params.q || "").trim();
  const sb = createSupabaseAdminClient();

  let rows = [];
  if (sb) {
    let query = sb
      .from("claude_md_files")
      .select("slug, project_category, tier, price_usd, verification_level, github_stars, github_url, metadata")
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(300);
    if (q) {
      const term = `%${q.replace(/[%_]/g, "\\$&")}%`;
      query = query.or(`slug.ilike.${term}`);
    }
    const r = await query;
    rows = r.data || [];
  }

  return (
    <RegistryAdminTable
      kind="claude_md"
      title="CLAUDE.md"
      rows={rows.map((r) => {
        const meta = r.metadata || {};
        const display =
          meta.author && meta.repo ? `${meta.author}/${meta.repo}` : r.slug;
        return {
          slug: r.slug,
          primary: display,
          secondary: r.project_category,
          stars: r.github_stars || 0,
          tier: r.tier || "free",
          priceUsd: r.price_usd,
          verificationLevel: r.verification_level ?? 0,
          githubUrl: r.github_url,
        };
      })}
      query={q}
    />
  );
}
