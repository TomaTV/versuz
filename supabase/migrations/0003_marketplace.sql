-- 0003 — Marketplace tier model.
--
-- Versuz pivots from "leaderboard-first" to "marketplace-first": every public
-- SKILL.md / CLAUDE.md is in the registry, with a tier that distinguishes
-- free (verified, badged) from premium (paid, curated). Judging stays as a
-- V1 differentiator on top of this — top-ranked items get a "top-N" badge.
--
-- Verification levels:
--   0 — unverified (scraped only, default)
--   1 — claimed   (author authenticated via GitHub OAuth, owner match)
--   2 — auto-verified (passed automated checks: license OK, content quality)
--   3 — human-verified (manual review by Versuz team)
--   4 — featured (editor's pick — surfaced on landing/category top)
--
-- Tier model:
--   free      — included in registry, anyone can install, $0
--   premium   — paid by buyer, author keeps 70%, Versuz takes 30%
--   featured  — Versuz first-party premium (curated by us, we keep 100%)

------------------------------------------------------------------------------
-- A · Marketplace fields on skills + claude_md_files
------------------------------------------------------------------------------

alter table skills
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'premium', 'featured')),
  add column if not exists price_usd numeric(10, 2),
  add column if not exists author_user_id uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_level integer not null default 0
    check (verification_level between 0 and 4);

-- price_usd should be set iff tier != 'free'
alter table skills
  add constraint skills_price_consistent
    check (
      (tier = 'free' and price_usd is null) or
      (tier in ('premium', 'featured') and price_usd is not null and price_usd >= 0)
    );

create index if not exists idx_skills_tier on skills(tier);
create index if not exists idx_skills_verified on skills(verification_level) where verification_level >= 2;

alter table claude_md_files
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'premium', 'featured')),
  add column if not exists price_usd numeric(10, 2),
  add column if not exists author_user_id uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_level integer not null default 0
    check (verification_level between 0 and 4);

alter table claude_md_files
  add constraint claude_md_price_consistent
    check (
      (tier = 'free' and price_usd is null) or
      (tier in ('premium', 'featured') and price_usd is not null and price_usd >= 0)
    );

create index if not exists idx_claude_md_tier on claude_md_files(tier);

------------------------------------------------------------------------------
-- B · Purchases (one row per buy event)
------------------------------------------------------------------------------

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null,
  subject_kind text not null check (subject_kind in ('skill', 'claude_md')),
  skill_id uuid references skills(id) on delete set null,
  claude_md_id uuid references claude_md_files(id) on delete set null,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  -- Versuz commission held aside (30% on author-listed, 100% on featured/Versuz-first-party)
  commission_usd numeric(10, 2) not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'disputed', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  -- exactly one subject reference matches subject_kind
  constraint exactly_one_subject_purchase check (
    (skill_id is not null and claude_md_id is null and subject_kind = 'skill') or
    (skill_id is null and claude_md_id is not null and subject_kind = 'claude_md')
  )
);

create index if not exists idx_purchases_buyer on purchases(buyer_user_id);
create index if not exists idx_purchases_skill on purchases(skill_id) where skill_id is not null;
create index if not exists idx_purchases_claude_md on purchases(claude_md_id) where claude_md_id is not null;
create index if not exists idx_purchases_status on purchases(status);

------------------------------------------------------------------------------
-- C · Payouts (creator payouts via Stripe Connect)
------------------------------------------------------------------------------

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  period_start date not null,
  period_end date not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id text unique,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_payouts_creator on payouts(creator_user_id);
create index if not exists idx_payouts_period on payouts(period_start, period_end);

------------------------------------------------------------------------------
-- D · Materialised view for "currently rankable" subjects
--
-- The bench engine should rank only `tier=free` (open, public source) skills
-- and `tier=featured` Versuz-first-party. Premium author-listed skills ARE
-- ranked too, but with a separate flag in the UI ("paid skill, top-ranked").
------------------------------------------------------------------------------

-- (No new MV needed — `rankings` from 0002 already groups by category.
--  UI joins skills.tier when rendering to add a price column.)
