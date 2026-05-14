-- 0035 — Remove source CHECK constraints entirely.
--
-- Restricting the source column to a whitelist is too brittle for a growing
-- ingestion engine. We want to be able to tag data with 'github-fresh', 
-- 'web-directory', 'skills-rank', etc. without modifying the schema each time.

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_source_check;
ALTER TABLE claude_md_files DROP CONSTRAINT IF EXISTS claude_md_files_source_check;
