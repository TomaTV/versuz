-- 0046 — Add repo_skill_count column to skills for proper bundle filtering
--
-- A "bundle" in Versuz has two meanings (see /CLAUDE.md) :
--   1. skill_type=bundled  — the SKILL.md ships with companion files
--   2. repoSkillCount > 1  — the GitHub repo contains multiple skills
--
-- The marketplace bundle filter should hide BOTH from "Single items".
-- Until now, repoSkillCount was computed at runtime per page, so the
-- filter only saw the 50 visible items. Promoting it to a stored column
-- + index makes "Single items" actually mean "single in its repo too".
--
-- Applied via MCP supabase 2026-05-14. Current distribution :
--   bundled_or_multirepo : 90927 (97%)
--   true_single          :  2680 (3%)

ALTER TABLE skills ADD COLUMN IF NOT EXISTS repo_skill_count integer DEFAULT 1;
CREATE INDEX IF NOT EXISTS skills_repo_skill_count_idx ON skills(repo_skill_count);

-- Backfill : count skills per (owner, repo) and stamp on every row.
UPDATE skills s SET repo_skill_count = c.cnt
FROM (
  SELECT
    metadata->>'owner' AS owner,
    metadata->>'repo'  AS repo,
    count(*)           AS cnt
  FROM skills
  WHERE metadata->>'owner' IS NOT NULL
    AND metadata->>'repo'  IS NOT NULL
  GROUP BY 1, 2
) c
WHERE s.metadata->>'owner' = c.owner
  AND s.metadata->>'repo'  = c.repo;

-- TODO V1.5 : trigger to maintain on insert/delete, OR cron job that
-- re-runs the backfill every N hours. For V1 the column reflects state
-- at migration time + scrape pipeline should also stamp it on upsert.
