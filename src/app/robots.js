export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
