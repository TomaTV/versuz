import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

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
    const r = await sendEmail({
      to: email,
      subject: "Welcome to Versuz",
      html: `
        <div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#14120e;max-width:560px;margin:0 auto;padding:32px 24px">
          <p style="font-family:'SF Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#6b6557;text-transform:uppercase;margin:0 0 24px">VERSUZ</p>
          <h1 style="font-family:Georgia,serif;font-size:36px;font-weight:400;letter-spacing:-0.02em;line-height:1.05;margin:0 0 16px">
            You're <em style="color:#c2410c">in</em>.
          </h1>
          <p>Thanks for subscribing. We send a short digest each Friday — top-ranked SKILL.md and CLAUDE.md of the week, plus what shipped on Versuz.</p>
          <p>If this was a mistake, just hit reply and we'll remove you.</p>
          <p style="margin-top:32px;color:#6b6557;font-size:13px">— the Versuz team</p>
        </div>
      `,
    });
    if (!r.ok && !r.skipped) {
      console.warn(`[subscribe] welcome email failed: ${r.error}`);
    }
  } catch (err) {
    console.warn(`[subscribe] sendEmail threw: ${err.message}`);
  }

  redirect(backTo(request.url, "ok"));
}
