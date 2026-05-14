import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata = {
  title: "Terms of Service — Versuz",
  description: "The rules of using Versuz — the public benchmark and marketplace for AI agent skills.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="The rules of engagement for using Versuz. Read these before submitting, buying, or selling on the platform."
      lastUpdated="May 13, 2026"
    >
      <p>
        By accessing <a href="https://versuz.dev" className="vz-link">versuz.dev</a>, the
        <code> npx versuz</code> CLI, or the <code>@versuz/mcp</code> server, you agree to
        these Terms of Service. These terms may change — we&apos;ll notify subscribers by
        email on material updates.
      </p>

      <LegalSection id="service" title="1. What Versuz is">
        <p>
          Versuz is a public benchmark and marketplace for AI agent skills. We index
          publicly available <code>SKILL.md</code> and <code>CLAUDE.md</code> files
          (Claude Code, Codex, Cursor, MCP servers, etc.), rank them via a held-out task
          suite judged by three frontier LLMs, and surface them in a searchable
          marketplace with three tiers : free (scraped), premium (author-listed), and
          featured (Versuz first-party).
        </p>
      </LegalSection>

      <LegalSection id="account" title="2. Account">
        <ul>
          <li>Accounts are created via GitHub OAuth only.</li>
          <li>You must be at least 16 years old to create an account.</li>
          <li>One account per individual. No shared accounts.</li>
          <li>You are responsible for the activity under your account, including any submitted content or purchase.</li>
          <li>We may suspend or terminate accounts that violate these terms, without notice when necessary.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="3. Indexed content & ownership">
        <p>
          <strong>Free items</strong> are scraped from public GitHub repositories under fair
          use for indexing and benchmarking. We display attribution to the original
          author, link to the source repository, and capture the SPDX license when
          available. We treat copyleft licenses (GPL, AGPL, etc.) with caution and flag
          them visually.
        </p>
        <p>
          If you are the author of an indexed item and want it removed, email{" "}
          <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>{" "}
          with proof of ownership. We process takedowns within 7 days.
        </p>
        <p>
          <strong>Submitted items</strong> (via web or CLI) require GitHub PAT
          authentication and ownership verification (repo owner or org member). False
          ownership claims are grounds for account termination.
        </p>
      </LegalSection>

      <LegalSection id="commerce" title="4. Premium & Featured items">
        <ul>
          <li>Authors set their own prices for premium items.</li>
          <li>
            Versuz takes a 30% platform fee on every premium sale, processed automatically
            via Stripe Connect destination charges. Authors receive 70%.
          </li>
          <li>
            Featured items are Versuz first-party curation. Revenue goes 100% to Versuz.
          </li>
          <li>
            Premium licenses are per-buyer. You cannot resell, redistribute, or
            republish a premium item you purchased without explicit license from the
            author.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="refunds" title="5. Refunds & right of withdrawal">
        <p>
          We offer a <strong>30-day no-questions-asked refund policy</strong> on all
          premium purchases. See the <a href="/legal/refund" className="vz-link">Refund Policy</a>{" "}
          for the full procedure.
        </p>
        <p>
          <strong>EU consumers</strong> : digital goods are normally exempt from the
          14-day right of withdrawal under Article L221-28 13° of the French Consumer
          Code once download has begun. By clicking &quot;Buy now&quot;, you agree to
          immediate delivery and waive the statutory withdrawal right. Our 30-day policy
          remains in effect and is more generous.
        </p>
      </LegalSection>

      <LegalSection id="use" title="6. Acceptable use">
        <p>You may not :</p>
        <ul>
          <li>Submit illegal, harmful, infringing, or spam content.</li>
          <li>Claim ownership of content you did not author.</li>
          <li>Attempt to reverse-engineer bench scores or judge prompts to game rankings.</li>
          <li>Scrape Versuz outside the <code>robots.txt</code> rules or the documented JSON API.</li>
          <li>Use the platform to distribute malware or content that violates third-party rights.</li>
          <li>Buy premium items with the intent to redistribute them publicly.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rankings" title="7. Rankings & bench scores">
        <p>
          Rankings are produced by automated LLM-based evaluation against a held-out task
          suite. They are indicative, not authoritative. Versuz makes no guarantee of
          accuracy or fitness for purpose. Methodology is documented at{" "}
          <a href="/methodology" className="vz-link">/methodology</a>.
        </p>
      </LegalSection>

      <LegalSection id="disputes" title="8. Disputes & chargebacks">
        <p>
          If a buyer opens a Stripe dispute on a premium purchase, Versuz may freeze the
          seller&apos;s pending payouts until the dispute is resolved. Sellers are
          notified by email and can provide evidence via the Stripe Express dashboard.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Liability">
        <p>
          The service is provided &quot;as is&quot;. To the maximum extent permitted by
          applicable law, Versuz is not liable for damages arising from third-party
          SKILL.md / CLAUDE.md content, ranking inaccuracies, downtime, or data loss.
          Our aggregate liability is capped at the amount you paid Versuz in the 12
          months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="10. Termination">
        <p>
          You may delete your account at any time via{" "}
          <a href="/profile" className="vz-link">/profile</a> or by emailing{" "}
          <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>. We
          may suspend or terminate accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection id="law" title="11. Governing law">
        <p>
          These terms are governed by French law. Any dispute that cannot be resolved
          amicably will fall under the jurisdiction of the courts of Paris.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions about these terms : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
          See also the <a href="/legal/imprint" className="vz-link">Imprint</a> for legal entity details.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
