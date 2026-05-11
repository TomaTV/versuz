import Link from "next/link";
import { redirect } from "next/navigation";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { Section, PageHero } from "@/components/section";

export const metadata = { title: "Boosted — Versuz" };

export default async function PromoteSuccessPage({ params, searchParams }) {
  const { kind: kindRaw, slug } = await params;
  const sp = (await searchParams) || {};
  const kind = kindRaw === "claude-md" ? "claude_md" : kindRaw;

  if (!sp.session_id) {
    redirect(`/promote/${kindRaw}/${slug}`);
  }

  let session = null;
  if (isStripeConfigured()) {
    try {
      const stripe = getStripe();
      session = await stripe.checkout.sessions.retrieve(sp.session_id);
    } catch (err) {
      console.warn(`[promote-success] retrieve failed: ${err.message}`);
    }
  }

  const amount = session?.amount_total ? (session.amount_total / 100).toFixed(2) : null;
  const status = session?.payment_status || "unknown";
  const paid = status === "paid";

  const detailHref =
    kind === "skill" ? `/skills/${slug}` : `/claude-md/generic/${slug}`;

  return (
    <div>
      <PageHero
        compact
        eyebrow="Boost"
        title={
          paid ? (
            <>
              <em style={{ color: "var(--accent)" }}>Boosted</em>.
            </>
          ) : (
            <>Order received.</>
          )
        }
        subtitle={
          paid
            ? `Your boost is now active. The item shows the BOOSTED pill on /marketplace and jumps to the top of its category.`
            : `Payment status: ${status}. If something looks off, check your email or contact support.`
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
          <Cell label="Item" value={slug} />
          <Cell label="Type" value={kind === "skill" ? "Skill" : "CLAUDE.md"} />
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
    </div>
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
