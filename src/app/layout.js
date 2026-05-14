import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { VzNav } from "@/components/site/vz-nav";
import { VzTicker } from "@/components/site/vz-ticker";
import { VzFooter } from "@/components/site/vz-footer";
import { CmdKSearch } from "@/components/site/cmd-k-search";
import { SubscribeToast } from "@/components/site/subscribe-toast";

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-geist",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
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
    default: "Versuz — AI agent skills leaderboard, judged by 3 frontier models",
    template: "%s · Versuz",
  },
  description:
    "Public adversarial leaderboard for AI agent skills (Claude Code, Codex CLI, Cursor). Each cycle every skill runs the same 30-task suite and is judged by three independent models. Bayesian Elo rankings updated every 24 hours.",
  keywords: [
    "AI skills leaderboard",
    "AI agent benchmark",
    "Claude skills ranking",
    "Codex CLI skills",
    "Cursor skills",
    "MCP benchmark",
    "SKILL.md",
    "PDF extraction skill",
    "LLM benchmark",
    "skill marketplace",
  ],
  authors: [{ name: "FlukX Studio" }],
  creator: "FlukX Studio",
  openGraph: {
    title: "Versuz — AI agent skills leaderboard",
    description:
      "Public adversarial leaderboard for AI agent skills. Three frontier judges, thirty held-out tasks, one ranking per category. Updated every 24 hours.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col"
        style={{ background: "#f2eee6", color: "#14120e" }}
        suppressHydrationWarning
      >
        <VzNav />
        <VzTicker />
        <main className="flex-1 vz-fadein">{children}</main>
        <VzFooter />
        <CmdKSearch />
        <SubscribeToast />
        <Analytics />
      </body>
    </html>
  );
}
