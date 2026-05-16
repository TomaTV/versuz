import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import crypto from "node:crypto";

/**
 * POST /api/enterprise/contact
 *
 * Lead capture for the /enterprise page. Writes to enterprise_leads
 * (mig 0053) and best-effort notifies the founder by email via Resend.
 *
 * Anti-abuse :
 *   - Honeypot field "website" (silent fake-success)
 *   - Email format check
 *   - Same-email rate limit (1 lead / 30 min)
 *   - 2 KB body cap on every text field
 *
 * Response : JSON. The page form submits via fetch + handles UI inline.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD = 2000;

function clip(s, max = MAX_FIELD) {
  return String(s ?? "").slice(0, max).trim();
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // Honeypot — bots fill this, real users never see it.
  const honeypot = clip(payload?.website, 100);
  if (honeypot) {
    return Response.json({ ok: true });
  }

  const email = clip(payload?.email, 320).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const name = clip(payload?.name);
  const company = clip(payload?.company);
  const useCase = clip(payload?.useCase);
  const scale = clip(payload?.scale);
  const message = clip(payload?.message, 5000);

  const sb = createSupabaseAdminClient();
  if (!sb) {
    return Response.json(
      { ok: false, error: "Service unavailable" },
      { status: 503 }
    );
  }

  // Rate limit — same email within 30min returns a soft success without
  // re-inserting or re-emailing. Prevents accidental double-submits +
  // forms-bot abuse.
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count: recent } = await sb
    .from("enterprise_leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((recent || 0) > 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) || null;

  const { error } = await sb.from("enterprise_leads").insert({
    email,
    name: name || null,
    company: company || null,
    use_case: useCase || null,
    scale: scale || null,
    message: message || null,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  });
  if (error) {
    console.warn(`[enterprise-contact] insert failed: ${error.message}`);
    return Response.json(
      { ok: false, error: "Could not record lead" },
      { status: 500 }
    );
  }

  // Best-effort notification to the founder. Failure is logged, not
  // surfaced — the lead is safe in DB and can be reviewed in /admin.
  try {
    const founderEmail =
      process.env.ENTERPRISE_NOTIFY_EMAIL ||
      process.env.RESEND_REPLY_TO ||
      "contact@flukxstudio.fr";
    const lines = [
      `<p><strong>New enterprise lead.</strong></p>`,
      `<p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>`,
      name ? `<p><strong>Name :</strong> ${escapeHtml(name)}</p>` : "",
      company ? `<p><strong>Company :</strong> ${escapeHtml(company)}</p>` : "",
      useCase
        ? `<p><strong>Use case :</strong> ${escapeHtml(useCase)}</p>`
        : "",
      scale ? `<p><strong>Scale :</strong> ${escapeHtml(scale)}</p>` : "",
      message
        ? `<p><strong>Message :</strong></p><blockquote style="border-left:2px solid #c2410c;padding-left:12px;color:#555">${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>`
        : "",
      `<p style="color:#888;font-size:12px;">Review in admin · ${new Date().toISOString()}</p>`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendEmail({
      to: founderEmail,
      subject: `[Versuz · enterprise lead] ${company || email}`,
      html: lines,
      replyTo: email,
    });
  } catch (err) {
    console.warn(`[enterprise-contact] notify failed: ${err.message}`);
  }

  return Response.json({ ok: true });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
