import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return Response.json({ skills: [], claudeMds: [] });
  }

  const sb = await createSupabaseServerClient();
  if (!sb) {
    return Response.json({ skills: [], claudeMds: [] });
  }

  const term = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const [skillsRes, claudeMdsRes] = await Promise.all([
    sb
      .from("skills")
      .select("slug, name, description, category, github_stars")
      .or(`name.ilike.${term},slug.ilike.${term},description.ilike.${term}`)
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(8),
    sb
      .from("claude_md_files")
      .select("slug, description, project_category, github_stars, metadata")
      .or(`slug.ilike.${term},description.ilike.${term}`)
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  return Response.json({
    skills: (skillsRes.data || []).map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      stars: s.github_stars || 0,
    })),
    claudeMds: (claudeMdsRes.data || []).map((c) => ({
      slug: c.slug,
      description: c.description,
      project_category: c.project_category,
      stars: c.github_stars || 0,
      author: c.metadata?.author || c.metadata?.owner || null,
      repo: c.metadata?.repo || null,
    })),
  });
}
