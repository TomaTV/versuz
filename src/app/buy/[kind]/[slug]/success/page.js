import Link from "next/link";
import { redirect } from "next/navigation";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { Section, PageHero } from "@/components/section";

export const metadata = { title: "Thanks — Versuz" };

export default async function CheckoutSuccessPage({ params, searchParams }) {
  const { kind: kindRaw, slug } = await params;
  const sp = (await searchParams) || {};
  const kind = kindRaw === "claude-md" ? "claude_md" : kindRaw;

  let session = null;
  if (isStripeConfigured() && sp.session_id) {
    try {
      const stripe = getStripe();
      session = await stripe.checkout.sessions.retrieve(sp.session_id);
    } catch (err) {
      console.warn(`[checkout-success] retrieve failed: ${err.message}`);
    }
  }

  if (!sp.session_id) {
    redirect(`/buy/${kindRaw}/${slug}`);
  }

  const amount = session?.amount_total ? (session.amount_total / 100).toFixed(2) : null;
  const status = session?.payment_status || "unknown";
  const paid = status === "paid";

  const detailHref =
    kind === "skill"
      ? `/skills/${slug}`
      : `/claude-md/generic/${slug}`;

  return (
    <div>
      <PageHero
        compact
        eyebrow="Order"
        title={
          paid ? (
            <>
              Thank <em style={{ color: "var(--accent)" }}>you</em>.
            </>
          ) : (
            <>Order received.</>
          )
        }
        subtitle={
          paid
            ? `Payment of $${amount || "—"} confirmed. The author has been notified and will receive 70% directly via Stripe.`
            : `Payment status: ${status}. If something looks off, check your email or contact support@versuz.dev.`
        }
      />

      <Section eyebrow="§ 01 — Receipt" markerColor="var(--accent)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
          className="vz-stat-grid"
        >
          <Cell label="Amount" value={amount ? `$${amount}` : "—"} />
          <Cell label="Status" value={status} color={paid ? "var(--sage)" : "var(--amber)"} />
          <Cell label="Session" value={(sp.session_id || "").slice(0, 16) + "…"} />
          <Cell label="Item" value={slug} />
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={detailHref}
            style={{
              padding: "14px 22px",
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            View item →
          </Link>
          <Link
            href="/marketplace"
            style={{
              padding: "14px 22px",
              border: "1px solid var(--rule-strong)",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Back to marketplace
          </Link>
        </div>
      </Section>

      {paid && (
        <Section eyebrow="§ 02 — What happens next" markerColor="var(--azure)" paddingY={48}>
          <ol
            style={{
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 720,
            }}
          >
            <NextStep
              n="1"
              title="Email receipt incoming"
              body="A branded receipt with your download link (signed URL, valid 7 days) hits your inbox in under a minute. Check spam if you don't see it."
            />
            <NextStep
              n="2"
              title="Premium content unlocked"
              body={
                <>
                  Click <em>View item →</em> above. The detail page now shows
                  the <strong>Premium download</strong> section with a fresh
                  signed URL on every load — bookmark the item, you can
                  re-download anytime.
                </>
              }
            />
            <NextStep
              n="3"
              title="Author gets paid 70%"
              body="Stripe routes 70% directly to the author's account (no manual payout). Versuz keeps 30% for hosting, curation, and bench engine costs."
            />
            <NextStep
              n="4"
              title="Refund window: 30 days"
              body={
                <>
                  Not happy? Email <a href="mailto:support@versuz.dev" style={{ color: "var(--accent)", borderBottom: "1px solid var(--accent)" }}>support@versuz.dev</a> within 30 days for a full refund. Your purchase shows up under <Link href="/profile" style={{ color: "var(--accent)", borderBottom: "1px solid var(--accent)" }}>/profile</Link>.
                </>
              }
            />
          </ol>
        </Section>
      )}
    </div>
  );
}

function NextStep({ n, title, body }) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 16,
        padding: "16px 18px",
        border: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          color: "var(--azure)",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
        }}
      >
        {n}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)", fontWeight: 500, letterSpacing: "-0.01em" }}>
          {title}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
          {body}
        </span>
      </div>
    </li>
  );
}

function Cell({ label, value, color }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 400,
          color: color || "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          wordBreak: "break-all",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}
