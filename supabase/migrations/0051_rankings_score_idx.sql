-- Composite index on rankings to accelerate landing page queries.
-- Used by enrichWithBenchScores() and getLeaderboardCategories() which
-- filter on subject_kind + avg_score IS NOT NULL during ISR regeneration.
CREATE INDEX IF NOT EXISTS idx_rankings_kind_score
  ON rankings (subject_kind, avg_score DESC NULLS LAST)
  WHERE avg_score IS NOT NULL;
