import { createSupabaseServerClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";
const MAX_ITEMS = 50;

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(d) {
  if (!d) return new Date().toUTCString();
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

export async function GET(request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const sb = await createSupabaseServerClient();

  let items = [];
  if (sb) {
    let q = sb
      .from("claude_md_files")
      .select(
        "slug, description, project_category, scraped_at, github_url, github_stars, word_count, metadata"
      )
      .order("scraped_at", { ascending: false })
      .limit(MAX_ITEMS);
    if (category) q = q.eq("project_category", category);
    const r = await q;
    items = r.data || [];
  }

  const channelTitle = category
    ? `Versuz · CLAUDE.md · ${category}`
    : "Versuz · CLAUDE.md";
  const channelDesc = category
    ? `Latest CLAUDE.md indexed in the ${category} category.`
    : "Latest CLAUDE.md indexed across all project types.";
  const feedUrl = category
    ? `${BASE}/feed/claude-md?category=${encodeURIComponent(category)}`
    : `${BASE}/feed/claude-md`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(channelTitle)}</title>
<link>${escapeXml(BASE + "/marketplace?type=claude-md")}</link>
<description>${escapeXml(channelDesc)}</description>
<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<language>en</language>
${items
  .map((c) => {
    const meta = c.metadata || {};
    const link = `${BASE}/claude-md/${c.project_category || "generic"}/${c.slug}`;
    const author = meta.author || meta.owner || "unknown";
    const repo = meta.repo || c.slug;
    const title = `${author}/${repo}`;
    const desc = `${c.description || ""}\n\n— ${author} · ${c.project_category} · ${c.word_count || "?"} words · ★${c.github_stars || 0}`;
    return `<item>
<title>${escapeXml(title)}</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="true">${escapeXml(link)}</guid>
<pubDate>${rfc822(c.scraped_at)}</pubDate>
<description>${escapeXml(desc)}</description>
<category>${escapeXml(c.project_category)}</category>
</item>`;
  })
  .join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
