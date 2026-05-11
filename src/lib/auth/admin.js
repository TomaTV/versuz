/**
 * Admin gate — GitHub OAuth + env allowlist.
 *
 * TWO env vars (set either or both in `.env.local`) :
 *
 *   ADMIN_GITHUB_IDS=12345,67890        <-- preferred (immutable numeric IDs)
 *   ADMIN_GITHUB_LOGINS=tomadev,coworker <-- convenient but mutable
 *
 * If both are unset, NO ONE is admin (safe default). When both are set, a
 * user matching either is admin.
 *
 * Security note: GitHub usernames can be renamed and reclaimed by another
 * account. A previous holder of the login could lose admin access; worse, an
 * abandoned login could be grabbed by a malicious user. Prefer IDs.
 *
 * Find your numeric GitHub ID: `https://api.github.com/users/<your-login>`
 * (the "id" field). Or open https://github.com/<your-login>.png — the URL
 * for the avatar uses the ID.
 *
 * Supabase stores both fields on the auth user (after GitHub OAuth login):
 *   user.user_metadata.user_name            // login
 *   user.user_metadata.provider_id          // GitHub ID (string)
 *   user.identities[github].id              // GitHub ID
 *   user.identities[github].identity_data   // login + provider_id
 */

import { getCurrentUser } from "@/lib/auth/server";

function csv(name) {
  return (process.env[name] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function adminLogins() {
  return csv("ADMIN_GITHUB_LOGINS").map((s) => s.toLowerCase());
}

function adminIds() {
  return csv("ADMIN_GITHUB_IDS");
}

export function ghLogin(user) {
  if (!user) return null;
  return (
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.identities?.find?.((i) => i.provider === "github")?.identity_data?.user_name ||
    null
  );
}

export function ghId(user) {
  if (!user) return null;
  const ident = user.identities?.find?.((i) => i.provider === "github");
  // Supabase stores the GitHub user ID as `identities.provider_id` (canonical),
  // and OAuth claims sometimes mirror it as `sub` or `provider_id` on
  // identity_data / user_metadata. Try in order of trust.
  const candidates = [
    ident?.provider_id,
    ident?.identity_data?.provider_id,
    ident?.identity_data?.sub,
    user.user_metadata?.provider_id,
    user.user_metadata?.sub,
  ];
  for (const c of candidates) {
    if (c != null && c !== "") return String(c);
  }
  return null;
}

export function isAdmin(user) {
  if (!user) return false;
  const provider =
    user.app_metadata?.provider ||
    (user.identities?.find?.((i) => i.provider === "github") ? "github" : null);
  if (provider !== "github") return false;

  const ids = adminIds();
  const id = ghId(user);
  if (id && ids.includes(id)) return true;

  const logins = adminLogins();
  const login = (ghLogin(user) || "").toLowerCase();
  if (login && logins.includes(login)) return true;

  return false;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return null;
  return user;
}
