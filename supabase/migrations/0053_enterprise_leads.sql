-- 0053 — enterprise_leads
--
-- B2B lead capture for the /enterprise page (Bench-as-a-Service tiers :
-- Starter $99/mo, Team $299/mo, Custom). Distinct from `subscribers` (a
-- newsletter opt-in list with no contact context) — these rows carry the
-- full qualification payload : company, use case, scale, message.
--
-- Inserts only via service-role (api/enterprise/contact). No public read.

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  company text,
  use_case text,
  scale text,
  message text,
  source text default 'enterprise-page',
  ip_hash text,
  user_agent text,
  status text default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'lost')),
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_enterprise_leads_created
  on public.enterprise_leads(created_at desc);
create index if not exists idx_enterprise_leads_status
  on public.enterprise_leads(status);
create index if not exists idx_enterprise_leads_email
  on public.enterprise_leads(email);

alter table public.enterprise_leads enable row level security;
-- No policies — service-role admin client only (insert + read in /admin).
