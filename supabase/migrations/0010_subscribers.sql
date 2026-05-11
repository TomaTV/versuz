-- 0010 — newsletter subscribers.
--
-- Simple opt-in list for the weekly digest. Inserts only via service-role
-- (api/subscribe route). No public read.

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'footer',
  user_agent text,
  ip_hash text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscribers_created on subscribers(created_at desc);

alter table subscribers enable row level security;
-- No public read/write policies. Service role only.
