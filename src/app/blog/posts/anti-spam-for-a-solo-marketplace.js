export const metadata = {
  title: "Anti-spam for a solo marketplace : 8 layers, zero captchas",
  excerpt:
    "I'm one person. The submit API can't survive a week of unauthenticated POSTs. Here's the 8-layer gate Versuz uses to keep the registry clean without ever showing a captcha — and the one layer I almost shipped that would have killed activation.",
  dateISO: "2026-05-08",
  tags: ["security", "product"],
  author: "Toma",
};

export function Body() {
  return (
    <>
      <p>
        Versuz lets anyone submit a SKILL.md or CLAUDE.md to the registry.
        The submit endpoint is open to anyone with a GitHub OAuth login.
        I&apos;m one person, working solo, with no ops team to babysit a
        spam wave.
      </p>

      <p>
        Here&apos;s the 8-layer anti-spam gate that&apos;s held for six weeks,
        through ~2,300 submissions, zero garbage in production. No
        captcha, no email verification beyond what GitHub does.
      </p>

      <h2>Layer 1 : GitHub OAuth, no exceptions</h2>

      <p>
        Every submit requires a GitHub-authenticated session OR a
        Personal Access Token (CLI path). The web flow uses Supabase Auth
        with GitHub as the only provider. No email/password login. No
        anonymous submits.
      </p>

      <p>
        This kills 99% of bot traffic. Bots don&apos;t do OAuth — the
        sign-in flow has a redirect handshake that most spam tooling
        can&apos;t script reliably. The 1% that can are doing something
        more deliberate than spam.
      </p>

      <h2>Layer 2 : owner-or-org-member only</h2>

      <p>
        You can only submit a SKILL.md from a repo you own or are a
        member of. The API checks{" "}
        <code>GET /repos/{`<owner>/<repo>`}/collaborators/{`<login>`}</code>{" "}
        against your GitHub identity. If the call returns 404, you don&apos;t
        own it, you can&apos;t submit it.
      </p>

      <p>
        This catches the most common abuse vector : people submitting
        other people&apos;s skills to claim ownership / hijack the listing.
        Even legitimate authors sometimes try to claim a fork or a mirror
        — the org-member check blocks it.
      </p>

      <h2>Layer 3 : strict URL regex</h2>

      <p>
        The repo URL must match{" "}
        <code>https://github.com/{`<owner>/<repo>`}</code> exactly. No{" "}
        <code>?tab=readme</code>, no{" "}
        <code>git@github.com:foo/bar.git</code>, no <code>/tree/main</code>
        suffixes. Parsing a polluted URL is the easiest place for{" "}
        attackers to hide a different intent. Strict regex, reject early.
      </p>

      <h2>Layer 4 : rate limit at the user level</h2>

      <p>
        5 submits per hour, per GitHub user, enforced via a{" "}
        <code>cli_submissions</code> tracker table (migration 0022). Not
        per IP — IP rotation is trivial. Per GitHub user, because
        creating a fresh GitHub account that gains submit eligibility
        requires email verification + waiting period.
      </p>

      <p>
        5/hour means a determined attacker creating 10 fresh accounts can
        do 50 submits/hour. That&apos;s manageable for a human reviewer
        and is detectable as a coordinated wave.
      </p>

      <h2>Layer 5 : 24h URL dedup</h2>

      <p>
        Same GitHub URL submitted twice within 24 hours by anyone = silent
        soft-success on the second call. Don&apos;t error (gives the
        attacker a signal), don&apos;t insert. This kills retry storms
        from misconfigured scrape bots that don&apos;t back off on{" "}
        <code>200 OK</code>.
      </p>

      <h2>Layer 6 : 200 KB content cap</h2>

      <p>
        The SKILL.md body is capped at 200 KB. The 99th-percentile real
        skill is 8 KB. Anyone trying to ship 50 MB of crap as a single{" "}
        SKILL.md gets a clean 413. The cap also kills accidental binary
        uploads (people pasting raw zip data into the form).
      </p>

      <h2>Layer 7 : free tier hardcoded</h2>

      <p>
        Until your account has{" "}
        <code>stripe_charges_enabled = true</code>, every submit is
        forced to <code>tier=free</code>. You can&apos;t put a $999 price
        on a skill from a brand-new GitHub account.
      </p>

      <p>
        This stops a specific attack : creator submits a high-priced
        garbage Premium item, hopes one buyer purchases by mistake, vanishes
        with the money. The Stripe Connect onboarding takes 5 minutes
        but requires real identity verification — at which point you&apos;re
        traceable.
      </p>

      <h2>Layer 8 : full audit trail</h2>

      <p>
        Every submit, accepted or rejected, writes a row to{" "}
        <code>cli_submissions</code> with the GitHub login, the URL, the
        outcome, the IP hash (truncated SHA-256), and the user-agent.
        I can scan the table any time I see something suspicious. I&apos;ve
        had to twice ; both times the audit trail let me clean up the
        damage in 10 minutes.
      </p>

      <h2>The layer I almost shipped</h2>

      <p>
        Original v0 design had a <strong>9th layer</strong> : email
        verification before first submit. The GitHub OAuth handshake
        already verified the email, but I wanted a Versuz-side
        confirmation step too.
      </p>

      <p>
        I A/B-tested it for a week. The activation drop was{" "}
        <strong>~40%</strong>. Almost half of authors who clicked
        &ldquo;Sign in with GitHub&rdquo; never clicked through the
        confirmation email. Probably half of those just lost the tab,
        but the other half decided submitting was too much work and
        bounced.
      </p>

      <p>
        I pulled the email confirm. The 1% of bad-faith submits that
        slip through the other 8 layers are still catchable by the audit
        trail. The 40% activation drop wasn&apos;t worth it.
      </p>

      <p>
        Lesson : every friction layer has a real cost. &ldquo;Security
        first&rdquo; is a slogan that gets people fired by founders who
        notice nobody signs up. The right question is &ldquo;what&apos;s
        the marginal abuse risk this layer prevents, and what&apos;s
        the marginal user it costs me ?&rdquo; — and you have to
        actually measure both.
      </p>

      <h2>What I&apos;d add next</h2>

      <ul>
        <li>
          <strong>Submit-time content lint.</strong> Reject SKILL.md
          missing the YAML frontmatter. Two-line check, would have
          stopped some legitimate-looking but malformed submissions
          early.
        </li>
        <li>
          <strong>Quality-score gate at 30.</strong> If the LLM
          quality-judge gives the item below 30/100, hold for manual
          review instead of publishing inline. Most fail-fast bots
          generate content that scores in the 15-25 range.
        </li>
        <li>
          <strong>Throttle by GitHub account age.</strong> Accounts
          younger than 30 days get 1 submit/hour instead of 5.
          Cheap, mostly invisible to real users, kills account-farm
          waves.
        </li>
      </ul>

      <p>
        None of this is fancy. None of this needs a CAPTCHA, a third-party
        anti-bot service, or a paid security tool. 8 cheap layers, each
        catching a different attack pattern, all logged. Solo-dev friendly,
        held for six weeks at 5,000+ submits.
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: "var(--fg-muted)" }}>
        Source on{" "}
        <a href="https://github.com/TomaTV/versuz" style={{ color: "var(--accent)" }}>GitHub</a>. Email me at{" "}
        <a href="mailto:contact@flukxstudio.fr" style={{ color: "var(--accent)" }}>contact@flukxstudio.fr</a>.
      </p>
    </>
  );
}
