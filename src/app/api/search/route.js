import { createSupabaseServerClient } from "@/lib/supabase/server";

// Cmd-K palette hit cette route à chaque frappe (debounced ~200ms côté
// client). Edge cache 60s par querystring → user qui retape `react` 10× /j
// = 1 invocation/min global. Public-only data (slug + description), pas de
// fuite cross-user.
export const revalidate = 60;

export async function GET(request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return Response.json(
      { skills: [], claudeMds: [] },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
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

  return Response.json(
    {
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
    },
    {
      headers: {
        // 60s edge cache + 5min SWR. Une querystring chaude (`react`, `nextjs`)
        // est résolue 1×/min en aval de la DB.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
