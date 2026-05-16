import { createProAuthorCheckoutAction } from "@/lib/pro-author/checkout";

/**
 * ProAuthorSubscribe — live mode CTA, renders when
 * STRIPE_PRO_AUTHOR_PRICE_ID is set.
 *
 * Server component. The form action calls a server action that
 * creates a Stripe Checkout Session in subscription mode and
 * redirects the browser. No JS required on the client.
 */
export function ProAuthorSubscribe() {
  return (
    <form
      action={createProAuthorCheckoutAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button
        type="submit"
        style={{
          padding: "12px 22px",
          background: "var(--accent)",
          color: "var(--bg)",
          border: "none",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Subscribe — $9 / month →
      </button>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
          lineHeight: 1.5,
        }}
      >
        Stripe checkout · cancel anytime · 7-day refund if it&apos;s not for you.
      </span>
    </form>
  );
}
