-- 0028_round_rankings.sql — round avg_score in rankings matview to 2 decimals
-- so Supabase + UI don't have 48.11111111111111... noise. Also drops the
-- CONCURRENTLY clause from refresh_rankings since the matview uses an
-- expression-based unique index (COALESCE) that Postgres refuses to use
-- for concurrent refresh.

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
  count(DISTINCT rj.id) FILTER (WHERE rj.status = 'completed'::text) AS successful_tasks,
  ROUND(avg(ws.avg_score)::numeric, 2) AS avg_score
FROM run_jobs rj
LEFT JOIN skills s ON s.id = rj.skill_id
LEFT JOIN claude_md_files c ON c.id = rj.claude_md_id
LEFT JOIN weighted_scores ws ON ws.run_job_id = rj.id
GROUP BY rj.subject_kind, rj.skill_id, rj.claude_md_id, s.slug, s.name, s.category, c.slug, c.project_category;

GRANT SELECT ON rankings TO anon, authenticated, service_role;

CREATE UNIQUE INDEX rankings_pk ON public.rankings (subject_kind, COALESCE(skill_id, claude_md_id));

CREATE OR REPLACE FUNCTION refresh_rankings() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW rankings;
END;
$$;
