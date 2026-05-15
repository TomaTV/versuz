import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Fetch global timeout (5s par défaut). Mai 2026 : Supabase free tier
// saturait et Cloudflare 522 prenait 60s+ à répondre, ce qui timeoutait
// chaque page du build Vercel. Cap TOUTES les requests Supabase issues
// du client public à `SUPABASE_FETCH_TIMEOUT_MS` ms — quand Supabase est
// down, on dégrade en `null` data au lieu de bloquer le build.
const FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS) || 5000;

function fetchWithTimeout(input, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Cookie-less anon client for public reads (rankings, leaderboard, marketplace).
// Lives in its own file so it does NOT pull in `next/headers` — importing
// that module forces consumers into dynamic rendering and breaks ISR.
export const createSupabasePublicClient = cache(() => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
});
