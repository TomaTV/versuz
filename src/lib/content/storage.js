/**
 * Content storage — dual-backend dispatch (Cloudflare R2 primary, Supabase
 * Storage fallback).
 *
 * Migration 0042 originally put SKILL.md / CLAUDE.md bodies on Supabase
 * Storage bucket `content`. With ~100k items × ~12 KB avg, the bucket hit
 * 1.2 GB and exceeded the 1 GB free-tier cap. We've now moved the heavy
 * content off to Cloudflare R2 (10 GB free, zero egress fees) and kept
 * Supabase for DB metadata + auth only.
 *
 * Dispatch logic :
 *   - If R2_PUBLIC_URL env is set → reads serve from R2 CDN
 *   - Otherwise → fallback to Supabase Storage (legacy path)
 *   - Writes follow the same rule based on R2 creds presence
 *
 * Env vars for R2 :
 *   R2_PUBLIC_URL          e.g. https://cdn.versuz.dev (public read URL)
 *   R2_ACCOUNT_ID          Cloudflare account ID (for writes only)
 *   R2_ACCESS_KEY_ID       R2 API token Access Key ID
 *   R2_SECRET_ACCESS_KEY   R2 API token Secret Access Key
 *   R2_BUCKET              bucket name (default: versuz-content)
 *
 * The `content_path` column in DB stays the same shape across both
 * backends : `skills/<slug>.md` or `claude-md/<slug>.md`. We just resolve
 * it against a different base URL depending on env config.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SUPABASE_BUCKET = "content";
const R2_BUCKET = process.env.R2_BUCKET || "versuz-content";

function r2Enabled() {
  return !!process.env.R2_PUBLIC_URL;
}

/**
 * Public URL for a content file. Resolves to R2 CDN if configured, else
 * to Supabase Storage public URL. Path shape : `skills/<slug>.md` or
 * `claude-md/<slug>.md` (same across both backends).
 */
export function publicContentUrl(path) {
  if (!path) return null;
  if (r2Enabled()) {
    const base = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
    return `${base}/${path}`;
  }
  const sbBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!sbBase) return null;
  return `${sbBase.replace(/\/$/, "")}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

/**
 * Server-side fetch the content body. Returns null on miss/error so the
 * caller can fall back to the inline DB column. Adds a 5s timeout so a
 * slow CDN edge doesn't block the request indefinitely.
 */
export async function fetchContentByPath(path) {
  if (!path) return null;
  const url = publicContentUrl(path);
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    // R2 objects are uploaded with `Cache-Control: public, max-age=31536000,
    // immutable`. Letting Next.js Data Cache hold the body means a hot detail
    // page (ISR) doesn't burn a Function-side fetch on every render — Vercel
    // serves the cached body. Was `no-store` historically, which forced a
    // round-trip per invocation. Killed during May 2026 free-tier optimisation.
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Priority chain : inline column (legacy un-migrated rows) → Storage.
 * Once the inline-to-storage migration is fully purged in DB, only the
 * Storage branch matters.
 */
export async function resolveContent({ inline, contentPath }) {
  if (typeof inline === "string" && inline.length > 0) return inline;
  if (contentPath) return await fetchContentByPath(contentPath);
  return null;
}

/**
 * Upload markdown body to the active backend.
 * Returns `{ path }` on success or `{ error }` on failure.
 *
 *   skill     → `skills/<slug>.md`
 *   claude_md → `claude-md/<slug>.md`
 *
 * The path shape is identical across R2 and Supabase Storage so the DB
 * `content_path` column never needs rewriting during/after migration.
 */
export async function uploadContent(kind, slug, body) {
  if (!slug || !body) return { error: "missing slug/body" };
  const prefix = kind === "skill" ? "skills" : "claude-md";
  const path = `${prefix}/${slug}.md`;

  if (r2Enabled()) {
    return await uploadToR2(path, body);
  }
  return await uploadToSupabase(path, body);
}

async function uploadToSupabase(path, body) {
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "no supabase admin client (SUPABASE_SERVICE_ROLE_KEY missing)" };
  const { error } = await sb.storage.from(SUPABASE_BUCKET).upload(path, body, {
    contentType: "text/markdown; charset=utf-8",
    upsert: true,
  });
  if (error) return { error: error.message };
  return { path };
}

// Lazy-import the R2 client only when we actually need it (avoids loading
// the AWS SDK in pages that never write content — most reads just hit the
// public CDN URL directly).
let _r2Client = null;
async function getR2Client() {
  if (_r2Client) return _r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _r2Client;
}

async function uploadToR2(path, body) {
  const client = await getR2Client();
  if (!client) return { error: "R2 credentials missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)" };
  try {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: path,
        Body: body,
        ContentType: "text/markdown; charset=utf-8",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { path };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}
