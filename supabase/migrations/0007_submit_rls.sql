-- 0007 — INSERT policies so authenticated users can submit via the web app.
--
-- Public read was opened in 0005. Now we let signed-in users insert their own
-- skills and CLAUDE.md rows. They can update only their own rows, and they
-- can never bump verification_level or tier (admin only via service role).
--
-- The submit server actions sets author_user_id = auth.uid() explicitly. We
-- check it via a USING/WITH CHECK clause.

drop policy if exists "skills_authed_insert" on skills;
create policy "skills_authed_insert" on skills
  for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and tier = 'free'
    and verification_level <= 1
  );

drop policy if exists "skills_authed_update" on skills;
create policy "skills_authed_update" on skills
  for update to authenticated
  using (author_user_id = auth.uid())
  with check (
    author_user_id = auth.uid()
    and tier = 'free'
    -- authors can re-submit content updates but cannot bump trust by themselves
    and verification_level <= 1
  );

drop policy if exists "claude_md_authed_insert" on claude_md_files;
create policy "claude_md_authed_insert" on claude_md_files
  for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and tier = 'free'
    and verification_level <= 1
  );

drop policy if exists "claude_md_authed_update" on claude_md_files;
create policy "claude_md_authed_update" on claude_md_files
  for update to authenticated
  using (author_user_id = auth.uid())
  with check (
    author_user_id = auth.uid()
    and tier = 'free'
    and verification_level <= 1
  );
