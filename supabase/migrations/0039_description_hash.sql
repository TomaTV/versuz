-- 0039 — description_hash pour near-duplicate detection
--
-- content_hash (migration 0020) attrape les copies VERBATIM. Mais quelqu'un
-- qui copie une SKILL.md d'un gros compte en rephrasant légèrement passe
-- entre les mailles. description_hash normalise (lowercase, strip ponctuation,
-- collapse whitespace) et hash SHA-256 pour grouper les descriptions
-- quasi-identiques. Cap exact (pas fuzzy) — SimHash viendra en V2 si besoin.

ALTER TABLE skills            ADD COLUMN IF NOT EXISTS description_hash text;
ALTER TABLE claude_md_files   ADD COLUMN IF NOT EXISTS description_hash text;

CREATE INDEX IF NOT EXISTS skills_description_hash_idx
  ON skills (description_hash) WHERE description_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS claude_md_files_description_hash_idx
  ON claude_md_files (description_hash) WHERE description_hash IS NOT NULL;

-- Helper SQL : normalise une description et calcule son hash.
-- Inputs trop courts (< 30 chars) → null (pas de signal de dedup).
CREATE OR REPLACE FUNCTION normalize_description_hash(p_desc text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  IF p_desc IS NULL OR length(p_desc) < 30 THEN
    RETURN NULL;
  END IF;
  cleaned := lower(p_desc);
  cleaned := regexp_replace(cleaned, '[[:punct:]]+', ' ', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := trim(cleaned);
  IF length(cleaned) < 30 THEN
    RETURN NULL;
  END IF;
  RETURN encode(digest(cleaned::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- pgcrypto pour digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Backfill : recompute pour toutes les rows existantes
UPDATE skills            SET description_hash = normalize_description_hash(description) WHERE description_hash IS NULL;
UPDATE claude_md_files   SET description_hash = normalize_description_hash(description) WHERE description_hash IS NULL;

-- Trigger : auto-compute description_hash sur INSERT / UPDATE OF description.
-- Sans ça, chaque scraper devrait stamper le hash en JS — fragile.
CREATE OR REPLACE FUNCTION set_description_hash()
RETURNS trigger AS $$
BEGIN
  NEW.description_hash := normalize_description_hash(NEW.description);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skills_desc_hash_trg ON skills;
CREATE TRIGGER skills_desc_hash_trg
  BEFORE INSERT OR UPDATE OF description ON skills
  FOR EACH ROW EXECUTE FUNCTION set_description_hash();

DROP TRIGGER IF EXISTS claude_md_desc_hash_trg ON claude_md_files;
CREATE TRIGGER claude_md_desc_hash_trg
  BEFORE INSERT OR UPDATE OF description ON claude_md_files
  FOR EACH ROW EXECUTE FUNCTION set_description_hash();

ANALYZE skills;
ANALYZE claude_md_files;
