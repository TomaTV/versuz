import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Return the set of slugs that the given user has paid-purchased, so the
 * marketplace can show "Owned" instead of "Buy" for items they already own.
 *
 * Uses admin client (RLS-bypassed) because the read needs a join through
 * skills/claude_md_files to get the slug. Only returns paid status.
 *
 * Returns: { skills: Set<string>, claudeMds: Set<string> }
 */
export const getOwnedSlugs = cache(async (userId) => {
  const empty = { skills: new Set(), claudeMds: new Set() };
  if (!userId) return empty;
  const sb = createSupabaseAdminClient();
  if (!sb) return empty;

  const [{ data: skillRows }, { data: claudeRows }] = await Promise.all([
    sb
      .from("purchases")
      .select("skills!inner(slug)")
      .eq("buyer_user_id", userId)
      .eq("subject_kind", "skill")
      .eq("status", "paid"),
    sb
      .from("purchases")
      .select("claude_md_files!inner(slug)")
      .eq("buyer_user_id", userId)
      .eq("subject_kind", "claude_md")
      .eq("status", "paid"),
  ]);

  return {
    skills: new Set((skillRows || []).map((r) => r.skills?.slug).filter(Boolean)),
    claudeMds: new Set((claudeRows || []).map((r) => r.claude_md_files?.slug).filter(Boolean)),
  };
});

/**
 * Return the set of slugs the user authored (any tier). Used to mark "Yours"
 * instead of "Buy" on the marketplace card.
 */
export const getAuthoredSlugs = cache(async (userId) => {
  const empty = { skills: new Set(), claudeMds: new Set() };
  if (!userId) return empty;
  const sb = createSupabaseAdminClient();
  if (!sb) return empty;

  const [{ data: skillRows }, { data: claudeRows }] = await Promise.all([
    sb.from("skills").select("slug").eq("author_user_id", userId),
    sb.from("claude_md_files").select("slug").eq("author_user_id", userId),
  ]);

  return {
    skills: new Set((skillRows || []).map((r) => r.slug).filter(Boolean)),
    claudeMds: new Set((claudeRows || []).map((r) => r.slug).filter(Boolean)),
  };
});
