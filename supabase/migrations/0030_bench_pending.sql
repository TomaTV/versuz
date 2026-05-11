-- 0030_bench_pending.sql — flag for new submits to be prioritized in the next bench cycle.
-- Set to true when a user submits via /submit or the CLI, cleared once the
-- item is benched (judge_scores rows exist).
-- full.mjs / loadSubjects ORDER BY bench_pending DESC, github_stars DESC.

ALTER TABLE skills ADD COLUMN IF NOT EXISTS bench_pending boolean NOT NULL DEFAULT false;
ALTER TABLE claude_md_files ADD COLUMN IF NOT EXISTS bench_pending boolean NOT NULL DEFAULT false;

-- Partial indexes — only index rows where bench_pending=true. Tiny size,
-- fast scan for the prioritization query.
CREATE INDEX IF NOT EXISTS skills_bench_pending_idx ON skills (bench_pending) WHERE bench_pending = true;
CREATE INDEX IF NOT EXISTS claude_md_files_bench_pending_idx ON claude_md_files (bench_pending) WHERE bench_pending = true;
