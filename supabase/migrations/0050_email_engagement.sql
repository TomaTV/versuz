-- 0050_email_engagement.sql — tracks email send state per profile.
--
-- email_welcomed_at  : set after first successful welcome email send.
--                      Prevents re-sending on every login. NULL = never sent.
-- last_active_at     : updated on each page view (via a cheap server action)
--                      so the re-engagement cron can identify dormant users.
-- reengage_sent_at   : set when re-engagement email is sent, so we don't
--                      bug the user every cron run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_welcomed_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reengage_sent_at timestamptz;

-- Index for the re-engagement cron : find profiles inactive > 30 days that
-- haven't been re-engaged yet (or were re-engaged > 90 days ago).
CREATE INDEX IF NOT EXISTS profiles_reengage_idx
  ON profiles (last_active_at)
  WHERE last_active_at IS NOT NULL;
