import crypto from "node:crypto";

/**
 * Stateless HMAC unsubscribe token : sha256(email + secret).slice(0, 32).
 *
 * Avoids storing a token per subscriber. Verify by recomputing — no DB hit
 * needed before deleting the row. If the user changes their email later we
 * just stop sending; the old token becomes invalid because the email arg
 * differs.
 *
 * SECURITY : `secret` must be a high-entropy server-only env var. We reuse
 * `CRON_SECRET` for that — it's already required, already random, already
 * server-side. If it ever rotates, all outstanding unsub links break, which
 * is fine (users can re-subscribe).
 */
const SECRET = process.env.CRON_SECRET || "fallback-unsub-secret-CHANGE-ME";

export function makeUnsubToken(email) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(String(email).trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubToken(email, token) {
  if (!email || !token) return false;
  const expected = makeUnsubToken(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function unsubLink(siteUrl, email) {
  const token = makeUnsubToken(email);
  const u = new URL(`${siteUrl}/unsubscribe`);
  u.searchParams.set("email", email);
  u.searchParams.set("token", token);
  return u.toString();
}
