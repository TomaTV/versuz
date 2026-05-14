/**
 * Minimal Resend client — no SDK dep, just fetch.
 *
 * Configure :
 *   RESEND_API_KEY=re_xxx
 *   RESEND_FROM="Versuz <hello@versuz.dev>"             (sending domain, verified in Resend)
 *   RESEND_REPLY_TO="contact@flukxstudio.fr"            (real inbox where replies land)
 *
 * Why both addresses : Versuz brand sends from versuz.dev for trust + brand
 * recognition, but the business owner reads mail in their existing flukxstudio
 * inbox. Setting Reply-To means any user reply goes straight to that inbox
 * without needing an email-forwarding setup on versuz.dev.
 *
 * If RESEND_API_KEY is unset, sendEmail returns { ok: false, skipped: true }
 * silently — the caller is expected to treat email as best-effort and not
 * block the user flow on it.
 *
 * Docs : https://resend.com/docs/api-reference/emails/send-email
 */

const ENDPOINT = "https://api.resend.com/emails";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send an email via Resend.
 *
 * @param {object} args
 * @param {string} args.to — recipient email
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.text] — plaintext fallback (auto-stripped from html if absent)
 * @param {string} [args.from] — defaults to env RESEND_FROM
 * @param {string} [args.replyTo] — defaults to env RESEND_REPLY_TO
 * @returns {Promise<{ok: boolean, id?: string, error?: string, skipped?: boolean}>}
 */
export async function sendEmail({ to, subject, html, text, from, replyTo, unsubscribeUrl }) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, skipped: true };
  }
  const fromAddr = from || process.env.RESEND_FROM || "Versuz <hello@versuz.dev>";
  const replyToAddr =
    replyTo || process.env.RESEND_REPLY_TO || "contact@flukxstudio.fr";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [to],
        reply_to: replyToAddr,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, "").trim(),
        // RFC 8058 / Gmail "Unsubscribe" button at the top of the email.
        // Requires List-Unsubscribe-Post for one-click unsubscribe per Gmail.
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || `Resend ${res.status}` };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
