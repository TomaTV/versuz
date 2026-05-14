-- 0038 — capture license SPDX pour compliance ToS GitHub
--
-- Avant : license stockée dans metadata.license JSONB → non-indexable, jamais
-- affichée. Risque légal direct : on affiche des GPL/AGPL skills comme "free
-- to install" alors qu'ils requièrent disclosure du code dérivé.
--
-- Après : colonne `license_spdx text` dédiée + index. Backfill depuis
-- metadata.license pour les rows existants. Le scrape continue de remplir
-- metadata.license (rétro-compat) ET stamp la colonne dédiée.

ALTER TABLE skills            ADD COLUMN IF NOT EXISTS license_spdx text;
ALTER TABLE claude_md_files   ADD COLUMN IF NOT EXISTS license_spdx text;

CREATE INDEX IF NOT EXISTS skills_license_spdx_idx
  ON skills (license_spdx);
CREATE INDEX IF NOT EXISTS claude_md_files_license_spdx_idx
  ON claude_md_files (license_spdx);

-- Backfill depuis metadata.license (déjà capturé par le scrape depuis 2026-03).
UPDATE skills
   SET license_spdx = NULLIF(metadata->>'license', '')
 WHERE license_spdx IS NULL
   AND metadata->>'license' IS NOT NULL;

UPDATE claude_md_files
   SET license_spdx = NULLIF(metadata->>'license', '')
 WHERE license_spdx IS NULL
   AND metadata->>'license' IS NOT NULL;

ANALYZE skills;
ANALYZE claude_md_files;
