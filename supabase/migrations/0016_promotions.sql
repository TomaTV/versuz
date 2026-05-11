-- 0016 — Pay-to-promote.
--
-- Any item (free OR premium) can be "boosted" by paying a flat fee.
-- We record:
--   - `promoted_until` on the subject row (timestamptz) for fast read +
--     marketplace sort. Null means not boosted.
--   - A separate `promotions` ledger row per payment, so authors can audit
--     past boosts and we can enforce idempotency on Stripe webhook replay.
--
-- The promote fee goes 100% to Versuz (no Connect split — it's a platform
-- fee, not a creator transaction). Promotions stack additively : buying
-- a 2nd 30-day boost while one is active extends the existing window.

------------------------------------------------------------------------------
-- A · promoted_until column on subjects
------------------------------------------------------------------------------

alter table skills
  add column if not exists promoted_until timestamptz;

alter table claude_md_files
  add column if not exists promoted_until timestamptz;

-- Index for the marketplace sort: WHERE promoted_until > now() ORDER BY ...
create index if not exists idx_skills_promoted on skills(promoted_until)
  where promoted_until is not null;
create index if not exists idx_claude_md_promoted on claude_md_files(promoted_until)
  where promoted_until is not null;

------------------------------------------------------------------------------
-- B · promotions ledger
--
-- Mirrors the shape of `purchases` (one row per checkout) but reserved for
-- promote payments. Lets a buyer / Versuz admin audit "who paid for what
-- boost when" without polluting the purchases table semantics.
------------------------------------------------------------------------------

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null,
  subject_kind text not null check (subject_kind in ('skill', 'claude_md')),
  skill_id uuid references skills(id) on delete set null,
  claude_md_id uuid references claude_md_files(id) on delete set null,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  duration_days integer not null check (duration_days > 0),
  -- The window this payment activated. Always non-null after webhook fires.
  activated_at timestamptz,
  expires_at timestamptz,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint exactly_one_subject_promotion check (
    (skill_id is not null and claude_md_id is null and subject_kind = 'skill') or
    (skill_id is null and claude_md_id is not null and subject_kind = 'claude_md')
  )
);

create index if not exists idx_promotions_buyer on promotions(buyer_user_id);
create index if not exists idx_promotions_skill on promotions(skill_id) where skill_id is not null;
create index if not exists idx_promotions_claude_md on promotions(claude_md_id) where claude_md_id is not null;
create index if not exists idx_promotions_status on promotions(status);

------------------------------------------------------------------------------
-- C · RLS — buyer reads own promotions, item author reads promotions on
--         their items, service-role writes everything.
------------------------------------------------------------------------------

alter table promotions enable row level security;

drop policy if exists "promotions_buyer_read" on promotions;
create policy "promotions_buyer_read"
  on promotions for select
  using (auth.uid() = buyer_user_id);

drop policy if exists "promotions_author_read" on promotions;
create policy "promotions_author_read"
  on promotions for select
  using (
    (subject_kind = 'skill' and exists (
      select 1 from skills s
      where s.id = promotions.skill_id and s.author_user_id = auth.uid()
    ))
    or
    (subject_kind = 'claude_md' and exists (
      select 1 from claude_md_files c
      where c.id = promotions.claude_md_id and c.author_user_id = auth.uid()
    ))
  );

-- No insert/update policies → anonymous + authenticated cannot write.
-- Service role bypasses RLS and is the only writer (Stripe webhook).
