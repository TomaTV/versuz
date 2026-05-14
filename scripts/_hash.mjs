import crypto from "node:crypto";

/**
 * SHA-256 hex of raw content. Used to dedup SKILL.md / CLAUDE.md across
 * different repos (forks, templates, copy-pastes).
 *
 * No normalization on purpose — we want exact-match dedup. A single space
 * difference is treated as a different file. Fuzzy similarity would be a
 * V2 thing (MinHash or embeddings).
 */
export function contentHash(s) {
  return crypto.createHash("sha256").update(s || "").digest("hex");
}

/**
 * Normalized description hash for near-duplicate detection (migration 0039).
 * Same algo que la SQL function `normalize_description_hash` :
 *   - lowercase
 *   - strip ponctuation
 *   - collapse whitespace
 *   - hash SHA-256
 * Retourne null si la description est trop courte (< 30 chars après normalize)
 * pour être un signal fiable de duplication.
 */
export function descriptionHash(s) {
  if (!s || typeof s !== "string") return null;
  if (s.length < 30) return null;
  const cleaned = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 30) return null;
  return crypto.createHash("sha256").update(cleaned).digest("hex");
}
