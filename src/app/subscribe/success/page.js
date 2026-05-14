import Link from "next/link";
import { PageHero } from "@/components/section";

export const metadata = {
  title: "Subscribed",
  description: "You're on the Versuz weekly digest list.",
  robots: { index: false, follow: false },
};

export default async function SubscribeSuccessPage({ searchParams }) {
  const params = (await searchParams) || {};
  const emailRaw = typeof params.email === "string" ? params.email : "";
  // Show a slightly redacted version: keep first 3 + domain
  const email = emailRaw.length > 8
    ? `${emailRaw.slice(0, 3)}…@${emailRaw.split("@")[1] || ""}`
    : emailRaw;

  return (
    <div>
      <PageHero
        eyebrow="§ Subscribed"
        title={
          <>
            You're <em style={{ color: "var(--accent)" }}>in</em>.
          </>
        }
        subtitle={
          email
            ? `A welcome email is on its way to ${email}. Check your inbox in the next minute or two.`
            : "A welcome email is on its way. Check your inbox in the next minute or two."
        }
      />

      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) 64px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 1,
            background: "var(--rule)",
            border: "1px solid var(--rule)",
          }}
        >
          <Card
            num="01"
            title="What happens next"
            body="Every Friday we send a short digest — top-ranked SKILL.md and CLAUDE.md files of the week, plus what shipped on Versuz. That's it. No spam, no upsells, no third-party tracking."
          />
          <Card
            num="02"
            title="Add us to your inbox"
            body={
              <>
                If our welcome email lands in <strong>Promotions</strong> or <strong>Spam</strong>,
                drag it to your main inbox so future digests land where they belong.
              </>
            }
          />
          <Card
            num="03"
            title="Want to unsubscribe?"
            body={
              <>
                Every email we send has a one-click unsubscribe link at the bottom.
                Or reply with the word <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface)", padding: "1px 6px" }}>stop</code> — that works too.
              </>
            }
          />
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/marketplace"
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
            Browse the marketplace
            <span style={{ fontFamily: "var(--font-mono)" }}>→</span>
          </Link>
          <Link
            href="/"
            style={{
              padding: "14px 22px",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--fg)",
              border: "1px solid var(--rule-strong)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

function Card({ num, title, body }) {
  return (
    <div
      style={{
        background: "var(--bg)",
        padding: "24px 28px",
        display: "grid",
        gridTemplateColumns: "60px 1fr",
        gap: 20,
        alignItems: "start",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          marginTop: 4,
        }}
      >
        {num}
      </span>
      <div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--fg)",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--fg)",
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
