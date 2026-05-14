import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata = {
  title: "Refund Policy — Versuz",
  description: "30-day no-questions-asked refund policy for all premium purchases on Versuz.",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle="30 days, no questions asked. Here's how it works."
      lastUpdated="May 13, 2026"
    >
      <p>
        Versuz offers a <strong>30-day no-questions-asked refund</strong> on every
        premium purchase. We&apos;d rather you keep buying than feel stuck with
        something that doesn&apos;t fit.
      </p>

      <LegalSection id="how" title="1. How to request a refund">
        <ol>
          <li>
            Email <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>{" "}
            with your Stripe Payment Intent ID (you&apos;ll find it in your purchase
            receipt email, format <code>pi_xxx</code>).
          </li>
          <li>Optional — tell us why, so we can improve. Not required.</li>
          <li>
            We initiate the refund within 24 hours (business days). Stripe processes the
            credit back to your card within 5-10 business days.
          </li>
          <li>You&apos;ll receive a confirmation email from both Versuz and Stripe.</li>
        </ol>
      </LegalSection>

      <LegalSection id="automatic" title="2. Cases where we refund automatically">
        <p>You don&apos;t need to ask if :</p>
        <ul>
          <li>The downloaded SKILL.md / CLAUDE.md is corrupted or empty.</li>
          <li>The author removes the item from Versuz within 7 days of your purchase.</li>
          <li>You were charged twice for the same item (double-charge bug).</li>
          <li>Stripe flags the transaction as fraudulent.</li>
        </ul>
      </LegalSection>

      <LegalSection id="exceptions" title="3. When we cannot refund">
        <ul>
          <li>Beyond 30 days after the purchase date.</li>
          <li>
            If you have publicly redistributed the premium content in violation of its
            license — we may also pursue further action in that case.
          </li>
          <li>Chargebacks initiated through your bank without contacting us first will be defended via Stripe&apos;s dispute process.</li>
        </ul>
      </LegalSection>

      <LegalSection id="impact" title="4. Impact on sellers & platform fees">
        <p>
          When a refund is granted :
        </p>
        <ul>
          <li>The seller receives <strong>zero</strong> revenue on the refunded transaction.</li>
          <li>The platform fee (30%) is reversed — Versuz keeps nothing either.</li>
          <li>The transaction is fully unwound on both sides.</li>
        </ul>
      </LegalSection>

      <LegalSection id="eu" title="5. EU right of withdrawal">
        <p>
          EU consumers normally have a 14-day right of withdrawal on online purchases
          under Directive 2011/83/EU. For digital goods, this right is waived once
          download has begun (Article 16(m) of the Directive, transposed in French law
          as Article L221-28 13° of the Code de la Consommation). By clicking
          &quot;Buy now&quot;, you agree to immediate delivery and waive the statutory
          14-day right.
        </p>
        <p>
          Our voluntary <strong>30-day policy applies regardless</strong> and is more
          generous than the statutory minimum.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="6. Contact">
        <p>
          Refund requests : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
          General questions : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
