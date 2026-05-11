-- 0002 — CLAUDE.md as first-class entity + benchmark engine schema.
--
-- Two big additions:
--
--   1. CLAUDE.md leaderboard tables (mirror skills tables, separate ranking).
--   2. Benchmark engine tables built for scale:
--        - cycles + task_sets   (24h ticks, held-out splits)
--        - run_jobs              (one row per skill×task to do)
--        - run_outputs           (deduplicated by output hash)
--        - judge_scores          (one row per output×judge)
--        - judge_batches         (Anthropic Message Batches tracking)
--
-- Design notes:
--
-- * Output dedup: same skill, same task, same prompt → same hash → same
--   row. We never re-run the agent if we already have a fresh output.
-- * Judge dedup: same output × same judge → same row. We never re-judge.
-- * Cycles let us recompute Elo deltas per tick without rewriting history.
-- * `status` enums use CHECK constraints (not Postgres enums) so we can
--   evolve the state machine with a plain ALTER instead of a migration dance.

------------------------------------------------------------------------------
-- A · CLAUDE.md leaderboard
------------------------------------------------------------------------------

create table if not exists claude_md_files (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  github_url text unique not null,
  github_stars integer default 0,
  description text,
  -- project-type category (different taxonomy from skills)
  project_category text not null check (project_category in (
    'nextjs', 'react', 'python-data', 'backend-api', 'mobile', 'devops',
    'ml-training', 'generic'
  )),
  scraped_at timestamptz not null default now(),
  content text not null default '',
  word_count integer generated always as (
    array_length(regexp_split_to_array(content, '\s+'), 1)
  ) stored,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_claude_md_category on claude_md_files(project_category);

------------------------------------------------------------------------------
-- B · Cycles + task sets
------------------------------------------------------------------------------

create table if not exists cycles (
  id serial primary key,
  -- which leaderboard this cycle belongs to ("skills.<cat>" or "claude-md.<cat>")
  scope text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_cycles_scope_status on cycles(scope, status);

-- A task_set is the held-out 30-task split for a given cycle.
create table if not exists task_sets (
  id uuid primary key default gen_random_uuid(),
  cycle_id integer references cycles(id) on delete cascade,
  task_ids uuid[] not null,
  drawn_at timestamptz default now()
);

------------------------------------------------------------------------------
-- C · Run jobs (skill × task)
------------------------------------------------------------------------------

create table if not exists run_outputs (
  id uuid primary key default gen_random_uuid(),
  -- sha256(skill_md_or_claude_md_content || task_input). Same input ⇒ same hash.
  -- Hex string for portability.
  output_hash text unique not null,
  output jsonb not null,
  cost_usd numeric(10, 6),
  duration_ms integer,
  model_used text,
  created_at timestamptz default now()
);

create table if not exists run_jobs (
  id uuid primary key default gen_random_uuid(),
  cycle_id integer references cycles(id) on delete cascade,
  -- exactly one of skill_id / claude_md_id is set — discriminator on `subject_kind`
  subject_kind text not null check (subject_kind in ('skill', 'claude_md')),
  skill_id uuid references skills(id) on delete cascade,
  claude_md_id uuid references claude_md_files(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'error', 'timeout', 'cached')),
  output_id uuid references run_outputs(id) on delete set null,
  attempts integer default 0,
  error_message text,
  queued_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  -- one row per (cycle, subject, task)
  unique(cycle_id, skill_id, task_id),
  unique(cycle_id, claude_md_id, task_id),
  -- exactly one of skill_id / claude_md_id non-null
  constraint exactly_one_subject check (
    (skill_id is not null and claude_md_id is null and subject_kind = 'skill') or
    (skill_id is null and claude_md_id is not null and subject_kind = 'claude_md')
  )
);

create index if not exists idx_run_jobs_cycle_status on run_jobs(cycle_id, status);
create index if not exists idx_run_jobs_status_queued on run_jobs(status, queued_at)
  where status = 'queued';
create index if not exists idx_run_jobs_subject_skill on run_jobs(skill_id) where skill_id is not null;
create index if not exists idx_run_jobs_subject_claude_md on run_jobs(claude_md_id) where claude_md_id is not null;

------------------------------------------------------------------------------
-- D · Judge scores
------------------------------------------------------------------------------

create table if not exists judge_batches (
  -- mirrors Anthropic Message Batch IDs for crash-resilient resume
  id text primary key,
  status text not null default 'submitted'
    check (status in ('submitted', 'processing', 'completed', 'expired', 'cancelled')),
  judge_model text not null check (judge_model in ('claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro')),
  size integer not null,
  submitted_at timestamptz default now(),
  completed_at timestamptz,
  cost_usd numeric(10, 6),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists judge_scores (
  id uuid primary key default gen_random_uuid(),
  -- score is anchored to the OUTPUT (not the run_job) — same output text gets
  -- judged exactly once per judge model, ever.
  output_id uuid references run_outputs(id) on delete cascade not null,
  judge_model text not null check (judge_model in ('claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro')),
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  rationale text,
  batch_id text references judge_batches(id),
  cost_usd numeric(10, 6),
  created_at timestamptz default now(),
  unique(output_id, judge_model)
);

create index if not exists idx_judge_scores_output on judge_scores(output_id);

------------------------------------------------------------------------------
-- E · Aggregated rankings — unified materialized view (skills + claude_md)
------------------------------------------------------------------------------

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
  count(distinct rj.id) as task_count,
  count(distinct rj.id) filter (where rj.status = 'completed') as successful_tasks,
  avg(ws.avg_score) as avg_score
from run_jobs rj
left join skills s on s.id = rj.skill_id
left join claude_md_files c on c.id = rj.claude_md_id
left join weighted_scores ws on ws.run_job_id = rj.id
group by rj.subject_kind, rj.skill_id, rj.claude_md_id,
         s.slug, s.name, s.category,
         c.slug, c.project_category;

create unique index if not exists idx_rankings_subject
  on rankings(subject_kind, coalesce(skill_id, claude_md_id), category);

create index if not exists idx_rankings_score on rankings(category, avg_score desc);

-- helper: refresh as a function so the bench engine can call rpc('refresh_rankings')
create or replace function refresh_rankings() returns void
language plpgsql as $$
begin
  refresh materialized view concurrently rankings;
end $$;

------------------------------------------------------------------------------
-- F · Worker queue RPC
------------------------------------------------------------------------------

-- claim N pending run_jobs in a cycle. FOR UPDATE SKIP LOCKED lets N workers
-- pull jobs concurrently without coordination. cycles.id is serial → integer.
create or replace function claim_run_jobs(p_cycle_id integer, p_limit int)
returns setof run_jobs
language sql as $$
  update run_jobs
  set status = 'running', started_at = now(), attempts = attempts + 1
  where id in (
    select id from run_jobs
    where cycle_id = p_cycle_id and status = 'queued'
    order by queued_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;
