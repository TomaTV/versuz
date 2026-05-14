import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cookie-less anon client for public reads (rankings, leaderboard, marketplace).
// Lives in its own file so it does NOT pull in `next/headers` — importing
// that module forces consumers into dynamic rendering and breaks ISR.
export const createSupabasePublicClient = cache(() => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
});
