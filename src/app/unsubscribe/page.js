import Link from "next/link";
import { PageHero } from "@/components/section";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubToken } from "@/lib/emails/unsubscribe-token";

export const metadata = {
  title: "Unsubscribe",
  description: "Stop receiving Versuz emails.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }) {
  const params = (await searchParams) || {};
  const email = typeof params.email === "string" ? params.email.toLowerCase().trim() : "";
  const token = typeof params.token === "string" ? params.token : "";

  const valid = email && token && verifyUnsubToken(email, token);
  let status = "invalid";
  let message = "";

  if (valid) {
    const sb = createSupabaseAdminClient();
    if (!sb) {
      status = "error";
      message = "Service unavailable. Try again later.";
    } else {
      // Mark subscribers + suppress re-engagement on profiles
      const now = new Date().toISOString();
      const { error: subErr } = await sb
        .from("subscribers")
        .update({ unsubscribed_at: now })
        .eq("email", email);
      // Best-effort : also flag the profile so re-engagement cron skips them
      await sb
        .from("profiles")
        .update({ reengage_sent_at: now }) // setting now means we won't re-engage for 90+ days
        .ilike("github_login", email.split("@")[0])
        .limit(1);

      if (subErr) {
        status = "error";
        message = subErr.message;
      } else {
        status = "ok";
      }
    }
  }

  return (
    <div>
      <PageHero
        eyebrow="§ Unsubscribe"
        title={
          status === "ok" ? (
            <>
              You're <em style={{ color: "var(--accent)" }}>out</em>.
            </>
          ) : status === "error" ? (
            <>
              Something went <em style={{ color: "var(--danger, #b23a3a)" }}>wrong</em>.
            </>
          ) : (
            <>
              Invalid <em style={{ color: "var(--accent)" }}>link</em>.
            </>
          )
        }
        subtitle={
          status === "ok"
            ? `${email} has been removed from the Versuz mailing list. You will not receive further newsletters or re-engagement emails.`
            : status === "error"
              ? message
              : "This unsubscribe link is missing or has expired. If you want to stop receiving Versuz emails, reply 'stop' to any of our messages and we'll remove you manually."
        }
      />

      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) 64px",
        }}
      >
        {status === "ok" && (
          <div
            style={{
              padding: "24px 28px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              marginBottom: 32,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--fg)",
            }}
          >
            <p style={{ margin: "0 0 12px" }}>
              Transactional emails (account creation, purchase receipts, skill submission confirmation)
              are <strong>not affected</strong> — they're necessary for your account.
            </p>
            <p style={{ margin: 0, color: "var(--fg-muted)" }}>
              Changed your mind? You can re-subscribe anytime via the footer form on{" "}
              <Link href="/" className="vz-link">versuz.dev</Link>.
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            className="vz-btn-primary"
            style={{
              background: "var(--accent)",
              color: "var(--bone)",
              padding: "14px 22px",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Back to home
            <span style={{ fontFamily: "var(--font-mono)" }}>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
