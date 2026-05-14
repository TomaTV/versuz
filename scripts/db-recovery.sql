-- Versuz · DB Recovery
-- ====================
-- Run this in Supabase SQL Editor AFTER Pro upgrade (more disk + I/O headroom).
-- Order matters: trigram indexes drop first to free space, then migrations
-- 0039 → 0043 apply on a healthy DB, then VACUUM compacts physical files.
--
-- Expected effect:
--   - DROP INDEX × 5 trgm       → frees ~100-150 MB
--   - migrate-content-to-storage → frees 200-400 MB (RUN SEPARATELY, see below)
--   - VACUUM FULL                → compacts physical disk usage
--   Total: DB usage drops from 500+ MB to 200-300 MB → fits free tier again

-- ─── 1. Drop the 5 trigram GIN indexes that saturated free-tier disk ────
-- These were added in 0037 for ILIKE search. We'll re-add them later on Pro
-- (or replace with smaller pg_trgm operators with a similarity threshold).

DROP INDEX IF EXISTS public.skills_name_trgm_idx;
DROP INDEX IF EXISTS public.skills_slug_trgm_idx;
DROP INDEX IF EXISTS public.skills_description_trgm_idx;
DROP INDEX IF EXISTS public.claude_md_files_slug_trgm_idx;
DROP INDEX IF EXISTS public.claude_md_files_description_trgm_idx;

-- ─── 2. Check current disk usage before migrations ────────────────────
-- Run this manually to confirm step 1 freed disk:
--   SELECT pg_size_pretty(pg_database_size(current_database()));

-- ─── 3. Apply migrations 0039 → 0043 ──────────────────────────────────
-- DO NOT run inline here — instead use:
--   supabase db push                              (if you have Supabase CLI)
-- OR paste each migration file content individually in SQL Editor:
--   1. supabase/migrations/0039_description_hash.sql
--   2. supabase/migrations/0040_multi_category.sql
--   3. supabase/migrations/0041_archive.sql
--   4. supabase/migrations/0042_content_storage.sql
--   5. supabase/migrations/0043_rls_perf_wrap_auth_uid.sql

-- ─── 4. VACUUM FULL — reclaim disk physically after the cleanup ───────
-- WARNING: locks tables exclusively. Run during low traffic (Pro tier has
-- the I/O budget to handle this).

VACUUM FULL public.skills;
VACUUM FULL public.claude_md_files;
VACUUM FULL public.run_outputs;
VACUUM FULL public.judge_scores;
VACUUM FULL public.scores;

-- ─── 5. Verify ────────────────────────────────────────────────────────
-- Confirm DB is under 400 MB before downgrading to Free:
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS db_size,
  (SELECT count(*) FROM skills) AS skills_count,
  (SELECT count(*) FROM claude_md_files) AS claude_md_count;
