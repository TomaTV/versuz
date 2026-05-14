-- 0045 — Widen `category` CHECK constraint with 5 new broader buckets
-- (writing, design, marketing, automation, research). These were added
-- to the classifier in V1.5+ to catch the long-tail of "other" items
-- that lost their body signal post-Storage-migration.
--
-- Without widening the CHECK, reclassify-all + future scrapes that pick
-- one of the new buckets will fail with `violates check constraint`.

ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_category_check;
ALTER TABLE skills
  ADD CONSTRAINT skills_category_check CHECK (category IN (
    -- V0/V1 canonical buckets
    'document', 'sql', 'data', 'web', 'shell', 'code', 'other',
    -- V1.5 agent-specific buckets (from migration 0040)
    'claude-skill', 'codex', 'cursor-rule', 'windsurf-rule',
    'antigravity', 'mcp-server', 'continue-rule', 'roo-code', 'cline',
    -- V1.5+ broader content buckets (new in 0045)
    'writing', 'design', 'marketing', 'automation', 'research'
  ));

ALTER TABLE claude_md_files DROP CONSTRAINT IF EXISTS claude_md_files_project_category_check;
ALTER TABLE claude_md_files
  ADD CONSTRAINT claude_md_files_project_category_check CHECK (project_category IN (
    -- V0/V1
    'nextjs', 'react', 'python-data', 'backend-api', 'mobile', 'devops',
    'ml-training', 'generic', 'other',
    -- V1.5 agent-specific
    'claude-skill', 'codex', 'cursor-rule', 'windsurf-rule',
    'antigravity', 'mcp-server', 'continue-rule', 'roo-code', 'cline',
    -- V1.5+ broader
    'writing', 'design', 'marketing', 'automation', 'research'
  ));
