-- 0052 — Gamification : achievements + rank_history + streak columns
--
-- Three new surfaces :
--   1. Streak tracking on skills/claude_md (top_rank_streak_days + category)
--   2. item_achievements ledger (Triple Crown, streak milestones, etc.)
--   3. author_achievements ledger (tier progression)
--   4. rank_history (snapshot per cycle × subject × category)
--
-- Hooked from scripts/bench/post-cycle-hooks.mjs after each cycle completes.
-- All tables public-read (no PII), writes are admin-only (service role).

-- ============================================================
-- Streak columns
-- ============================================================
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS top_rank_streak_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_rank_streak_category TEXT,
  ADD COLUMN IF NOT EXISTS top_rank_streak_started_at TIMESTAMPTZ;

ALTER TABLE public.claude_md_files
  ADD COLUMN IF NOT EXISTS top_rank_streak_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_rank_streak_category TEXT,
  ADD COLUMN IF NOT EXISTS top_rank_streak_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS skills_streak_idx
  ON public.skills(top_rank_streak_days DESC)
  WHERE top_rank_streak_days > 0;

CREATE INDEX IF NOT EXISTS claude_md_streak_idx
  ON public.claude_md_files(top_rank_streak_days DESC)
  WHERE top_rank_streak_days > 0;

-- ============================================================
-- item_achievements — unified ledger for skill + claude_md
-- ============================================================
CREATE TABLE IF NOT EXISTS public.item_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('skill', 'claude_md')),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  claude_md_id UUID REFERENCES public.claude_md_files(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'triple_crown',     -- 3 judges agree on #1 in same category, same cycle
    'streak_milestone', -- streak hit 7 / 30 / 100 days (see metadata.days)
    'category_winner',  -- first time #1 in a category (one per category per item)
    'first_blood'       -- first cycle as ranked (one per item lifetime)
  )),
  category TEXT,
  cycle_id INT REFERENCES public.cycles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Subject FK XOR : exactly one of (skill_id, claude_md_id) must be set,
  -- and it must match subject_kind.
  CONSTRAINT item_achievements_subject_xor CHECK (
    (subject_kind = 'skill'     AND skill_id IS NOT NULL AND claude_md_id IS NULL)
 OR (subject_kind = 'claude_md' AND claude_md_id IS NOT NULL AND skill_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS item_achievements_skill_idx
  ON public.item_achievements(skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS item_achievements_claude_md_idx
  ON public.item_achievements(claude_md_id) WHERE claude_md_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS item_achievements_cycle_idx
  ON public.item_achievements(cycle_id);
CREATE INDEX IF NOT EXISTS item_achievements_type_idx
  ON public.item_achievements(type);

-- Idempotency for one-shot achievements (Triple Crown is per cycle, but
-- category_winner / first_blood are per (item, category) and per (item)
-- respectively). Partial unique indexes prevent dup inserts.
CREATE UNIQUE INDEX IF NOT EXISTS item_achievements_first_blood_uniq
  ON public.item_achievements(COALESCE(skill_id, claude_md_id))
  WHERE type = 'first_blood';

CREATE UNIQUE INDEX IF NOT EXISTS item_achievements_cat_winner_uniq
  ON public.item_achievements(COALESCE(skill_id, claude_md_id), category)
  WHERE type = 'category_winner';

CREATE UNIQUE INDEX IF NOT EXISTS item_achievements_triple_crown_uniq
  ON public.item_achievements(COALESCE(skill_id, claude_md_id), cycle_id, category)
  WHERE type = 'triple_crown';

-- ============================================================
-- author_achievements — tier progression (Newcomer → Veteran)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.author_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_login TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('newcomer', 'challenger', 'contender', 'champion', 'veteran')),
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  UNIQUE (github_login, tier)
);

CREATE INDEX IF NOT EXISTS author_achievements_login_idx
  ON public.author_achievements(github_login);

-- ============================================================
-- rank_history — per-cycle snapshot for delta computation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rank_history (
  id BIGSERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('skill', 'claude_md')),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  claude_md_id UUID REFERENCES public.claude_md_files(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rank INT NOT NULL,
  elo NUMERIC,
  snapshot_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT rank_history_subject_xor CHECK (
    (subject_kind = 'skill'     AND skill_id IS NOT NULL AND claude_md_id IS NULL)
 OR (subject_kind = 'claude_md' AND claude_md_id IS NOT NULL AND skill_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS rank_history_cycle_idx
  ON public.rank_history(cycle_id);
CREATE INDEX IF NOT EXISTS rank_history_skill_idx
  ON public.rank_history(skill_id, category, cycle_id DESC) WHERE skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rank_history_claude_md_idx
  ON public.rank_history(claude_md_id, category, cycle_id DESC) WHERE claude_md_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rank_history_category_cycle_idx
  ON public.rank_history(category, cycle_id DESC);

-- A subject can only have one rank per (cycle, category)
CREATE UNIQUE INDEX IF NOT EXISTS rank_history_unique_per_cycle
  ON public.rank_history(COALESCE(skill_id, claude_md_id), category, cycle_id);

-- ============================================================
-- RLS — public read everywhere; writes via service role only
-- ============================================================
ALTER TABLE public.item_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read item_achievements" ON public.item_achievements;
DROP POLICY IF EXISTS "Public read author_achievements" ON public.author_achievements;
DROP POLICY IF EXISTS "Public read rank_history" ON public.rank_history;

CREATE POLICY "Public read item_achievements"
  ON public.item_achievements FOR SELECT
  USING (true);

CREATE POLICY "Public read author_achievements"
  ON public.author_achievements FOR SELECT
  USING (true);

CREATE POLICY "Public read rank_history"
  ON public.rank_history FOR SELECT
  USING (true);
