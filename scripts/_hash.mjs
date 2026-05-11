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
