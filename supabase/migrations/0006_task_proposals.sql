-- 0006 — task proposals table.
--
-- Used by `scripts/generate-tasks.mjs`: Gemini Flash drafts realistic tasks
-- per category, they land here, a human promotes the good ones into `tasks`.
--
-- Status flow:
--   pending   — fresh from the LLM, awaiting review
--   approved  — promoted into `tasks` (writer keeps row for audit)
--   rejected  — explicitly skipped (with reason)
--
-- The `subject_kind` column distinguishes skill tasks from claude_md tasks
-- since the rubric for "evaluate a SKILL.md execution" differs from
-- "evaluate how a CLAUDE.md improves agent output".

create table if not exists task_proposals (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (subject_kind in ('skill', 'claude_md')),
  category text not null,
  title text not null,
  description text not null,
  input_data jsonb not null default '{}'::jsonb,
  expected_output_signal text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  source_model text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  promoted_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_task_proposals_kind_cat
  on task_proposals(subject_kind, category);
create index if not exists idx_task_proposals_status
  on task_proposals(status);

-- Public read so admin dashboards can list pending proposals; writes only via
-- service role (the generation script uses SUPABASE_SERVICE_ROLE_KEY).
alter table task_proposals enable row level security;

drop policy if exists "task_proposals_public_read" on task_proposals;
create policy "task_proposals_public_read" on task_proposals
  for select to anon, authenticated using (true);
