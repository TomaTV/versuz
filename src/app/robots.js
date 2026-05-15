export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Routes sans valeur SEO + auth-gated. Vercel observability (mai 2026)
        // a montré 33K invocations /claim + 24K /badge + 58K /skills sur 12h
        // pour 39 visiteurs réels = traffic bot écrasant. Disallow ces routes
        // au crawler évite des SSR coûteux côté Vercel. Les badges restent
        // accessibles (embed README) — c'est l'iteration HTML SSR qui est bloquée.
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/claim/",
          "/promote/",
          "/buy/",
          "/profile",
          "/success/",
          "/u/",
          "/repo/",
          "/login",
          "/register",
          "/unsubscribe",
        ],
      },
      // Bloquer les crawlers IA agressifs qui n'apportent pas de traffic
      // utile (GPTBot, ClaudeBot, etc.) et tapent les routes en boucle.
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "Amazonbot", disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
