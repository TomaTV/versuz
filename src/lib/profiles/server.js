import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Read a profile row by user id. Cached per-request.
 *
 * Falls back to a synthetic profile derived from auth.users.user_metadata if
 * the row is missing (which shouldn't happen post-migration 0013, but keeps
 * pre-trigger users safe).
 */
export const getProfile = cache(async (userId) => {
  if (!userId) return null;
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("profiles")
    .select(
      "id, github_login, github_id, display_name, avatar_url, bio, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled"
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[profiles] getProfile(${userId}) failed: ${error.message}`);
    return null;
  }
  return data || null;
});

/**
 * Get profile for the current user (or null).
 */
export async function getCurrentProfile(user) {
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (profile) return profile;
  // Synthetic fallback if backfill hasn't run.
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    github_login: meta.user_name || null,
    github_id: meta.provider_id || null,
    display_name: meta.name || meta.user_name || user.email?.split("@")[0] || null,
    avatar_url: meta.avatar_url || null,
    bio: null,
    stripe_account_id: null,
    stripe_onboarding_complete: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
  };
}

/**
 * Update the current user's profile. Uses the user's own session (RLS allows
 * self-update). Returns the updated row.
 */
export async function updateProfile(userId, patch) {
  const sb = await createSupabaseServerClient();
  if (!sb) throw new Error("[profiles] supabase not configured");
  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(`[profiles] update failed: ${error.message}`);
  return data;
}

/**
 * Service-role update — used by Stripe webhook + connect actions to write
 * stripe_* fields. Bypasses RLS on purpose.
 */
export async function updateProfileAsAdmin(userId, patch) {
  const sb = createSupabaseAdminClient();
  if (!sb) throw new Error("[profiles] admin client not configured");
  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(`[profiles] admin update failed: ${error.message}`);
  return data;
}

/**
 * Look up the seller profile for a subject (skill or claude_md).
 * Returns null if no author or no profile.
 */
export async function getSellerProfile({ kind, subjectId }) {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { data: subject } = await sb
    .from(table)
    .select("author_user_id")
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject?.author_user_id) return null;
  return await getProfile(subject.author_user_id);
}
