-- 0019 — quality_score for items that aren't bench-rankable.
--
-- For 'other' skills (no task suite) and ALL CLAUDE.md (too domain-specific
-- to bench task-based reliably), we ask a single LLM judge to rate the
-- content directly on writing quality / clarity / specificity / completeness
-- / structure. Cheaper than full bench (1 call vs N×3 calls), measures
-- "looks well-written" not "actually works on real tasks" — used as a
-- secondary signal where Elo is unavailable.
--
-- The UI surfaces quality_score in /leaderboard / MarketplaceCard when
-- the item has no avg_score (no bench), with a distinct badge so users
-- know it's a different methodology.

alter table skills
  add column if not exists quality_score numeric(5,2),
  add column if not exists quality_rationale text,
  add column if not exists quality_judged_at timestamptz,
  add column if not exists quality_judge_model text;

alter table claude_md_files
  add column if not exists quality_score numeric(5,2),
  add column if not exists quality_rationale text,
  add column if not exists quality_judged_at timestamptz,
  add column if not exists quality_judge_model text;

create index if not exists idx_skills_quality_score on skills(quality_score) where quality_score is not null;
create index if not exists idx_claude_md_quality_score on claude_md_files(quality_score) where quality_score is not null;
