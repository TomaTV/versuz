import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata = {
  title: "Imprint — Versuz",
  description: "Legal entity, publisher, and hosting information for Versuz (versuz.dev).",
};

export default function ImprintPage() {
  return (
    <LegalPage
      title="Imprint"
      subtitle="Legal notice (mentions légales) required by French law for online services."
      lastUpdated="May 13, 2026"
    >
      <p>
        In compliance with Article 6 of Law No. 2004-575 of June 21, 2004 (LCEN —
        French Confidence in the Digital Economy Act), Versuz publishes the following
        information.
      </p>

      <LegalSection id="publisher" title="1. Publisher">
        <ul>
          <li><strong>Service name</strong> : Versuz</li>
          <li><strong>Operated by</strong> : Flukx Studio</li>
          <li><strong>Legal form</strong> : Entrepreneur individuel (sole entrepreneur)</li>
          <li><strong>Operator</strong> : Thomas Devulder</li>
          <li><strong>SIREN</strong> : 934 170 093</li>
          <li><strong>SIRET</strong> : 934 170 093 00017</li>
          <li><strong>APE / NAF</strong> : 6201Z — Programmation informatique</li>
          <li><strong>VAT number</strong> : FR65934170093</li>
          <li><strong>Email</strong> : <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a></li>
          <li><strong>Director of publication</strong> : Thomas Devulder</li>
        </ul>
      </LegalSection>

      <LegalSection id="hosting" title="2. Hosting">
        <p>
          <strong>Web application</strong> :
        </p>
        <ul>
          <li>Vercel Inc.</li>
          <li>440 N Barranca Avenue #4133</li>
          <li>Covina, CA 91723, USA</li>
          <li>Website : <a href="https://vercel.com" target="_blank" rel="noreferrer" className="vz-link">vercel.com</a></li>
        </ul>
        <p>
          <strong>Database & file storage</strong> :
        </p>
        <ul>
          <li>Supabase Inc.</li>
          <li>EU region : Frankfurt, Germany</li>
          <li>Website : <a href="https://supabase.com" target="_blank" rel="noreferrer" className="vz-link">supabase.com</a></li>
        </ul>
        <p>
          <strong>Payment processing</strong> :
        </p>
        <ul>
          <li>Stripe Payments Europe Ltd.</li>
          <li>1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Ireland</li>
          <li>Website : <a href="https://stripe.com" target="_blank" rel="noreferrer" className="vz-link">stripe.com</a></li>
        </ul>
        <p>
          <strong>Email delivery</strong> :
        </p>
        <ul>
          <li>Resend (Resend, Inc.)</li>
          <li>USA, with EU data processing addendum</li>
          <li>Website : <a href="https://resend.com" target="_blank" rel="noreferrer" className="vz-link">resend.com</a></li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="3. Intellectual property">
        <p>
          The Versuz code, design system, brand assets (logo, wordmark, color palette),
          ranking methodology, and editorial content are © Versuz 2026, all rights
          reserved. Code published on GitHub is licensed under MIT.
        </p>
        <p>
          Indexed <code>SKILL.md</code> and <code>CLAUDE.md</code> files remain the
          property of their respective authors and are displayed under fair use for
          indexing and benchmarking purposes. Each indexed item links back to its
          original source and preserves its SPDX license when available.
        </p>
        <p>
          To request the removal of content you authored, see the{" "}
          <a href="/legal/dmca" className="vz-link">DMCA & Takedown</a> page.
        </p>
      </LegalSection>

      <LegalSection id="data" title="4. Personal data">
        <p>
          For information about personal data processing, see the{" "}
          <a href="/legal/privacy" className="vz-link">Privacy Policy</a>. Versuz is the
          data controller for personal data collected via the website, CLI, and MCP
          server.
        </p>
        <p>
          You can lodge a complaint with the CNIL (French Data Protection Authority) at{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="vz-link">cnil.fr ↗</a>.
        </p>
      </LegalSection>

      <LegalSection id="report" title="5. Report illegal content">
        <p>
          To report content that you believe violates French law (defamation,
          incitement to hatred, child protection, terrorism, copyright infringement,
          etc.), email <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>{" "}
          with details. We respond within 24 hours and act within the timeframe required
          by LCEN.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="6. Limitation of liability">
        <p>
          As a hosting provider for user-submitted content (premium items, claims) and
          an indexer of third-party public content (free items scraped from GitHub),
          Versuz benefits from the limited liability regime under Article 6-I-2 of
          LCEN. We do not pre-moderate content but act promptly on reports.
        </p>
      </LegalSection>

      <LegalSection id="law" title="7. Governing law & jurisdiction">
        <p>
          The Versuz website and all related services are governed by French law. Any
          dispute will be brought before the competent courts of Paris, France, unless
          otherwise required by mandatory consumer protection law.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
