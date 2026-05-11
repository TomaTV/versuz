-- Versuz V0 schema. See CONTEXT.md for design notes.

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  github_url text unique not null,
  github_stars integer default 0,
  description text,
  category text not null check (category in ('pdf-extraction')),
  scraped_at timestamptz not null default now(),
  skill_md_content text not null default '',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_skills_category on skills(category);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  slug text unique not null,
  title text not null,
  description text not null,
  input_data jsonb not null,
  expected_output jsonb,
  rubric jsonb not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard'))
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) not null,
  task_id uuid references tasks(id) not null,
  output jsonb not null,
  cost_usd numeric(10, 6),
  duration_ms integer,
  status text not null check (status in ('success', 'error', 'timeout')),
  error_message text,
  created_at timestamptz not null default now(),
  unique(skill_id, task_id)
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id) on delete cascade not null,
  judge_model text not null check (judge_model in ('claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro')),
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  rationale text,
  created_at timestamptz not null default now(),
  unique(run_id, judge_model)
);

create materialized view if not exists rankings as
select
  s.id as skill_id,
  s.slug,
  s.name,
  s.github_url,
  t.category,
  avg(sc.score) as avg_score,
  count(distinct r.id) as task_count,
  count(distinct r.id) filter (where r.status = 'success') as successful_tasks
from skills s
join runs r on r.skill_id = s.id
join scores sc on sc.run_id = r.id
join tasks t on t.id = r.task_id
group by s.id, s.slug, s.name, s.github_url, t.category;

create unique index if not exists idx_rankings_skill_category on rankings(skill_id, category);
