import { LegalPage, LegalSection } from "../_components/legal-page";

export const metadata = {
  title: "DMCA & Takedown — Versuz",
  description: "How to request the removal of copyrighted content from Versuz.",
};

export default function DmcaPage() {
  return (
    <LegalPage
      title="DMCA & Takedown"
      subtitle="If we indexed content that infringes your copyright, file a takedown notice and we'll act within 24 hours."
      lastUpdated="May 13, 2026"
    >
      <p>
        Versuz indexes publicly available <code>SKILL.md</code> and <code>CLAUDE.md</code>{" "}
        files from GitHub under fair use for benchmarking purposes. If you are the
        copyright holder and want a specific item removed, this is the process.
      </p>

      <LegalSection id="notice" title="1. How to file a takedown notice">
        <p>
          Email <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>{" "}
          with the subject line &quot;DMCA Takedown — [item slug]&quot; and include :
        </p>
        <ol>
          <li>
            <strong>Identification of the work</strong> : the Versuz URL (e.g.
            <code>https://versuz.dev/skills/your-slug</code>) <em>and</em> the original
            source URL (GitHub repo, your own site).
          </li>
          <li>
            <strong>Proof of ownership</strong> : a link to the original source where
            your copyright is established (commits with your authorship, registration,
            license header with your name), OR a copy of the registered copyright, OR
            another verifiable proof.
          </li>
          <li>
            <strong>Your contact information</strong> : full legal name, email, mailing
            address, phone number.
          </li>
          <li>
            <strong>Good faith statement</strong> : &quot;I have a good faith belief that
            the use of the material in the manner complained of is not authorized by the
            copyright owner, its agent, or the law.&quot;
          </li>
          <li>
            <strong>Accuracy statement</strong> : &quot;The information in this
            notification is accurate, and under penalty of perjury, I am the owner or
            authorized to act on behalf of the owner of the copyright that is allegedly
            infringed.&quot;
          </li>
          <li><strong>Your signature</strong> (electronic signature accepted).</li>
        </ol>
      </LegalSection>

      <LegalSection id="process" title="2. What we do next">
        <ul>
          <li>We acknowledge your notice within 24 hours (business days).</li>
          <li>
            We verify the claim — usually by checking the GitHub repository, commit
            history, and any license file. This takes 1-3 days.
          </li>
          <li>
            If the claim is valid, we remove the item from Versuz (it disappears from
            the marketplace, leaderboard, sitemap, and API).
          </li>
          <li>We email you to confirm the removal.</li>
        </ul>
      </LegalSection>

      <LegalSection id="counter" title="3. Counter-notice">
        <p>
          If you are an author whose content was removed and you believe the takedown
          was made in error, you can file a counter-notice at the same address. We will
          forward your counter-notice to the original claimant and restore the content
          if the original claimant does not file legal proceedings within 10 business
          days.
        </p>
        <p>A valid counter-notice must contain :</p>
        <ul>
          <li>Identification of the removed content.</li>
          <li>
            A statement under penalty of perjury that you believe the removal was a
            mistake or misidentification.
          </li>
          <li>Your full name, address, phone number, and email.</li>
          <li>Your consent to the jurisdiction of the courts of Paris, France.</li>
          <li>Your signature.</li>
        </ul>
      </LegalSection>

      <LegalSection id="abuse" title="4. Repeat infringers & abuse">
        <p>
          We will terminate the account of any user who is the subject of repeated
          valid DMCA notices. Conversely, bad-faith DMCA notices (knowingly false
          claims) may be reported to the relevant authorities and can result in legal
          liability under 17 U.S.C. § 512(f) or equivalent EU law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="5. Designated agent">
        <p>
          Versuz does not operate under US-only law and does not have a registered DMCA
          agent with the US Copyright Office. We treat takedown notices under both DMCA
          standards and EU copyright directives (notably Directive 2019/790). Email all
          notices to <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
