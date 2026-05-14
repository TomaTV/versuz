import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { VzNav } from "@/components/site/vz-nav";
import { VzTicker } from "@/components/site/vz-ticker";
import { VzFooter } from "@/components/site/vz-footer";
import { CmdKSearch } from "@/components/site/cmd-k-search";

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
    images: ["/og-images.png"],
  },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed/skills", title: "Versuz · skills" },
        { url: "/feed/claude-md", title: "Versuz · CLAUDE.md" },
      ],
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrumentSerif.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <VzNav />
        <VzTicker />
        <main className="flex-1 vz-fadein">{children}</main>
        <VzFooter />
        <CmdKSearch />
      </body>
    </html>
  );
}
