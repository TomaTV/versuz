-- 0044 — Add `is_bundled` generated column to skills for fast filter
--
-- Why : the marketplace bundle filter ("single items" / "bundles only")
-- needs a server-side index for a usable UX (client filter only sees the
-- visible 50 items). PostgREST `.or()` with jsonb extract paths
-- (`metadata->>skill_type.is.null,...`) doesn't parse reliably, so we
-- promote the signal into a real column with a small B-tree index.
--
-- COALESCE keeps the column non-NULL (defaults to false when skill_type
-- key is missing from metadata, which is ~95% of rows). With a non-NULL
-- boolean, the filter is just `.eq("is_bundled", true|false)`.
--
-- Storage cost : 1 byte per row × 93k rows = ~93 KB. Index : ~1 MB.
-- Total : ~1.1 MB to make the bundle filter work at scale. Worth it.

ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS is_bundled boolean
  GENERATED ALWAYS AS (
    COALESCE(metadata->>'skill_type', '') = 'bundled'
  ) STORED;

CREATE INDEX IF NOT EXISTS skills_is_bundled_idx
  ON skills (is_bundled);

COMMENT ON COLUMN skills.is_bundled IS
  'Generated from metadata.skill_type. TRUE if skill_type=bundled, FALSE otherwise (including NULL/minimal/other). Used by /marketplace bundle filter.';
