-- 0015 — Premium download gating (V1.5).
--
-- Goal: when a buyer purchases a premium skill / CLAUDE.md, they receive an
-- actual exclusive payload — not just a "Yours" badge over a public GitHub
-- link. Authors upload the premium file at submit time into a private
-- Supabase Storage bucket; on purchase, the webhook stamps a signed URL onto
-- the purchases row, and the detail page shows a one-click download CTA to
-- buyers / authors only.
--
-- See `docs/premium-downloads.md` (if present) for the buyer-flow walkthrough.

------------------------------------------------------------------------------
-- A · Private storage bucket
--
-- Buckets are normally created via the Supabase dashboard or `supabase init`,
-- but we use an idempotent SQL insert so a CI re-deploy / fresh project pick
-- it up automatically. `public = false` → only signed URLs work.
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('premium-content', 'premium-content', false)
on conflict (id) do nothing;

------------------------------------------------------------------------------
-- B · Storage path columns on subjects
--
-- One column per subject table. NULL for free-tier rows (always) and for
-- legacy premium rows that pre-date this migration (those keep working as
-- "badge-only" until the author re-submits with an upload).
------------------------------------------------------------------------------

alter table skills
  add column if not exists private_storage_path text;

alter table claude_md_files
  add column if not exists private_storage_path text;

------------------------------------------------------------------------------
-- C · Cached signed URL on the purchase row
--
-- The webhook signs a fresh URL on `checkout.session.completed` so the buyer
-- gets it instantly in the success page / receipt email. The detail page
-- regenerates a fresh URL on render too (cheap, server-only) so even an
-- expired cached URL never blocks a buyer who comes back days later.
------------------------------------------------------------------------------

alter table purchases
  add column if not exists download_url text,
  add column if not exists download_url_expires_at timestamptz;

------------------------------------------------------------------------------
-- D · Storage RLS — allow nothing direct
--
-- All reads must go through signed URLs minted by service-role. authenticated
-- users have NO direct read on the bucket — that's the whole point. Authors
-- upload via service-role too (the submit server action runs server-side and
-- has access to SUPABASE_SERVICE_ROLE_KEY).
--
-- We don't add explicit policies (no policy = deny). This block is documented
-- here so a future maintainer doesn't add an over-permissive policy thinking
-- the bucket is "missing one".
------------------------------------------------------------------------------
