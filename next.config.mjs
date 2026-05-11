/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
};

export default nextConfig;
