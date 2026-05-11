-- 0029_rubric_v4_axes.sql — switch axes JSONB schema to rubric v4.
-- Old keys : correctness / format / completeness / usefulness / depth
-- New keys : instruction_following / correctness / completeness / usefulness / safety
-- Weights  : 0.35 / 0.30 / 0.20 / 0.10 / 0.05
-- Aligned with FLASK + JudgeBench + HELM. See docs/bench-rubric.md (TBD).

DROP FUNCTION IF EXISTS axes_by_subject(text);
DROP FUNCTION IF EXISTS judge_disagreement(text, uuid);

-- Wipe stale axes objects — they use old keys and would map to NULL on read.
-- The bench engine will repopulate them on next run.
UPDATE judge_scores SET axes = NULL WHERE axes IS NOT NULL;

CREATE FUNCTION axes_by_subject(p_kind text)
RETURNS TABLE (
  subject_id uuid,
  instruction_following numeric,
  correctness numeric,
  completeness numeric,
  usefulness numeric,
  safety numeric,
  axes_count int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN p_kind = 'skill' THEN rj.skill_id ELSE rj.claude_md_id END AS subject_id,
    AVG((js.axes->>'instruction_following')::numeric),
    AVG((js.axes->>'correctness')::numeric),
    AVG((js.axes->>'completeness')::numeric),
    AVG((js.axes->>'usefulness')::numeric),
    AVG((js.axes->>'safety')::numeric),
    COUNT(js.id)::int
  FROM run_jobs rj
  JOIN judge_scores js ON js.output_id = rj.output_id
  WHERE rj.subject_kind = p_kind
    AND rj.output_id IS NOT NULL
    AND js.axes IS NOT NULL
  GROUP BY 1;
$$;

CREATE FUNCTION judge_disagreement(p_kind text, p_subject_id uuid)
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
    COUNT(*)::int,
    AVG(js.score)::numeric,
    jsonb_build_object(
      'instruction_following', AVG((js.axes->>'instruction_following')::numeric),
      'correctness', AVG((js.axes->>'correctness')::numeric),
      'completeness', AVG((js.axes->>'completeness')::numeric),
      'usefulness', AVG((js.axes->>'usefulness')::numeric),
      'safety', AVG((js.axes->>'safety')::numeric)
    ),
    (array_agg(js.rationale ORDER BY js.id) FILTER (WHERE js.rationale IS NOT NULL))[1]
  FROM judge_scores js
  JOIN outputs o ON o.output_id = js.output_id
  GROUP BY js.judge_model;
$$;

GRANT EXECUTE ON FUNCTION axes_by_subject(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION judge_disagreement(text, uuid) TO anon, authenticated, service_role;
