-- 0027_axes_rpc.sql — RPCs for axes aggregation (per-subject + per-judge).
-- Replaces 2-step JS queries that were silently dropping joins in production.

CREATE OR REPLACE FUNCTION axes_by_subject(p_kind text)
RETURNS TABLE (
  subject_id uuid,
  correctness numeric,
  format_ numeric,
  completeness numeric,
  usefulness numeric,
  depth numeric,
  axes_count int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN p_kind = 'skill' THEN rj.skill_id ELSE rj.claude_md_id END AS subject_id,
    AVG((js.axes->>'correctness')::numeric) AS correctness,
    AVG((js.axes->>'format')::numeric) AS format_,
    AVG((js.axes->>'completeness')::numeric) AS completeness,
    AVG((js.axes->>'usefulness')::numeric) AS usefulness,
    AVG((js.axes->>'depth')::numeric) AS depth,
    COUNT(js.id)::int AS axes_count
  FROM run_jobs rj
  JOIN judge_scores js ON js.output_id = rj.output_id
  WHERE rj.subject_kind = p_kind
    AND rj.output_id IS NOT NULL
    AND js.axes IS NOT NULL
  GROUP BY 1;
$$;

CREATE OR REPLACE FUNCTION judge_disagreement(p_kind text, p_subject_id uuid)
RETURNS TABLE (
  judge_model text,
  score_count int,
  avg_score numeric,
  axes jsonb,
  sample_rationale text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH outputs AS (
    SELECT output_id FROM run_jobs
    WHERE subject_kind = p_kind
      AND output_id IS NOT NULL
      AND ( (p_kind = 'skill' AND skill_id = p_subject_id)
         OR (p_kind = 'claude_md' AND claude_md_id = p_subject_id) )
  )
  SELECT
    js.judge_model,
    COUNT(*)::int AS score_count,
    AVG(js.score)::numeric AS avg_score,
    jsonb_build_object(
      'correctness', AVG((js.axes->>'correctness')::numeric),
      'format', AVG((js.axes->>'format')::numeric),
      'completeness', AVG((js.axes->>'completeness')::numeric),
      'usefulness', AVG((js.axes->>'usefulness')::numeric),
      'depth', AVG((js.axes->>'depth')::numeric)
    ) AS axes,
    (array_agg(js.rationale ORDER BY js.id) FILTER (WHERE js.rationale IS NOT NULL))[1] AS sample_rationale
  FROM judge_scores js
  JOIN outputs o ON o.output_id = js.output_id
  GROUP BY js.judge_model;
$$;

GRANT EXECUTE ON FUNCTION axes_by_subject(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION judge_disagreement(text, uuid) TO anon, authenticated, service_role;
