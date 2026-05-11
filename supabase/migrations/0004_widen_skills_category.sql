-- 0004 — widen skills.category to match the scraper taxonomy.
--
-- 0001 hardcoded a single value (`pdf-extraction`) when the V0 was
-- pdf-only. The scraper emits the full set: document / sql / data / web /
-- shell / code. Drop the legacy constraint, reapply with the real list.

alter table skills drop constraint if exists skills_category_check;

alter table skills
  add constraint skills_category_check
  check (category in ('document', 'sql', 'data', 'web', 'shell', 'code'));
