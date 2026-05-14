-- 0043 — RLS performance : wrap auth.uid() in (select auth.uid())
--
-- Anti-pattern documenté par Supabase : `auth.uid() = column` re-évalue la
-- fonction par ligne (init_plan per row). Avec 100k rows skills /
-- claude_md_files et des queries qui scan large, ça multiplie le coût CPU
-- par N. Sur free tier ça contribue à "exhausting multiple resources".
--
-- Fix : envelopper en `(select auth.uid())` — Postgres l'évalue 1× par
-- requête et cache le résultat. Aucun changement de sémantique, juste
-- une init_plan au lieu d'un per-row call.
--
-- Refs :
--   - https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
--   - PostgREST query plan : init_plan vs sub_plan
--
-- Policies modifiées (drop + recreate) :
--   - skills_owner_*     (0007_submit_rls)
--   - claude_md_owner_*  (0007_submit_rls)
--   - profiles_self_*    (0013_profiles)
--   - purchases_*        (0014_purchases_rls)
--   - promotions_*       (0016_promotions)

-- ─────────── skills ───────────
DROP POLICY IF EXISTS skills_owner_insert ON skills;
CREATE POLICY skills_owner_insert ON skills
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = (select auth.uid()));

DROP POLICY IF EXISTS skills_owner_update ON skills;
CREATE POLICY skills_owner_update ON skills
  FOR UPDATE TO authenticated
  USING (author_user_id = (select auth.uid()))
  WITH CHECK (author_user_id = (select auth.uid()));

-- ─────────── claude_md_files ───────────
DROP POLICY IF EXISTS claude_md_owner_insert ON claude_md_files;
CREATE POLICY claude_md_owner_insert ON claude_md_files
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = (select auth.uid()));

DROP POLICY IF EXISTS claude_md_owner_update ON claude_md_files;
CREATE POLICY claude_md_owner_update ON claude_md_files
  FOR UPDATE TO authenticated
  USING (author_user_id = (select auth.uid()))
  WITH CHECK (author_user_id = (select auth.uid()));

-- ─────────── profiles ───────────
DROP POLICY IF EXISTS profiles_self_select ON profiles;
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT TO authenticated
  USING (true);  -- profiles are public-read for /u/[login]

DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ─────────── purchases ───────────
DROP POLICY IF EXISTS purchases_buyer_select ON purchases;
CREATE POLICY purchases_buyer_select ON purchases
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = buyer_user_id);

DROP POLICY IF EXISTS purchases_seller_select_skill ON purchases;
CREATE POLICY purchases_seller_select_skill ON purchases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills s
      WHERE s.id = purchases.skill_id
        AND s.author_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS purchases_seller_select_claude ON purchases;
CREATE POLICY purchases_seller_select_claude ON purchases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claude_md_files c
      WHERE c.id = purchases.claude_md_id
        AND c.author_user_id = (select auth.uid())
    )
  );

-- ─────────── promotions ───────────
-- Note : the promotions table only has buyer_user_id (no creator_user_id —
-- Versuz keeps 100% of the boost fee, it isn't a creator transaction).
-- The buyer is the only "owner" of a promotion row; sellers see promotions
-- via the EXISTS-on-skills/claude_md policies below.
DROP POLICY IF EXISTS promotions_buyer_select ON promotions;
CREATE POLICY promotions_buyer_select ON promotions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = buyer_user_id);

DROP POLICY IF EXISTS promotions_seller_select_skill ON promotions;
CREATE POLICY promotions_seller_select_skill ON promotions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills s
      WHERE s.id = promotions.skill_id
        AND s.author_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS promotions_seller_select_claude ON promotions;
CREATE POLICY promotions_seller_select_claude ON promotions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claude_md_files c
      WHERE c.id = promotions.claude_md_id
        AND c.author_user_id = (select auth.uid())
    )
  );

-- ─────────── indexes manquants pour les EXISTS RLS ───────────
-- Les EXISTS dans les policies font des sub-queries sur skills.author_user_id
-- et claude_md_files.author_user_id. Sans index, c'est seq-scan à chaque
-- check de policy. Ajoute les indexes manquants si absents.
CREATE INDEX IF NOT EXISTS skills_author_user_id_idx ON skills (author_user_id) WHERE author_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS claude_md_files_author_user_id_idx ON claude_md_files (author_user_id) WHERE author_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchases_buyer_user_id_idx ON purchases (buyer_user_id);
CREATE INDEX IF NOT EXISTS purchases_skill_id_idx ON purchases (skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS purchases_claude_md_id_idx ON purchases (claude_md_id) WHERE claude_md_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS promotions_buyer_user_id_idx ON promotions (buyer_user_id);
CREATE INDEX IF NOT EXISTS promotions_skill_id_idx ON promotions (skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS promotions_claude_md_id_idx ON promotions (claude_md_id) WHERE claude_md_id IS NOT NULL;
