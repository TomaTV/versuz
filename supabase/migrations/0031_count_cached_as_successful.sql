-- 0031_count_cached_as_successful.sql
-- Rankings matview now counts BOTH 'completed' and 'cached' run_jobs as
-- successful_tasks. A cached job IS a successful evaluation — it just reused
-- a previous output. The score is still computed from all 6 task pairs, so
-- the display "3/6 Tasks" was misleading when half were cached. Now reads
-- "6/6 Tasks" once everything has been judged.

DROP MATERIALIZED VIEW IF EXISTS rankings CASCADE;

CREATE MATERIALIZED VIEW rankings AS
WITH weighted_scores AS (
  SELECT j.id AS run_job_id,
    ROUND(avg(s_1.score)::numeric, 2) AS avg_score,
    count(DISTINCT s_1.judge_model) AS judge_count
  FROM judge_scores s_1
  JOIN run_jobs j ON j.output_id = s_1.output_id
  GROUP BY j.id
)
SELECT rj.subject_kind,
  rj.skill_id,
  rj.claude_md_id,
  COALESCE(s.slug, c.slug) AS subject_slug,
  COALESCE(s.name, c.slug) AS subject_name,
  COALESCE(s.category, c.project_category) AS category,
  count(DISTINCT rj.id) AS task_count,
  count(DISTINCT rj.id) FILTER (WHERE rj.status IN ('completed', 'cached')) AS successful_tasks,
  ROUND(avg(ws.avg_score)::numeric, 2) AS avg_score
FROM run_jobs rj
LEFT JOIN skills s ON s.id = rj.skill_id
LEFT JOIN claude_md_files c ON c.id = rj.claude_md_id
LEFT JOIN weighted_scores ws ON ws.run_job_id = rj.id
GROUP BY rj.subject_kind, rj.skill_id, rj.claude_md_id, s.slug, s.name, s.category, c.slug, c.project_category;

GRANT SELECT ON rankings TO anon, authenticated, service_role;
CREATE UNIQUE INDEX rankings_pk ON public.rankings (subject_kind, COALESCE(skill_id, claude_md_id));
