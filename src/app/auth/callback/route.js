import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeSignupEmail } from "@/lib/emails/transactional";

/**
 * OAuth redirect callback. Supabase redirects here with `?code=...` after
 * a successful provider sign-in. We exchange the code for a session, then
 * push the user to either:
 *   - the `next` URL stored in `auth_next` cookie (set by signInWithGitHub),
 *     so users coming from /buy/... land back on /buy/... after auth
 *   - /profile by default
 *
 * Errors (Supabase exchange failure, no code, denied) get surfaced via
 * /login?error=... so the user knows what happened instead of silently
 * landing on a blank page.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthErrorDesc = searchParams.get("error_description");

  // Read `next` cookie (set by sign-in action). Validate it's a relative
  // path so we don't open-redirect anywhere external.
  const nextCookie = request.cookies.get("auth_next")?.value || "";
  const nextSafe = nextCookie.startsWith("/") && !nextCookie.startsWith("//") ? nextCookie : "/profile";

  // Provider returned an error (user denied, GitHub down, etc.)
  if (oauthError) {
    const msg = oauthErrorDesc || oauthError;
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
    res.cookies.delete("auth_next");
    return res;
  }

  if (!code) {
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Sign-in cancelled — no auth code returned.")}`);
    res.cookies.delete("auth_next");
    return res;
  }

  const sb = await createSupabaseServerClient();
  if (!sb) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Auth client unavailable. Try again.")}`);
  }

  const { data: sessionData, error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(`Sign-in failed: ${error.message}`)}`);
    res.cookies.delete("auth_next");
    return res;
  }

  // First-login welcome email (best-effort, idempotent via `email_welcomed_at`
  // column on profiles — if you don't have it, the dedupe is purely time-based).
  // We mark the user as welcomed AFTER sending so a failed send retries on
  // the next login.
  const user = sessionData?.user;
  if (user?.email) {
    try {
      const admin = createSupabaseAdminClient();
      // Skip if profile already has email_welcomed_at set
      let alreadyWelcomed = false;
      if (admin) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email_welcomed_at")
          .eq("id", user.id)
          .maybeSingle();
        alreadyWelcomed = !!profile?.email_welcomed_at;
      }
      const githubLogin =
        user.user_metadata?.user_name ||
        user.user_metadata?.preferred_username ||
        user.email?.split("@")[0] ||
        "friend";

      // Always update last_active_at on every sign-in (cheap, drives re-engage cron).
      if (admin) {
        await admin
          .from("profiles")
          .upsert(
            {
              id: user.id,
              github_login: githubLogin,
              last_active_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      }

      if (!alreadyWelcomed) {
        const { subject, html } = welcomeSignupEmail({ githubLogin });
        const r = await sendEmail({ to: user.email, subject, html });
        if (r.ok && admin) {
          await admin
            .from("profiles")
            .update({ email_welcomed_at: new Date().toISOString() })
            .eq("id", user.id);
        }
      }
    } catch (err) {
      console.warn(`[auth-callback] welcome email failed: ${err.message}`);
    }
  }

  const res = NextResponse.redirect(`${origin}${nextSafe}`);
  res.cookies.delete("auth_next");
  return res;
}
