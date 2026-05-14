import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeSubscribeEmail } from "@/lib/emails/transactional";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function backTo(url, status, message) {
  const target = new URL("/", url);
  target.pathname = "/";
  target.searchParams.set("subscribed", status);
  if (message) target.searchParams.set("msg", message.slice(0, 120));
  return target.toString();
}

export async function POST(request) {
  const formData = await request.formData();

  // Honeypot — hidden field that bots fill, real users never see.
  // Silently fake-succeed so the bot doesn't retry with a variant.
  const honeypot = String(formData.get("website") || "").trim();
  if (honeypot) {
    redirect(backTo(request.url, "ok", "Thanks"));
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    redirect(backTo(request.url, "error", "Invalid email"));
  }

  const sb = createSupabaseAdminClient();
  if (!sb) {
    redirect(backTo(request.url, "error", "Service unavailable"));
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 240) || null;

  // Upsert: idempotent on email (re-subscribe is fine).
  const { error } = await sb
    .from("subscribers")
    .upsert(
      { email, source: "footer", user_agent: userAgent, unsubscribed_at: null },
      { onConflict: "email" }
    );

  if (error) {
    redirect(backTo(request.url, "error", error.message));
  }

  // Best-effort welcome email. Failure is logged but doesn't break signup —
  // the row is in DB and we can resend later.
  try {
    const { subject, html } = welcomeSubscribeEmail();
    const r = await sendEmail({ to: email, subject, html });
    if (!r.ok && !r.skipped) {
      console.warn(`[subscribe] welcome email failed: ${r.error}`);
    }
  } catch (err) {
    console.warn(`[subscribe] sendEmail threw: ${err.message}`);
  }

  redirect(backTo(request.url, "ok"));
}
