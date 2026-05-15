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
      .from("skills")
      .select(
        "slug, name, description, category, scraped_at, github_url, github_stars, metadata"
      )
      .order("scraped_at", { ascending: false })
      .limit(MAX_ITEMS);
    if (category) q = q.eq("category", category);
    const r = await q;
    items = r.data || [];
  }

  const channelTitle = category
    ? `Versuz · skills · ${category}`
    : "Versuz · skills";
  const channelDesc = category
    ? `Latest SKILL.md indexed in the ${category} category.`
    : "Latest SKILL.md indexed across all categories.";

  const feedUrl = category
    ? `${BASE}/feed/skills?category=${encodeURIComponent(category)}`
    : `${BASE}/feed/skills`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(channelTitle)}</title>
<link>${escapeXml(BASE + "/marketplace")}</link>
<description>${escapeXml(channelDesc)}</description>
<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<language>en</language>
${items
  .map((s) => {
    const meta = s.metadata || {};
    const link = `${BASE}/skills/${s.slug}`;
    const author = meta.author || meta.owner || "unknown";
    const desc = `${s.description || ""}\n\n— ${author} · ${s.category} · ★${s.github_stars || 0}`;
    return `<item>
<title>${escapeXml(s.name || s.slug)}</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="true">${escapeXml(link)}</guid>
<pubDate>${rfc822(s.scraped_at)}</pubDate>
<description>${escapeXml(desc)}</description>
<category>${escapeXml(s.category)}</category>
</item>`;
  })
  .join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=1800",
    },
  });
}
