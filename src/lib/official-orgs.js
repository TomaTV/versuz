/**
 * Whitelist d'orgs GitHub considérées "official" — badge bleu auto-attribué
 * au scrape quand `metadata.owner` match (case-insensitive).
 *
 * Indépendant de la trust ladder (verification_level 0-4). Un item peut
 * être both featured ET official. Lecture seule depuis JS + miroir SQL
 * dans la migration 0021_is_official.sql pour le backfill.
 */
export const OFFICIAL_ORGS = new Set([
  // AI labs
  "anthropics",
  "anthropic",
  "openai",
  "google",
  "google-deepmind",
  "googleapis",
  "google-research",
  "google-gemini",
  "meta-llama",
  "huggingface",
  "mistralai",
  "deepseek-ai",
  "xai-org",

  // Cloud + infra
  "microsoft",
  "azure",
  "aws",
  "amazon",
  "vercel",
  "cloudflare",
  "supabase",
  "stripe",
  "github",

  // Data / dev tools
  "mongodb",
  "redis",
  "elastic",
  "docker",
  "kubernetes",
  "pytorch",
  "tensorflow",
  "facebook",
  "apple",
]);

export function isOfficialOwner(owner) {
  if (!owner) return false;
  return OFFICIAL_ORGS.has(String(owner).toLowerCase());
}
