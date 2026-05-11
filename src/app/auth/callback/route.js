import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(`Sign-in failed: ${error.message}`)}`);
    res.cookies.delete("auth_next");
    return res;
  }

  const res = NextResponse.redirect(`${origin}${nextSafe}`);
  res.cookies.delete("auth_next");
  return res;
}
