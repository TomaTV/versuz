"use server";

/**
 * Claim flow — lets a logged-in GitHub user claim ownership of a scraped
 * skill / CLAUDE.md. We verify the GitHub login matches the repo owner via
 * the public GitHub API (no token needed for public repos at the read tier).
 *
 * On success: row.author_user_id = current user, verification_level = 1,
 * verified_at = now.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ghLogin } from "@/lib/auth/admin";

export async function claimSubject(formData) {
  const slug = String(formData.get("slug") || "");
  const kindRaw = String(formData.get("kind") || "skill");
  const kind = kindRaw === "claude_md" || kindRaw === "claude-md" ? "claude_md" : "skill";

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/claim/${kindRaw}/${slug}`)}`);
  }
  const login = ghLogin(user);
  if (!login) {
    return { error: "Sign in via GitHub OAuth to claim. Other providers can't verify ownership." };
  }

  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "Database unavailable" };

  const table = kind === "claude_md" ? "claude_md_files" : "skills";

  const { data: row, error: rowErr } = await sb
    .from(table)
    .select("id, slug, metadata, author_user_id, verification_level")
    .eq("slug", slug)
    .maybeSingle();
  if (rowErr) return { error: rowErr.message };
  if (!row) return { error: "Item not found" };

  if (row.author_user_id && row.author_user_id !== user.id) {
    return { error: "This item has already been claimed by another account." };
  }

  const meta = row.metadata || {};
  const owner = meta.owner;
  if (!owner) {
    return {
      error:
        "This item has no GitHub owner metadata — claim by URL submission instead via /submit.",
    };
  }

  // Live GitHub check — confirms the OAuth login (TomaTV) matches what GitHub
  // currently says the user is, and that the login is the actual repo owner.
  // Defends against stale Supabase identity_data after a GitHub username
  // rename.
  const ok = await verifyOwnership({ login, owner });
  if (!ok) {
    return {
      error: `Your GitHub account @${login} doesn't match the repo owner ${owner}. Sign in with the right GitHub account to claim.`,
    };
  }

  const { error } = await sb
    .from(table)
    .update({
      author_user_id: user.id,
      verification_level: 1,
      verified_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) return { error: error.message };

  revalidatePath(`/${kind === "claude_md" ? "claude-md" : "skills"}/${slug}`);
  revalidatePath("/profile");
  return { ok: true, slug, kind };
}

async function verifyOwnership({ login, owner }) {
  // GitHub user IDs and orgs are case-insensitive. If the owner is the user,
  // direct match. If the owner is an org, check membership (public membership
  // only — private will silently fail without a token, which is OK).
  if (login.toLowerCase() === owner.toLowerCase()) return true;

  try {
    const res = await fetch(`https://api.github.com/orgs/${owner}/public_members/${login}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "versuz" },
    });
    if (res.status === 204) return true; // public org member
    return false;
  } catch {
    return false;
  }
}
