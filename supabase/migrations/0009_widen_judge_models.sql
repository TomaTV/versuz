-- 0009 — widen judge_model CHECK to allow dev-mode (free) judges.
--
-- 0002 hardcoded judge_model to ('claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro')
-- which matches `gold` mode only. dev/prod modes use other models. We widen
-- to text + a permissive set so the bench engine can run in any mode.

alter table judge_scores drop constraint if exists judge_scores_judge_model_check;
alter table judge_scores
  add constraint judge_scores_judge_model_check
  check (judge_model in (
    -- gold (paid)
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    -- prod (mixed)
    'claude-opus-4-7-20251001',
    -- dev (free)
    'gemini-2.5-flash', 'gemini-flash', 'llama-3.3-70b-versatile', 'llama-3-3-70b',
    'mistral-large-latest', 'mistral-large'
  ));

alter table judge_batches drop constraint if exists judge_batches_judge_model_check;
alter table judge_batches
  add constraint judge_batches_judge_model_check
  check (judge_model in (
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    'claude-opus-4-7-20251001',
    'gemini-2.5-flash', 'gemini-flash', 'llama-3.3-70b-versatile', 'llama-3-3-70b',
    'mistral-large-latest', 'mistral-large'
  ));

-- Old 0001 `scores` table (legacy) — also widen.
alter table scores drop constraint if exists scores_judge_model_check;
alter table scores
  add constraint scores_judge_model_check
  check (judge_model in (
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    'claude-opus-4-7-20251001',
    'gemini-2.5-flash', 'gemini-flash', 'llama-3.3-70b-versatile', 'llama-3-3-70b',
    'mistral-large-latest', 'mistral-large'
  ));
