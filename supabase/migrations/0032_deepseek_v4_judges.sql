-- 0032_deepseek_v4_judges.sql
-- Add DeepSeek V4 Flash and V4 Pro to the judge_scores whitelist.
-- V4 has prompt cache support on OpenRouter (cache_read $0.0028/M vs $0.32/M
-- full price = 99% savings), unlike V3 chat which only routes through
-- DeepInfra (no cache).

ALTER TABLE judge_scores DROP CONSTRAINT IF EXISTS judge_scores_judge_model_check;

ALTER TABLE judge_scores ADD CONSTRAINT judge_scores_judge_model_check CHECK (
  judge_model = ANY (ARRAY[
    'claude-opus-4-7', 'gpt-5', 'gemini-2-5-pro', 'claude-opus-4-7-20251001',
    'llama-3.3-70b-versatile', 'llama-3-3-70b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'gemini-2.5-flash', 'gemini-flash', 'mistral-large-latest', 'mistral-large',
    'deepseek-chat', 'deepseek-reasoner',
    'claude-haiku-4-5-20251001', 'claude-haiku-4-5',
    'claude-sonnet-4-6-20251001', 'claude-sonnet-4-6',
    'gemini-2.5-flash-lite', 'gemini-flash-lite',
    'gpt-5-mini', 'gpt-5-nano',
    'anthropic/claude-haiku-4-5', 'anthropic/claude-sonnet-4-6', 'anthropic/claude-opus-4-7',
    'deepseek/deepseek-chat', 'deepseek/deepseek-v4-flash', 'deepseek/deepseek-v4-pro',
    'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/gpt-5',
    'google/gemini-2.5-pro', 'google/gemini-2.5-flash'
  ]::text[])
);
