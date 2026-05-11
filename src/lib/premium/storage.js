/**
 * Premium-content storage helpers.
 *
 * All access goes through Supabase Storage signed URLs minted server-side
 * with the service-role client. The bucket (`premium-content`) is private —
 * no anonymous reads, no authenticated-user reads. Buyers see a download
 * link only because we sign one for them after their purchase row is paid.
 *
 * Path convention: `<kind>/<subject_id>/<filename>` so renames of the
 * skill's slug never break the link. We store this string in the row's
 * `private_storage_path` column so future signs don't need to guess.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const PREMIUM_BUCKET = "premium-content";

// 7 days in seconds. Long enough that the buyer doesn't have to refresh the
// page to re-fetch, short enough that a leaked URL eventually rots.
export const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Build the storage path for a subject upload. `kind` is "skill" or
 * "claude_md", matching `subject_kind` in `purchases`.
 */
export function buildStoragePath({ kind, subjectId, filename }) {
  const safeName = String(filename || "SKILL.md").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${kind}/${subjectId}/${safeName}`;
}

/**
 * Upload a premium file (Buffer / Blob / Uint8Array) to the private bucket.
 * Idempotent — overwrites any existing object at the same path so an author
 * can re-upload a new version without changing the row's stored path.
 *
 * Returns { path } on success, { error } on failure.
 */
export async function uploadPremiumFile({ kind, subjectId, filename, body, contentType = "text/markdown" }) {
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "supabase_admin_unavailable" };

  const path = buildStoragePath({ kind, subjectId, filename });
  const { error } = await sb.storage
    .from(PREMIUM_BUCKET)
    .upload(path, body, { upsert: true, contentType });

  if (error) return { error: error.message };
  return { path };
}

/**
 * Mint a signed URL for `path`. Caller is expected to have verified ownership
 * (purchase paid OR author of the subject) before calling this.
 *
 * Returns { url, expiresAt } or { error }.
 */
export async function signPremiumDownloadUrl(path, ttlSeconds = SIGNED_URL_TTL_SECONDS) {
  if (!path) return { error: "missing_path" };
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "supabase_admin_unavailable" };

  const { data, error } = await sb.storage
    .from(PREMIUM_BUCKET)
    .createSignedUrl(path, ttlSeconds, { download: true });

  if (error) return { error: error.message };
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}
