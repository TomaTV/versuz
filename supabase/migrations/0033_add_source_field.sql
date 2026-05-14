-- 0033 — Add source field to skills and claude_md_files tables
--
-- This migration adds a 'source' column to track where each entry was scraped from:
-- - 'github' (default for existing data)
-- - 'sourcegraph' 
-- - 'searchcode'
-- - 'gitlab'
-- - 'manual'
--
-- This enables filtering and creating different views in the marketplace
-- based on the source of the content.

-- Add source column to skills table
alter table skills 
add column if not exists source text not null default 'github'
check (source in ('github', 'sourcegraph', 'searchcode', 'gitlab', 'manual'));

-- Add source column to claude_md_files table  
alter table claude_md_files
add column if not exists source text not null default 'github'
check (source in ('github', 'sourcegraph', 'searchcode', 'gitlab', 'manual'));

-- Create indexes for efficient filtering by source
create index if not exists idx_skills_source on skills(source);
create index if not exists idx_claude_md_files_source on claude_md_files(source);

-- Update existing records to have source='github' explicitly
-- (they should already have this as default, but this ensures consistency)
update skills set source = 'github' where source is null;
update claude_md_files set source = 'github' where source is null;

-- Update the rankings materialized view to include source
drop materialized view if exists rankings;

create materialized view rankings as
with weighted_scores as (
  select
    j.id as run_job_id,
    avg(s.score) as avg_score,
    count(distinct s.judge_model) as judge_count
  from judge_scores s
  join run_jobs j on j.output_id = s.output_id
  group by j.id
)
select
  -- discriminator
  rj.subject_kind,
  rj.skill_id,
  rj.claude_md_id,
  -- denormalised slug + name for query convenience
  coalesce(s.slug, c.slug) as subject_slug,
  coalesce(s.name, c.slug) as subject_name,
  -- category: skills use `skills.category`, claude_md use `project_category`
  coalesce(s.category, c.project_category) as category,
  -- source information
  coalesce(s.source, c.source) as source,
  count(distinct rj.id) as task_count,
  count(distinct rj.id) filter (where rj.status = 'completed') as successful_tasks,
  avg(ws.avg_score) as avg_score
from run_jobs rj
left join skills s on s.id = rj.skill_id
left join claude_md_files c on c.id = rj.claude_md_id
left join weighted_scores ws on ws.run_job_id = rj.id
group by rj.subject_kind, rj.skill_id, rj.claude_md_id,
         s.slug, s.name, s.category, s.source,
         c.slug, c.project_category, c.source;

create unique index if not exists idx_rankings_subject
  on rankings(subject_kind, coalesce(skill_id, claude_md_id), category);

create index if not exists idx_rankings_score on rankings(category, avg_score desc);
create index if not exists idx_rankings_source on rankings(source, category, avg_score desc);

-- Helper function to refresh rankings
create or replace function refresh_rankings() returns void
language plpgsql as $$
begin
  refresh materialized view concurrently rankings;
end $$;
