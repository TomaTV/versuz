/**
 * Upsert scraped skills into Supabase. No-op (with warning) when env vars
 * are absent — useful for local dry-runs.
 */

import { createClient } from "@supabase/supabase-js";
import { contentHash } from "../_hash.mjs";
import { purgeContentDuplicates } from "../_dedup.mjs";
import { uploadContentMd } from "../_storage.mjs";

/**
 * Upload skill_md_content to the active storage backend (R2 if R2_*
 * env vars set, otherwise Supabase Storage). Path shape identical across
 * both backends so DB `content_path` doesn't need changing.
 *
 * Activated via env `SCRAPE_USE_STORAGE=1` — sinon comportement legacy
 * (content inline en DB).
 */
async function uploadContentToStorage(sb, prefix, slug, body) {
  return uploadContentMd({ sb, prefix, slug, body });
}

export function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Dedup a batch of scraped skills by slug — multiple GitHub repos can produce
 * the same slug (e.g. 4 different repos all named "claude-code-starter").
 * Postgres ON CONFLICT DO UPDATE refuses if the SAME row would be updated
 * twice in a single statement, so we collapse to the best candidate per slug
 * BEFORE the upsert.
 *
 * "Best" = (1) highest github_stars (popularity proxy), (2) higher classifier
 * confidence as tiebreaker, (3) bundled > minimal as final tiebreaker.
 */
function dedupBySlug(skills) {
  const bySlug = new Map();
  for (const s of skills) {
    const existing = bySlug.get(s.slug);
    if (!existing) {
      bySlug.set(s.slug, s);
      continue;
    }
    const eStars = existing.github_stars || 0;
    const sStars = s.github_stars || 0;
    if (sStars > eStars) {
      bySlug.set(s.slug, s);
      continue;
    }
    if (sStars === eStars) {
      const eConf = existing.metadata?.classifier_confidence || 0;
      const sConf = s.metadata?.classifier_confidence || 0;
      if (sConf > eConf) {
        bySlug.set(s.slug, s);
        continue;
      }
      if (sConf === eConf) {
        const eBundled = (existing.metadata?.skill_type || "minimal") === "bundled";
        const sBundled = (s.metadata?.skill_type || "minimal") === "bundled";
        if (sBundled && !eBundled) bySlug.set(s.slug, s);
      }
    }
  }
  return [...bySlug.values()];
}

/**
 * @param {Array<NormalisedSkill>} skills
 *   shape: {
 *     slug, name, description, github_url, github_stars, category,
 *     skill_md_content, metadata
 *   }
 */
/**
 * Filter out rows whose content matches an EXISTING DB row under a different
 * slug — these are exact copies of an already-indexed skill, no point storing
 * them twice. Logs the duplicate pair for audit.
 */
async function filterContentDuplicates(sb, rows) {
  if (!rows.length) return rows;
  const { data: existing, error } = await sb
    .from("skills")
    .select("slug, content_hash")
    .not("content_hash", "is", null);
  if (error) return rows;
  const hashToSlug = new Map((existing || []).map((r) => [r.content_hash, r.slug]));
  const kept = [];
  for (const r of rows) {
    const dupSlug = hashToSlug.get(r.content_hash);
    if (dupSlug && dupSlug !== r.slug) {
      console.log(`[upsert] skip ${r.slug} — exact content duplicate of ${dupSlug}`);
      continue;
    }
    kept.push(r);
  }
  return kept;
}

// Module-level counter for the per-run scrape cap. When the process upserts
// more than `SCRAPE_MAX_NEW` rows total (across all calls), `upsertSkills`
// short-circuits and signals the caller to stop. Used by daily GH Actions
// to keep one run under ~1000 new items (Supabase free-tier friendly +
// avoids one bad scraper run flooding the catalog).
let UPSERT_RUN_COUNT = 0;
function readMaxNew() {
  const v = Number(process.env.SCRAPE_MAX_NEW);
  return Number.isFinite(v) && v > 0 ? v : Infinity;
}

export async function upsertSkills(sb, skills) {
  if (UPSERT_RUN_COUNT >= readMaxNew()) {
    console.log(`[upsert] SCRAPE_MAX_NEW=${readMaxNew()} reached (${UPSERT_RUN_COUNT}). Skipping batch.`);
    return { skipped: true, count: 0, capped: true };
  }
  // Compute content_hash on every row up-front
  for (const s of skills) {
    if (!s.content_hash) s.content_hash = contentHash(s.skill_md_content);
  }
  if (!sb) {
    console.log(`[upsert] Supabase not configured. Would upsert ${skills.length} skills.`);
    return { skipped: true, count: skills.length };
  }
  const deduped = dedupBySlug(skills);
  const collapsed = skills.length - deduped.length;
  if (collapsed > 0) {
    console.log(`[upsert] collapsed ${collapsed} duplicate slug(s) before upsert`);
  }
  const filtered = await filterContentDuplicates(sb, deduped);
  const removed = deduped.length - filtered.length;
  if (removed > 0) {
    console.log(`[upsert] dropped ${removed} content-duplicate row(s) (same SHA, different repo)`);
  }
  if (!filtered.length) return { skipped: false, count: 0 };

  // Storage offload : si SCRAPE_USE_STORAGE=1, upload content vers le bucket
  // public "content" et stamp content_path. Met aussi skill_md_content=null
  // pour libérer la place DB (sinon le content reste dupliqué inline + Storage).
  // Le bucket doit pré-exister.
  if (process.env.SCRAPE_USE_STORAGE === "1") {
    for (const row of filtered) {
      if (!row.skill_md_content) continue;
      const path = await uploadContentToStorage(sb, "skills", row.slug, row.skill_md_content);
      if (path) {
        row.content_path = path;
        row.skill_md_content = null; // free DB row size
      }
    }
  }

  const { error, count } = await sb.from("skills").upsert(filtered, {
    onConflict: "slug",
    count: "exact",
  });
  if (error) throw new Error(`[upsert] ${error.message}`);
  UPSERT_RUN_COUNT += count || 0;
  if (UPSERT_RUN_COUNT >= readMaxNew()) {
    console.log(`[upsert] reached SCRAPE_MAX_NEW=${readMaxNew()} (run total : ${UPSERT_RUN_COUNT}). Further batches will be skipped.`);
  }
  // Auto-purge any pre-existing dups (covers the case where a NEW upsert
  // landed under a slug whose old content was a dup of someone else's row)
  const { deleted } = await purgeContentDuplicates(sb, "skills");
  if (deleted > 0) console.log(`[upsert] auto-purged ${deleted} content duplicate(s)`);
  return { skipped: false, count, runTotal: UPSERT_RUN_COUNT };
}
