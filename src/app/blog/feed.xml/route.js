import { getAllPosts } from "@/lib/blog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

/**
 * Blog RSS 2.0 feed.
 *
 * Lives at /blog/feed.xml. Linked from <head> on /blog so feed readers
 * auto-discover. Useful for dev.to syndication, Planet Anthropic, and
 * any aggregator that pulls Versuz content.
 *
 * No `description` body in items (just title + excerpt) — we don't
 * dump the full post HTML through RSS because the posts use embedded
 * React components that won't render in a reader. Excerpt + canonical
 * URL is the right contract.
 */

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso) {
  if (!iso) return new Date().toUTCString();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export async function GET() {
  const posts = getAllPosts();
  const lastBuildDate = posts[0]?.dateISO
    ? rfc822(posts[0].dateISO)
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = `${SITE}/blog/${post.slug}`;
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(post.dateISO)}</pubDate>
      <description>${escapeXml(post.excerpt || "")}</description>
      ${(post.tags || [])
        .map((t) => `<category>${escapeXml(t)}</category>`)
        .join("\n      ")}
      ${post.author ? `<dc:creator>${escapeXml(post.author)}</dc:creator>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Versuz · Blog</title>
    <link>${SITE}/blog</link>
    <description>Notes from building Versuz — the open public benchmark for AI agent skills. Solo dev, indexing 100k+ items, anti-spam, CLI design.</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE}/og-images.png</url>
      <title>Versuz · Blog</title>
      <link>${SITE}/blog</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // Cache 1h at the edge, 24h SWR — posts are static, no rush.
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
