-- 0014 — RLS for purchases + payouts.
--
-- Buyers can read their own orders. Sellers can read purchases of items they
-- authored. Writes only via service-role (Stripe webhook). Payouts are
-- self-read for the creator.

alter table purchases enable row level security;

drop policy if exists "purchases_buyer_read" on purchases;
create policy "purchases_buyer_read"
  on purchases for select
  using (auth.uid() = buyer_user_id);

drop policy if exists "purchases_seller_read" on purchases;
create policy "purchases_seller_read"
  on purchases for select
  using (
    (subject_kind = 'skill' and exists (
      select 1 from skills s
      where s.id = purchases.skill_id
        and s.author_user_id = auth.uid()
    ))
    or
    (subject_kind = 'claude_md' and exists (
      select 1 from claude_md_files c
      where c.id = purchases.claude_md_id
        and c.author_user_id = auth.uid()
    ))
  );

-- No insert/update/delete policies → anon + authenticated cannot write.
-- Service role bypasses RLS and is the only writer (Stripe webhook).

alter table payouts enable row level security;

drop policy if exists "payouts_self_read" on payouts;
create policy "payouts_self_read"
  on payouts for select
  using (auth.uid() = creator_user_id);
