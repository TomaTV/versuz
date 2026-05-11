-- 0008 — drop UNIQUE on skills.github_url.
--
-- 0001 made `github_url` UNIQUE, assuming one SKILL.md per repo. In practice
-- many repos host *several* SKILL.md at different paths (e.g.
-- anthropic/skills hosts dozens). Same `repoMeta.html_url` → conflict.
--
-- A skill's identity is its `slug` (already UNIQUE). We keep an index on
-- github_url for dedup queries / lookups, just not the uniqueness.

alter table skills drop constraint if exists skills_github_url_key;

create index if not exists idx_skills_github_url on skills(github_url);
