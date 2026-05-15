import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Voir lib/supabase/public.js pour le rationale.
const FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS) || 5000;

function fetchWithTimeout(input, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Public cookie-less client lives in `./public` — do NOT re-export it here.
// Pulling that export through this file would drag `next/headers` into the
// public module graph and force consumers into dynamic rendering.

// React `cache()` dedupes the client per-request — multiple callers in the
// same render share one client + one cookie read.
export const createSupabaseServerClient = cache(async () => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't set cookies — safe to ignore in V0 (read-only).
          }
        },
      },
      global: { fetch: fetchWithTimeout },
    }
  );
});
