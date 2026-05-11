-- 0012 — widen judge_model CHECK to accept OpenRouter-prefixed model IDs
-- (`anthropic/claude-haiku-4-5`, `deepseek/deepseek-chat`, `openai/gpt-5-mini`,
-- `openai/gpt-5-nano`) used by `or-v1` and `or-thrift` bench modes.
-- See src/lib/judges.js (or-v1 / or-thrift presets).

alter table judge_scores drop constraint if exists judge_scores_judge_model_check;
alter table judge_scores
  add constraint judge_scores_judge_model_check
  check (judge_model in (
    -- gold (paid)
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    -- prod (mixed)
    'claude-opus-4-7-20251001',
    -- dev — Groq trio
    'llama-3.3-70b-versatile',
    'llama-3-3-70b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    -- legacy / fallback
    'gemini-2.5-flash', 'gemini-flash',
    'mistral-large-latest', 'mistral-large',
    'deepseek-chat', 'deepseek-reasoner',
    'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
    'gemini-2.5-flash-lite', 'gemini-flash-lite',
    'gpt-5-mini', 'gpt-5-nano',
    -- OpenRouter-prefixed (or-v1, or-thrift)
    'anthropic/claude-haiku-4-5',
    'deepseek/deepseek-chat',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano'
  ));

alter table judge_batches drop constraint if exists judge_batches_judge_model_check;
alter table judge_batches
  add constraint judge_batches_judge_model_check
  check (judge_model in (
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    'claude-opus-4-7-20251001',
    'llama-3.3-70b-versatile',
    'llama-3-3-70b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'gemini-2.5-flash', 'gemini-flash',
    'mistral-large-latest', 'mistral-large',
    'deepseek-chat', 'deepseek-reasoner',
    'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
    'gemini-2.5-flash-lite', 'gemini-flash-lite',
    'gpt-5-mini', 'gpt-5-nano',
    'anthropic/claude-haiku-4-5',
    'deepseek/deepseek-chat',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano'
  ));

alter table scores drop constraint if exists scores_judge_model_check;
alter table scores
  add constraint scores_judge_model_check
  check (judge_model in (
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro',
    'claude-opus-4-7-20251001',
    'llama-3.3-70b-versatile',
    'llama-3-3-70b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'gemini-2.5-flash', 'gemini-flash',
    'mistral-large-latest', 'mistral-large',
    'deepseek-chat', 'deepseek-reasoner',
    'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
    'gemini-2.5-flash-lite', 'gemini-flash-lite',
    'gpt-5-mini', 'gpt-5-nano',
    'anthropic/claude-haiku-4-5',
    'deepseek/deepseek-chat',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano'
  ));
