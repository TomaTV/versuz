"use server";

/**
 * Auth server actions — Supabase Auth.
 *
 * V0 surface: email + password (sign in / sign up / sign out) and GitHub
 * OAuth (the natural path for devs). Wired against `@supabase/ssr` server
 * client so the cookies are written on the response.
 *
 * Until Supabase env vars are filled, these will return a friendly error.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const isMissingClient = (sb) =>
  !sb && {
    error: "Supabase isn't configured yet — set NEXT_PUBLIC_SUPABASE_URL & ANON_KEY in .env.local.",
  };

export async function signInWithPassword(formData) {
  const sb = await createSupabaseServerClient();
  const guard = isMissingClient(sb);
  if (guard) return guard;

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email and password required." };

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/profile");
}

export async function signUpWithPassword(formData) {
  const sb = await createSupabaseServerClient();
  const guard = isMissingClient(sb);
  if (guard) return guard;

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email and password required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const { error } = await sb.auth.signUp({ email, password });
  if (error) return { error: error.message };
  redirect("/profile");
}

export async function signInWithGitHub(formData) {
  const sb = await createSupabaseServerClient();
  const guard = isMissingClient(sb);
  if (guard) return guard;

  // Preserve `next` URL across the OAuth round-trip via a short-lived
  // cookie. Supabase's OAuth flow doesn't expose `state` cleanly, so a
  // cookie is the simplest reliable carrier.
  const next = formData ? String(formData.get("next") || "") : "";
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    const cookieStore = await cookies();
    cookieStore.set("auth_next", next, {
      maxAge: 600,            // 10 minutes
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data?.url) redirect(data.url);
}

export async function signOut() {
  const sb = await createSupabaseServerClient();
  if (sb) await sb.auth.signOut();
  redirect("/");
}
