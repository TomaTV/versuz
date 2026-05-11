/**
 * Service-role Supabase client for admin actions only.
 *
 * Bypasses RLS — never expose this to the browser, never use without an
 * explicit admin gate. All callers must `await requireAdmin()` first.
 */

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
