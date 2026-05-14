/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
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

export default nextConfig;
