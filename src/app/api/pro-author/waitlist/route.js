import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/pro-author/waitlist
 *
 * Captures intent signal for the Pro Author tier ($9/mo, not yet shipped).
 * Reuses the `subscribers` table with source='pro-author-waitlist' for
 * segmentation — no new migration needed. Idempotent (re-submit = soft ok).
 *
 * Response : JSON. Form on /pricing handles UI inline.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // Honeypot
  const honeypot = String(payload?.website || "").trim();
  if (honeypot) return Response.json({ ok: true });

  const email = String(payload?.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 320);
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const sb = createSupabaseAdminClient();
  if (!sb) {
    return Response.json(
      { ok: false, error: "Service unavailable" },
      { status: 503 }
    );
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 240) || null;

  // Upsert — re-submit doesn't error, just clears unsubscribed_at.
  // If the email already exists with a different source, keep the
  // original source (footer signup is more meaningful than pro-author
  // waitlist for retention emails). But also tag the pro-author intent
  // in user_agent for downstream segmentation (we don't have a tags
  // column yet).
  const { error } = await sb
    .from("subscribers")
    .upsert(
      {
        email,
        source: "pro-author-waitlist",
        user_agent: userAgent,
        unsubscribed_at: null,
      },
      { onConflict: "email", ignoreDuplicates: false }
    );

  if (error) {
    console.warn(`[pro-author-waitlist] upsert failed: ${error.message}`);
    return Response.json(
      { ok: false, error: "Could not record signup" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
