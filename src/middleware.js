import { NextResponse } from "next/server";

/**
 * Bot blocker middleware — mai 2026.
 *
 * Problème : Vercel observability montre 745K Edge Requests sur 30 jours
 * (75% du cap Hobby 1M) pour ~39 visiteurs réels / semaine. La majorité
 * vient de bots qui ignorent robots.txt. robots.txt disallow tue les
 * crawlers polis, mais des scrapers + AI bots agressifs s'en foutent.
 *
 * Le middleware retourne 403 AVANT que la function ne soit invoquée :
 *   - Vercel Edge Middleware Invocations : 1M / mois Hobby (on est à 0%
 *     d'utilisation, room énorme)
 *   - Une 403 du middleware NE compte PAS dans Function Invocations ni
 *     Fluid Active CPU. Pure win.
 *
 * Logique :
 *   - Liste explicite d'AI bots / scrapers agressifs (User-Agent match)
 *   - Pattern catch-all pour les bots qui fakent leur UA en `Mozilla/5.0`
 *     mais omettent les headers usuels d'un browser (Accept-Language, etc.)
 *   - Bypass complet pour /api/webhooks/* (Stripe, GitHub) et /api/cron/*
 *     (Vercel Cron user-agent contains "vercel-cron")
 *
 * Pas appliqué sur les routes API authentifiées (cookies) — les vrais
 * users connectés ne sont jamais bloqués.
 */

// User-Agents à bloquer. Match case-insensitive sur substring.
//
// Stratégie (mai 2026) : on bloque les bots qui ENTRAÎNENT des LLMs sans
// amener de visiteurs. On GARDE les bots IA qui FETCH le site quand un
// vrai user pose une question (ChatGPT-User, Perplexity-User, Claude-Web,
// OAI-SearchBot, PerplexityBot, Applebot-Extended) — ce sont des sources
// potentielles de trafic qualifié.
//
// La CLI Versuz envoie User-Agent: versuz-cli/X.Y.Z et le MCP versuz-mcp
// — aucun match avec cette blocklist. Les libs HTTP génériques (node-fetch,
// axios, etc.) sont volontairement EXCLUES pour ne pas bloquer les devs
// qui hit l'API v1 depuis leurs propres scripts.
const BLOCKED_UAS = [
  // ─── Training-only AI bots (zéro discovery utilisateur) ───
  "GPTBot", // OpenAI training (vs ChatGPT-User qui est user-initiated)
  "ClaudeBot", // Anthropic training (vs Claude-Web user-initiated)
  "anthropic-ai", // Anthropic generic training crawler
  "CCBot", // Common Crawl → utilisé pour entraîner quasi tous les LLMs
  "Google-Extended", // Google Gemini training opt-out (n'affecte pas Google Search)
  "Bytespider", // ByteDance / TikTok AI training
  "Amazonbot", // Amazon Alexa training
  "cohere-ai", // Cohere training
  "Diffbot", // Scraper commercial
  "Meta-ExternalAgent", // Meta AI training
  "Meta-ExternalFetcher", // Meta AI training
  "FacebookBot", // Meta crawler
  "Timpibot", // Generic AI bot
  "ImagesiftBot", // AI image training
  "YouBot", // You.com AI search training crawler
  "PetalBot", // Huawei AI

  // ─── SEO scrapers commerciaux sans valeur pour Versuz ───
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "AwarioBot",
  "Barkrowler",
  "SerpstatBot",
  "ZoominfoBot",
  "SeekportBot",
  "Omgili",

  // ─── Scrapers typiques (libs HTTP utilisées en mode bot) ───
  // Note : on EXCLUT node-fetch / axios / okhttp parce que des devs
  // peuvent légitimement hit l'API v1 depuis leurs propres scripts.
  "scrapy",
  "python-requests",
  "Go-http-client",
  "curl/",
  "wget",
  "httpx",
];

// Bots IA AUTORISÉS explicitement (commenté ici pour mémoire — on n'a pas
// besoin de les whitelist car ils ne matchent pas la BLOCKED_UAS) :
//   - ChatGPT-User       → user clique un lien dans ChatGPT
//   - Perplexity-User    → user clique un résultat Perplexity
//   - PerplexityBot      → indexe pour Perplexity Search (discovery)
//   - OAI-SearchBot      → indexe pour ChatGPT Search (discovery)
//   - Claude-Web         → user fetch via Claude.ai
//   - Applebot-Extended  → Apple Intelligence (potentiel discovery)
//   - Googlebot, Bingbot, DuckDuckBot → SEO classique

const BLOCKED_UA_PATTERN = new RegExp(
  BLOCKED_UAS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

// Routes qui ne passent JAMAIS par le bot blocker (mêmes si UA suspecte).
// Webhooks externes (Stripe), cron Vercel, badges (embed README publics).
const SKIP_PATHS = [
  "/api/webhooks/",
  "/api/cron/",
  "/api/auth/", // OAuth callback
  "/badge/", // embed README — peut être hit par crawlers GitHub legit
  "/_next/",
  "/_vercel/",
];

export function middleware(request) {
  const path = request.nextUrl.pathname;

  // Skip routes système / webhooks / badges.
  if (SKIP_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") || "";

  // Vercel Cron (cron jobs internes) → toujours autorisé.
  if (ua.includes("vercel-cron")) return NextResponse.next();

  // Match bots agressifs → 403 immédiat. Pas de Function Invocation.
  if (BLOCKED_UA_PATTERN.test(ua)) {
    return new NextResponse("Forbidden — bot traffic", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // Aucun cache : si l'UA change, on re-evalue tout de suite.
        "Cache-Control": "no-store",
        // Hint pour les debug : `curl -I` montre la raison.
        "X-Robots-Tag": "noindex",
      },
    });
  }

  return NextResponse.next();
}

// Matcher : exclure les assets statiques + endpoints programmatiques pour
// ne pas burner du quota middleware. Sortir aussi :
//   - /api/v1/*    → endpoints SDK (CLI Versuz, MCP server, devs tiers)
//                    qui hit l'API. Leurs UAs sont volontairement non
//                    filtrés (cf BLOCKED_UAS comment). Skip = -CPU.
//   - /api/webhooks/*, /api/cron/*, /api/auth/* : déjà bypass via
//     SKIP_PATHS, mais sortir du matcher économise l'execution complète.
//   - /badge/*     → SVG embed dans README/Notion. Ne JAMAIS bloquer.
//   - /feed/*      → RSS, lus par des bots feed-readers légitimes.
//   - /sitemap.xml, /robots.txt → SEO crawlers légitimes.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon0.svg|icon1.png|icon.svg|manifest.json|api/v1|api/webhooks|api/cron|api/auth|badge|feed|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf|eot|map)$).*)",
  ],
};
