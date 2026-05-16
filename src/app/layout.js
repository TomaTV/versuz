import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import { VzNav } from "@/components/site/vz-nav";
import { VzTicker } from "@/components/site/vz-ticker";
import { VzFooter } from "@/components/site/vz-footer";
import { CmdKSearch } from "@/components/site/cmd-k-search";
import { SubscribeToast } from "@/components/site/subscribe-toast";
import { DbStatusBanner } from "@/components/site/db-status-banner";
import { ArenaStickyCTA } from "@/components/arena-sticky-cta";
import { PostHogProvider } from "@/components/posthog-provider";

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-geist",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  // adjustFontFallback aligne les métriques du fallback (Times) sur Instrument
  // Serif → réduit le CLS au swap, particulièrement visible sur Android (51%
  // du trafic) où la police n'est jamais déjà en cache.
  adjustFontFallback: "Times New Roman",
  variable: "--font-instrument-serif",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata = {
  metadataBase: new URL("https://versuz.dev"),
  title: {
    default: "Versuz — Skills go in. Only one wins.",
    template: "%s · Versuz",
  },
  description:
    "The public leaderboard for AI agent skills. Find the best SKILL.md and CLAUDE.md for Claude Code, Cursor, and Codex CLI. Every skill tested daily on the same tasks, judged by three AI models, ranked openly. Free.",
  keywords: [
    "AI agent skills",
    "Claude skills",
    "Claude Code skills",
    "SKILL.md",
    "CLAUDE.md",
    "Cursor rules",
    "Codex CLI",
    "AI skills leaderboard",
    "AI agent benchmark",
    "best Claude skills",
    "MCP server",
    "AI coding agent skills",
    "skill marketplace",
    "LLM benchmark",
  ],
  authors: [{ name: "FlukX Studio" }],
  creator: "FlukX Studio",
  openGraph: {
    title: "Versuz — Skills go in. Only one wins.",
    description:
      "The public leaderboard for AI agent skills (SKILL.md, CLAUDE.md). Three AI judges, 30 tasks, one ranking per category. Updated every 24 hours. Free and open.",
    url: "https://versuz.dev",
    siteName: "Versuz",
    type: "website",
    locale: "en_US",
    // Static fallback first (always works) — dynamic opengraph-image.js still
    // overrides on the homepage. If dynamic ever fails, Facebook/LinkedIn fall
    // back to this static one. Keep file in /public.
    images: [
      {
        url: "/og-images.png",
        width: 1200,
        height: 630,
        alt: "Versuz — Skills go in. Only one wins.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Versuz — AI agent skills leaderboard",
    description:
      "Skills go in. Only one wins. Three frontier judges, thirty held-out tasks, Bayesian Elo. Updated every 24h.",
    site: "@versuzdev",
    creator: "@versuzdev",
    images: ["/og-images.png"],
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/feed/skills", title: "Versuz · skills" },
        { url: "/feed/claude-md", title: "Versuz · CLAUDE.md" },
      ],
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      "msvalidate.01": "EDD2BAF9562347194866C68CDB7129D3",
    },
  },
  category: "technology",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://versuz.dev/#org",
      name: "Versuz",
      url: "https://versuz.dev",
      logo: "https://versuz.dev/logo-black.svg",
      description:
        "The open public benchmark for AI agent skills. Versuz scrapes, judges, and ranks SKILL.md and CLAUDE.md files used by Claude Code, Cursor, Codex, and modern AI coding agents.",
      sameAs: [
        "https://github.com/TomaTV/versuz",
        "https://x.com/versuzdev",
        "https://www.linkedin.com/company/versuz-dev",
        "https://www.instagram.com/versuz.dev/",
        "https://www.tiktok.com/@versuz.dev",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://versuz.dev/#website",
      url: "https://versuz.dev",
      name: "Versuz",
      description: "Open public benchmark for AI agent skills.",
      publisher: { "@id": "https://versuz.dev/#org" },
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://versuz.dev/marketplace?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrumentSerif.variable} ${jetbrains.variable}`}
      style={{ background: "#f2eee6", colorScheme: "light" }}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#f2eee6" />
        <meta name="color-scheme" content="light" />
        {/* Preconnect to the origins we hit before paint — saves the
            DNS+TLS roundtrip on first fetch. ~150-200ms on cold visits. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
            crossOrigin="anonymous"
          />
        )}
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.resend.com" />
        {/* No-flash auth slot. The next/script with strategy=beforeInteractive
            loads BEFORE any React hydration, reads localStorage and sets
            <html data-auth="user|anon"> so the nav slot picks the right CTA
            on the very first paint. /api/auth/me re-verification happens later
            from NavAuthCluster's useEffect. */}
        <Script
          id="vz-auth-bootstrap"
          strategy="beforeInteractive"
        >
          {`(function(){try{var r=localStorage.getItem('vz-auth-cache');if(!r)return;var p=JSON.parse(r);if(!p||!p.ts||Date.now()-p.ts>86400000)return;var d=document.documentElement;if(p.user){d.dataset.auth='user';if(p.user.login)d.dataset.authLabel='@'+p.user.login;else if(p.user.email)d.dataset.authLabel=p.user.email;if(p.user.isAdmin)d.dataset.authAdmin='1';}else{d.dataset.auth='anon';}}catch(e){}})();`}
        </Script>
        <Script
          id="vz-json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(JSON_LD)}
        </Script>
      </head>
      <body
        className="min-h-screen flex flex-col"
        style={{ background: "#f2eee6", color: "#14120e" }}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <DbStatusBanner />
          <VzNav />
          <VzTicker />
          <main className="flex-1 vz-fadein">{children}</main>
          <VzFooter />
          <CmdKSearch />
          <SubscribeToast />
          <ArenaStickyCTA />
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
