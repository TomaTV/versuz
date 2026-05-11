-- 0020_content_hash.sql · 2026-05-11
-- Détecter les doublons de contenu : même fichier SKILL.md / CLAUDE.md
-- copié sur des repos différents (forks, templates, copy-paste).
--
-- On stocke un sha256 hex du contenu brut. Index non-unique (on n'empêche
-- pas l'insert, on l'expose à l'admin via une query group by).
--
-- Backfill : compute pour toutes les rows existantes via pgcrypto.

create extension if not exists pgcrypto;

alter table skills add column if not exists content_hash text;
alter table claude_md_files add column if not exists content_hash text;

update skills
  set content_hash = encode(digest(skill_md_content, 'sha256'), 'hex')
  where skill_md_content is not null and content_hash is null;

update claude_md_files
  set content_hash = encode(digest(content, 'sha256'), 'hex')
  where content is not null and content_hash is null;

create index if not exists idx_skills_content_hash
  on skills(content_hash) where content_hash is not null;
create index if not exists idx_claude_md_content_hash
  on claude_md_files(content_hash) where content_hash is not null;
