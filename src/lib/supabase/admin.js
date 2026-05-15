/**
 * Service-role Supabase client for admin actions only.
 *
 * Bypasses RLS — never expose this to the browser, never use without an
 * explicit admin gate. All callers must `await requireAdmin()` first.
 */

import { createClient } from "@supabase/supabase-js";

// Voir lib/supabase/public.js pour le rationale — 5s timeout sur tous
// les fetches Supabase pour ne pas bloquer le build/runtime quand l'host
// est down (Cloudflare 522 = 60s+ d'attente sans ça).
const FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS) || 5000;

function fetchWithTimeout(input, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}
