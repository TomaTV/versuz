-- 0055 — Unique index on `rankings` matview for CONCURRENT refresh
--
-- Why : `refresh_rankings()` calls `REFRESH MATERIALIZED VIEW CONCURRENTLY
-- rankings`, but the matview had no unique index → every refresh failed
-- silently with "cannot refresh materialized view concurrently". Result :
-- the funnel on /admin/cycles displayed stale counts (claude_md 0 / 14
-- skills) even though judge_scores were piling up in the underlying tables.
--
-- The matview groups by (subject_kind, skill_id, claude_md_id). Per row,
-- exactly one of skill_id / claude_md_id is non-NULL. Default Postgres
-- NULL-as-distinct semantics means the composite unique index is satisfied
-- in practice : no two rows share (kind, skill_id, claude_md_id).

CREATE UNIQUE INDEX IF NOT EXISTS rankings_unique_subject
  ON rankings (subject_kind, skill_id, claude_md_id);
