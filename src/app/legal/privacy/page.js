import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata = {
  title: "Privacy Policy — Versuz",
  description: "What data Versuz collects, where it lives, and your GDPR rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="What we collect, where it lives, and how you exercise your GDPR rights. No tracking, no marketing cookies, no third-party analytics."
      lastUpdated="May 13, 2026"
    >
      <p>
        Versuz is a solo project operated from France. We comply with the EU General Data
        Protection Regulation (GDPR) and the French Data Protection Act (Loi Informatique
        et Libertés). This policy explains what data we collect, why, and how you control
        it.
      </p>

      <LegalSection id="data" title="1. What we collect">
        <p>
          <strong>Authentication data</strong>{" "}
          (when you sign in with GitHub via Supabase Auth) :
        </p>
        <ul>
          <li>GitHub username and numeric user ID</li>
          <li>Email associated with your GitHub account</li>
          <li>Avatar URL (public)</li>
        </ul>
        <p>
          <strong>Purchase data</strong> (only if you buy a premium item) :
        </p>
        <ul>
          <li>Stripe Payment Intent ID, amount, currency, status, timestamp</li>
          <li>Buyer profile reference (your Versuz user ID)</li>
          <li>
            We <strong>never</strong> see or store your card details — Stripe handles
            those entirely on PCI-DSS-compliant infrastructure.
          </li>
        </ul>
        <p>
          <strong>Seller data</strong> (only if you activate Stripe Connect to sell) :
        </p>
        <ul>
          <li>Stripe Connect account ID</li>
          <li>
            Charges-enabled status, payouts-enabled status (binary flags, not financial
            data)
          </li>
        </ul>
        <p>
          <strong>CLI submission audit</strong> (only if you publish via{" "}
          <code>npx versuz submit</code>) :
        </p>
        <ul>
          <li>GitHub user ID</li>
          <li>Submitted URL, action (success / duplicate / rejected)</li>
          <li>Timestamp</li>
        </ul>
        <p>
          <strong>Newsletter</strong> (only if you subscribe via the footer) :
        </p>
        <ul>
          <li>Email address</li>
          <li>Subscription date</li>
          <li>Unsubscribe token</li>
        </ul>
      </LegalSection>

      <LegalSection id="purpose" title="2. Why we collect it">
        <ul>
          <li>
            <strong>Account / Auth</strong> : let you sign in, claim ownership of skills
            you authored, manage your profile. Legal basis : <em>performance of contract</em>.
          </li>
          <li>
            <strong>Purchases</strong> : process payments, deliver download links,
            generate receipts. Legal basis : <em>performance of contract</em>.
          </li>
          <li>
            <strong>CLI audit</strong> : prevent spam / abuse / impersonation. Legal
            basis : <em>legitimate interest</em>.
          </li>
          <li>
            <strong>Newsletter</strong> : send weekly digest. Legal basis : <em>consent</em>{" "}
            (opt-in via footer form, unsubscribe link in every email).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="storage" title="3. Where it lives">
        <ul>
          <li>
            <strong>Database</strong> : Supabase, EU region (Frankfurt, Germany). Data is
            encrypted at rest and in transit.
          </li>
          <li>
            <strong>Payment processing</strong> : Stripe Inc. (USA, with EU data
            processing addendum). See <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="vz-link">Stripe&apos;s privacy policy ↗</a>.
          </li>
          <li>
            <strong>Email delivery</strong> : Resend (USA, with EU data processing
            addendum). See <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="vz-link">Resend&apos;s privacy policy ↗</a>.
          </li>
          <li>
            <strong>Hosting</strong> : Vercel Inc. (USA, with EU edge network). See{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="vz-link">Vercel&apos;s privacy policy ↗</a>.
          </li>
        </ul>
        <p>
          Transfers to the US are covered by the <strong>EU-US Data Privacy Framework</strong>{" "}
          and Standard Contractual Clauses where applicable.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="4. How long we keep it">
        <ul>
          <li><strong>Account data</strong> : as long as your account exists, plus 1 year of inactivity, then purged.</li>
          <li><strong>Purchase data</strong> : 10 years (French accounting / tax requirement).</li>
          <li><strong>CLI audit logs</strong> : 30 days, then anonymised (GitHub ID nulled, keep aggregate stats).</li>
          <li><strong>Newsletter</strong> : until you unsubscribe.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies & tracking">
        <p>
          Versuz uses <strong>only essential cookies</strong> required for
          authentication (Supabase session token, GitHub OAuth state).
        </p>
        <ul>
          <li>No Google Analytics</li>
          <li>No Facebook Pixel</li>
          <li>No marketing or advertising cookies</li>
          <li>No third-party tracking scripts</li>
        </ul>
        <p>
          We do not need a cookie consent banner because we do not set any non-essential
          cookies. If we ever add analytics, we will use a privacy-respecting,
          cookieless tool (Plausible, Umami) and update this policy.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="6. Your GDPR rights">
        <p>You can exercise all the following rights by emailing <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a> :</p>
        <ul>
          <li><strong>Right of access</strong> : we send you a JSON export of all data we hold about you, within 30 days.</li>
          <li><strong>Right to rectification</strong> : we correct any inaccurate data.</li>
          <li><strong>Right to erasure</strong> : we delete your account and all associated data within 30 days, except where retention is legally required (purchase records).</li>
          <li><strong>Right to portability</strong> : your data is exported in machine-readable JSON.</li>
          <li><strong>Right to object</strong> : you can opt out of newsletter, audit logging (within technical constraints), or any non-essential processing.</li>
          <li><strong>Right to lodge a complaint</strong> : with the CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="vz-link">cnil.fr ↗</a>) if you believe we mishandle your data.</li>
        </ul>
      </LegalSection>

      <LegalSection id="dpo" title="7. Data Protection Officer">
        <p>
          Versuz is a solo project and is not required to appoint a formal DPO under
          GDPR Article 37. Privacy questions and rights requests are handled directly by
          the founder at <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
        </p>
      </LegalSection>

      <LegalSection id="breach" title="8. Data breach notification">
        <p>
          If we become aware of a data breach affecting your personal data, we will
          notify you and the CNIL within 72 hours, as required by GDPR Article 33-34.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact">
        <p>
          <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>{" "}
          for all privacy questions or requests. See the{" "}
          <a href="/legal/imprint" className="vz-link">Imprint</a> for legal entity
          details.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
