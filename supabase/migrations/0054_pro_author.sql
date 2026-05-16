-- 0054 — Pro Author tier (recurring $9/mo subscription)
--
-- Adds the columns that let us detect + manage a Pro Author subscription
-- on a user's profile. The feature is env-gated : if
-- STRIPE_PRO_AUTHOR_PRICE_ID is unset, the /pricing page keeps the
-- waitlist form ; once set, it flips to a checkout button that creates
-- a Stripe Subscription mode session.
--
-- New cols on profiles :
--   is_pro_author              — convenience boolean for fast gating
--   stripe_customer_id         — cached so we don't re-create Customers
--                                 every checkout (distinct from
--                                 stripe_account_id which is for Connect)
--   pro_author_subscription_id — Stripe sub id, source of truth for the
--                                 webhook handlers
--   pro_author_until           — when the sub is canceled, holds the
--                                 paid-period-end so we keep features
--                                 active through the grace window

alter table public.profiles
  add column if not exists is_pro_author boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists pro_author_subscription_id text,
  add column if not exists pro_author_until timestamptz;

-- Webhook handlers look up profiles by stripe_customer_id since
-- customer.subscription.* events carry only the customer id, not our
-- metadata. Partial index so the lookup is O(log n).
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- Profile dashboards filter "Pro Author : active" → index for the
-- partial column. Cheap, only rows that opted in.
create index if not exists profiles_is_pro_author_idx
  on public.profiles(is_pro_author)
  where is_pro_author = true;
