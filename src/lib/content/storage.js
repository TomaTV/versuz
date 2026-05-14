/**
 * Content storage helpers — read SKILL.md / CLAUDE.md body from Supabase
 * Storage bucket `content` (public). Falls back to inline DB column
 * (skill_md_content / content) for legacy rows not yet migrated.
 *
 * Migration 0042. Migrate-script : scripts/migrate-content-to-storage.mjs.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "content";

/**
 * Public URL pour fetch direct depuis browser ou server (bucket public).
 * Pas de signing latency, le bucket `content` est read-public.
 *
 * Pour le premium download, utiliser src/lib/premium/storage.js
 * (bucket privé `premium-content` + signed URLs).
 */
export function publicContentUrl(path) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Server-side fetch du content depuis Storage. Retourne null si path missing
 * ou fetch échoue. Caller responsable de fallback sur la colonne legacy.
 */
export async function fetchContentByPath(path) {
  if (!path) return null;
  const url = publicContentUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Resolve le content body pour une row mapped (skill ou claude_md). Priorité :
 *   1. inline column (legacy `skill_md_content` / `content`) si présent
 *   2. Storage via `contentPath` sinon
 *
 * Inline-d'abord pour ne pas faire un round-trip Storage inutile quand la
 * row n'est pas encore migrée. Une fois purge fait, seul Storage répond.
 */
export async function resolveContent({ inline, contentPath }) {
  if (typeof inline === "string" && inline.length > 0) return inline;
  if (contentPath) return await fetchContentByPath(contentPath);
  return null;
}

/**
 * Server-side helper for scrapers / submit endpoints.
 * Upload markdown to Storage bucket `content`. Returns `{ path }` on success
 * or `{ error }` on failure. Idempotent (upsert: true).
 *
 * Pattern key :
 *   - skills      : `skills/<slug>.md`
 *   - claude_md   : `claude-md/<slug>.md`
 *
 * Requires service-role key (RLS bypass for write).
 */
export async function uploadContent(kind, slug, body) {
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "no supabase admin client (SUPABASE_SERVICE_ROLE_KEY missing)" };
  if (!slug || !body) return { error: "missing slug/body" };
  const prefix = kind === "skill" ? "skills" : "claude-md";
  const path = `${prefix}/${slug}.md`;
  const { error } = await sb.storage.from(BUCKET).upload(path, body, {
    contentType: "text/markdown; charset=utf-8",
    upsert: true,
  });
  if (error) return { error: error.message };
  return { path };
}
