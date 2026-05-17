/**
 * Shared content upload helper for Node scripts (scrapers, migrations).
 *
 * Dispatches to either Cloudflare R2 (if R2_* env vars set) or Supabase
 * Storage (fallback). The Next.js server uses src/lib/content/storage.js
 * which mirrors this logic for the runtime side.
 *
 * Why duplicate ? scripts/ are raw Node ESM and can't `import` from
 * `@/lib/...` paths (alias is Next.js-only). Keeping the logic in lockstep
 * is easy — both files dispatch on the same env vars and write to the
 * same path shape.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SUPABASE_BUCKET = "content";
const R2_BUCKET = process.env.R2_BUCKET || "versuz-content";

function r2Enabled() {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

let _r2 = null;
function getR2() {
  if (_r2) return _r2;
  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _r2;
}

/**
 * Upload markdown body. Returns the storage `path` (e.g. `skills/abc.md`)
 * on success, null on failure (logs a warning).
 *
 * The path shape is identical across both backends so DB `content_path`
 * doesn't need to change between Supabase ↔ R2 — only the resolution base.
 *
 *   prefix : `skills` or `claude-md`
 *   slug   : item slug
 *   body   : markdown string
 *   sb     : Supabase admin client (only used in Supabase fallback path)
 */
export async function uploadContentMd({ sb, prefix, slug, body }) {
  if (!body) return null;
  const path = `${prefix}/${slug}.md`;

  if (r2Enabled()) {
    try {
      await getR2().send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: path,
          Body: body,
          ContentType: "text/markdown; charset=utf-8",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      return path;
    } catch (err) {
      console.warn(`[storage] R2 upload ${path}: ${err.message}`);
      return null;
    }
  }

  // Supabase fallback
  if (!sb) {
    console.warn(`[storage] no supabase client + no R2 creds → skipping ${path}`);
    return null;
  }
  const { error } = await sb.storage.from(SUPABASE_BUCKET).upload(path, body, {
    contentType: "text/markdown; charset=utf-8",
    upsert: true,
  });
  if (error) {
    console.warn(`[storage] supabase upload ${path}: ${error.message}`);
    return null;
  }
  return path;
}

export function activeStorageBackend() {
  return r2Enabled() ? "r2" : "supabase";
}

/**
 * Resolve a content path to a public URL. Dispatches to R2 CDN if
 * R2_PUBLIC_URL is set, else to Supabase Storage public URL.
 */
export function publicContentUrl(path) {
  if (!path) return null;
  if (process.env.R2_PUBLIC_URL) {
    const base = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
    return `${base}/${path}`;
  }
  const sbBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!sbBase) return null;
  return `${sbBase.replace(/\/$/, "")}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

/**
 * Fetch markdown content from the active storage backend (R2 or Supabase).
 * Returns `{ text, error }`. Retries up to 3× with exponential backoff for
 * transient 5xx/network errors. Permanent 4xx (except 429) breaks the chain.
 */
export async function fetchContentByPath(path, { timeoutMs = 8000, maxTries = 3 } = {}) {
  if (!path) return { text: null, error: "no content_path" };
  const url = publicContentUrl(path);
  if (!url) return { text: null, error: "no storage backend configured" };

  let lastErr = null;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        return { text, error: null };
      }
      lastErr = `storage HTTP ${res.status}`;
      // On 4xx, peek at the response body for the real reason — Cloudflare /
      // R2 typically embed a useful message (WAF block, bucket misconfig,
      // rate-limit, missing key) that "storage HTTP 400" alone hides.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        try {
          const body = (await res.text()).replace(/\s+/g, " ").slice(0, 160);
          if (body) lastErr = `storage HTTP ${res.status} (${body})`;
        } catch {
          /* body unreadable — keep generic msg */
        }
        break;
      }
    } catch (err) {
      clearTimeout(timer);
      lastErr = `storage fetch: ${err.code || err.name || err.message || "unknown"}`;
    }
    if (attempt < maxTries) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return { text: null, error: lastErr };
}

/**
 * Item-aware resolver : returns inline content first (if present), else
 * fetches from storage via content_path. Pass either the full row OR
 * `{ inline, contentPath }`.
 */
export async function resolveItemContent(item) {
  const inline = item.skill_md_content ?? item.content ?? item.inline;
  if (typeof inline === "string" && inline.length > 0) {
    return { text: inline, error: null };
  }
  const path = item.content_path ?? item.contentPath;
  if (path) return await fetchContentByPath(path);
  return { text: null, error: "no inline content and no content_path" };
}

/**
 * Batch helper for scrapers : upload every row's inline content to the
 * active storage backend (R2 or Supabase Storage), set `content_path`,
 * and NULL the inline column to free DB row size. Idempotent — rows
 * without inline content are skipped.
 *
 * `kind` = "skill" or "claude_md" (decides the inline column key).
 * Mutates `rows` in place and returns the array.
 *
 * Failures fall back to keeping inline (so the scrape doesn't lose data
 * on a transient R2 hiccup). Failures are logged as warnings.
 */
export async function offloadRowsToStorage(rows, kind, sb = null) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const inlineKey = kind === "skill" ? "skill_md_content" : "content";
  const prefix = kind === "skill" ? "skills" : "claude-md";
  let uploaded = 0;
  let failed = 0;
  for (const row of rows) {
    if (!row || !row[inlineKey] || !row.slug) continue;
    if (row.content_path) continue; // already offloaded
    const path = await uploadContentMd({
      sb,
      prefix,
      slug: row.slug,
      body: row[inlineKey],
    });
    if (path) {
      row.content_path = path;
      row[inlineKey] = null;
      uploaded++;
    } else {
      failed++;
    }
  }
  if (uploaded || failed) {
    console.log(`[storage] offload ${kind} : ${uploaded} → ${activeStorageBackend()}, ${failed} failed (kept inline)`);
  }
  return rows;
}
