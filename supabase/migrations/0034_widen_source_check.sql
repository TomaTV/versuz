-- 0034 — Widen source CHECK to support mass scraper variants.
--
-- The original CHECK in 0033 only allowed 5 values. The mass scraper and
-- alternative GitHub scraper both produce entries that don't fit these
-- buckets. Rather than shoehorning everything into 'github', add the
-- missing values.

-- Drop old constraint (named by Postgres convention: <table>_<column>_check)
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_source_check;
ALTER TABLE skills
  ADD CONSTRAINT skills_source_check
  CHECK (source IN ('github', 'sourcegraph', 'searchcode', 'gitlab', 'manual', 'github-mass', 'github-alt'));

ALTER TABLE claude_md_files DROP CONSTRAINT IF EXISTS claude_md_files_source_check;
ALTER TABLE claude_md_files
  ADD CONSTRAINT claude_md_files_source_check
  CHECK (source IN ('github', 'sourcegraph', 'searchcode', 'gitlab', 'manual', 'github-mass', 'github-alt'));
