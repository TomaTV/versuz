-- 0013 — profiles table.
--
-- Until now Versuz read display name / GitHub handle / avatar from
-- `auth.users.raw_user_meta_data`, which is overwritten by GitHub on every
-- OAuth login. That's fine for ephemeral display, but Stripe Connect needs
-- a stable place to store `stripe_account_id` per seller, and we'd like a
-- snapshot of identity that doesn't silently mutate.
--
-- This migration creates `profiles` (1:1 with auth.users), bootstraps a row
-- on every signup via trigger, and backfills existing users.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_login text,
  github_id text,
  display_name text,
  avatar_url text,
  bio text,
  -- Stripe Connect Express
  stripe_account_id text unique,
  stripe_onboarding_complete boolean not null default false,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_github_login on profiles (github_login);
create index if not exists idx_profiles_stripe_account on profiles (stripe_account_id);

-- RLS: public can read display fields, only the owner can update.
alter table profiles enable row level security;

drop policy if exists "profiles_public_read" on profiles;
create policy "profiles_public_read"
  on profiles for select
  using (true);

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Bootstrap a profile row when a new auth user is created.
create or replace function bootstrap_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, github_login, github_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'provider_id',
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function bootstrap_profile();

-- Backfill existing users (idempotent).
insert into profiles (id, github_login, github_id, display_name, avatar_url)
select
  u.id,
  u.raw_user_meta_data->>'user_name',
  u.raw_user_meta_data->>'provider_id',
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'user_name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- updated_at touch trigger
create or replace function touch_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on profiles;
create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function touch_profile_updated_at();
