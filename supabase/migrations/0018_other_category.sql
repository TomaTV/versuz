-- 0018 — add 'other' bucket to category checks.
--
-- Why : the original 6 skill categories (document/sql/data/web/shell/code)
-- and 8 CLAUDE.md project categories (nextjs/react/python-data/backend-api/
-- mobile/devops/ml-training/generic) are dev-centric. Real-world SKILL.md
-- and CLAUDE.md files cover way more domains (marketing, design, finance,
-- science, gaming, video, etc.) and the classifier was forcing miscategorisations.
--
-- New 'other' bucket :
--   - Items appear in /marketplace normally (tier, boost, buy, etc. all work)
--   - NOT included in the bench engine (no task suite for it)
--   - NOT shown in /leaderboard rankable categories
--   - Submit form warns user that the item won't be ranked
--
-- Migration path : when a cluster of 'other' items emerges (e.g. 50 marketing
-- skills accumulate), author 5-10 marketing tasks, add 'marketing' to this
-- CHECK constraint, and reclassify the matching rows.

alter table skills drop constraint if exists skills_category_check;
alter table skills
  add constraint skills_category_check
  check (
    category = any (
      array['document','sql','data','web','shell','code','other']
    )
  );

alter table claude_md_files drop constraint if exists claude_md_files_project_category_check;
alter table claude_md_files
  add constraint claude_md_files_project_category_check
  check (
    project_category = any (
      array['nextjs','react','python-data','backend-api','mobile','devops','ml-training','generic','other']
    )
  );
