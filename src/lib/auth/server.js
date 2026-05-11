import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Get the current user, or null if not signed in.
 *
 * Cached per-request via React.cache: vz-nav, vz-ticker, admin layouts and
 * various pages all need the user — without dedup, each call hits Supabase
 * (auth.getUser is a network roundtrip), which used to add 200-500ms × N
 * per page render. With cache(), it's exactly one roundtrip per request.
 *
 * Network failures return null (treat as logged-out) rather than throw, so
 * a transient Supabase blip doesn't 500 the whole page.
 */
export const getCurrentUser = cache(async () => {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  } catch (err) {
    console.warn(`[auth] getCurrentUser failed: ${err.message}`);
    return null;
  }
});

/**
 * Get the current user, or redirect to /login.
 * If Supabase isn't configured, returns null and the caller decides what to do.
 */
export async function requireUser({ next = "/profile" } = {}) {
  const sb = await createSupabaseServerClient();
  if (!sb) return { user: null, supabaseConfigured: false };
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { user, supabaseConfigured: true };
}
