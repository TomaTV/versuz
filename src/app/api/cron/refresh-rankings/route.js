import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorized(request) {
  const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
  if (isVercelCron) return true;
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return headerSecret === expected || querySecret === expected;
}

export async function GET(request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "DB unavailable" }, { status: 503 });
  const { error } = await sb.rpc("refresh_rankings");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
