-- 0005 — public read access for marketplace tables.
--
-- New Supabase projects have RLS enabled by default. Without policies, anon
-- key sees zero rows even though the data is there. The marketplace needs to
-- list scraped public SKILL.md / CLAUDE.md to anyone, signed in or not.
--
-- Writes stay locked down (no insert/update policies here). Submissions will
-- get their own policies in a future migration once the submit flow is real.

alter table skills enable row level security;
alter table claude_md_files enable row level security;

drop policy if exists "skills_public_read" on skills;
create policy "skills_public_read" on skills
  for select to anon, authenticated
  using (true);

drop policy if exists "claude_md_public_read" on claude_md_files;
create policy "claude_md_public_read" on claude_md_files
  for select to anon, authenticated
  using (true);

-- Tasks are also fine to expose (read-only): part of the public methodology.
alter table tasks enable row level security;

drop policy if exists "tasks_public_read" on tasks;
create policy "tasks_public_read" on tasks
  for select to anon, authenticated
  using (true);
