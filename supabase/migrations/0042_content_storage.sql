-- 0042 — content storage migration
--
-- Avant : skill_md_content et content (CLAUDE.md body) stockés inline dans la
-- DB. À 100k items × 2-5KB par row, ça représente 200-500MB → free tier
-- Supabase saturé à 408/500MB.
--
-- Après : nouvelle colonne `content_path text` (référence vers Supabase
-- Storage bucket `content` public, key pattern `skills/<slug>.md` ou
-- `claude-md/<slug>.md`). Les colonnes legacy `skill_md_content` / `content`
-- sont gardées (nullable déjà) pour rollback. Le script
-- `scripts/migrate-content-to-storage.mjs --purge` les vide après migration.
--
-- À FAIRE EN PARALLÈLE :
--   1. Créer le bucket `content` public dans Supabase Dashboard (Storage)
--      OU laisser le script le créer automatiquement.
--   2. Run `node scripts/migrate-content-to-storage.mjs` pour migrer
--      les rows existantes.
--   3. Une fois validé, re-run avec `--purge` pour NULL les colonnes legacy
--      et lancer VACUUM pour reclaim l'espace DB.

ALTER TABLE skills            ADD COLUMN IF NOT EXISTS content_path text;
ALTER TABLE claude_md_files   ADD COLUMN IF NOT EXISTS content_path text;

CREATE INDEX IF NOT EXISTS skills_content_path_idx
  ON skills (content_path) WHERE content_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS claude_md_files_content_path_idx
  ON claude_md_files (content_path) WHERE content_path IS NOT NULL;
