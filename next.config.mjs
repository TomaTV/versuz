import { withSentryConfig } from "@sentry/nextjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    // cacheComponents NON activé pour l'instant — la migration sans Suspense
    // wrapping de tous les fetches top-level provoque des timeouts en dev
    // (home 20s+, Supabase free statement timeout). Un commit dédié devra :
    //   1. Wrap chaque fetch top-level de page.js, marketplace, leaderboard,
    //      skills/[slug] dans un <Suspense> serveur
    //   2. OU migrer tous les helpers de rankings.js en `'use cache'`
    //      directive (~30 fonctions) avec cacheLife() pour TTL
    // En attendant, les 38 routes ont été migrées (directives retirées) mais
    // cacheComponents:false → comportement Next 16 par défaut. Les wins
    // shippés mai 2026 (badge s-maxage=86400, robots.txt disallow) suffisent
    // pour stabiliser le CPU.
    serverActions: {
      // Premium-content uploads at submit time go through server actions.
      // Default 1MB is too tight for a SKILL.md with assets / .zip bundle —
      // 12mb covers the 10mb cap enforced in lib/submit/actions.js with
      // headroom for the FormData envelope.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking — Versuz pages must not load in third-party iframes
          { key: "X-Frame-Options", value: "DENY" },
          // Tell browsers to never sniff MIME types away from what we declared
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer info leaking to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable features we never use (mic/camera/geo) site-wide
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // HSTS — force HTTPS for 1 year incl. subdomains. Vercel already
          // strips http, but this prevents downgrade attacks on first visit.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Embeddable badge SVGs are explicitly designed to be iframed/img'd
        // elsewhere (Notion, Linear, Discord). Override the global DENY.
        source: "/badge/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "flukx-studio",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
