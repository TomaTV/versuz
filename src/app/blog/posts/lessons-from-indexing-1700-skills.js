import Link from "next/link";

export const metadata = {
  title: "Lessons from indexing 1,700 Claude skills",
  excerpt:
    "GitHub Code Search misses 30% of what's out there. Sourcegraph misses different 30%. Here's what the Versuz scraper learned about the actual shape of the SKILL.md ecosystem.",
  dateISO: "2026-05-12",
  tags: ["engineering", "scraping"],
  author: "Toma",
};

export function Body() {
  return (
    <>
      <p>
        I built Versuz to answer one question : <em>of the 4,200 Claude
        skills on GitHub, which one actually works ?</em> But before you can
        rank skills, you have to find them. And finding them turned out to
        be the most expensive part of the whole project.
      </p>

      <p>
        Six weeks in, the registry holds ~5,200 indexed items — 2,590
        SKILL.md and 3,474 CLAUDE.md. Here&apos;s what the scrape pipeline
        learned along the way.
      </p>

      <h2>GitHub Code Search is half-blind</h2>

      <p>
        Every directory I looked at claimed to be using GitHub Code Search
        as their source. So did Versuz, version 0. Code Search is a great
        tool, but it has two hard limits :
      </p>

      <ul>
        <li>
          A single query returns at most <strong>1,000 results</strong>,
          no exceptions. <code>filename:SKILL.md</code> matches ~4,500
          files in May 2026 — Code Search shows you 1,000 of them.
        </li>
        <li>
          The ranking is opaque. Re-running the same query 24h later gives
          you a different set of 1,000 results. You can&apos;t paginate past
          it, you can&apos;t pin a result set.
        </li>
      </ul>

      <p>
        So our v0 indexing missed about 30% of what exists. Worse, it
        missed it <em>silently</em> — you can&apos;t see what you didn&apos;t
        find.
      </p>

      <h2>Sourcegraph misses a different 30%</h2>

      <p>
        Sourcegraph&apos;s public API exposes a stream endpoint that doesn&apos;t
        have the 1,000-result cap. Wired it up as a second adapter, found
        ~600 SKILL.md files Code Search had never surfaced.
      </p>

      <p>
        But Sourcegraph misses <em>different</em> things :
      </p>

      <ul>
        <li>
          Repositories that aren&apos;t in their index yet (typically{" "}
          {"<"}60 days old).
        </li>
        <li>
          Forks and mirrors (deliberate de-dup, which is mostly good but
          occasionally drops the canonical copy of a skill).
        </li>
        <li>
          Anything in private orgs that briefly went public — Sourcegraph
          indexes on a slower cadence.
        </li>
      </ul>

      <p>
        So we run both. 40-query expansion on each. <em>Then</em> we
        cross-check against the GitHub API for the canonical default
        branch on the way in, because monorepos love to break with
        <code>raw.githubusercontent.com/{`<repo>`}/main/SKILL.md</code> when
        their default is <code>master</code> or <code>trunk</code>.
      </p>

      <h2>The awesome-* lists are gold mines, but stale</h2>

      <p>
        14 awesome-* repos curate Claude skills, MCP servers, Cursor
        rules. Together they list ~800 unique items not findable by raw
        search — usually because the linked repo doesn&apos;t have SKILL.md
        in the conventional place, or has it nested in a folder.
      </p>

      <p>
        The catch : these lists are written by humans with day jobs.
        Links rot. The <code>awesome-cursorrules</code> README had 32
        dead links the day I scraped it. We treat aggregator finds as{" "}
        <em>suggestions</em> that need verification — does the linked
        SKILL.md still resolve ? Did the repo go private ? Did the
        author force-push and rewrite history ?
      </p>

      <h2>Content-hash dedup catches more than you&apos;d guess</h2>

      <p>
        Across 5,200 items, the SHA-256 dedup pass flagged <strong>~12% as
        duplicates</strong>. Most are forks of well-known skills (the
        Anthropic <code>skills</code> repo gets forked a lot). Some are
        re-uploads under different slugs by the same author trying to
        game search. A few were deliberate plagiarism — same SKILL.md,
        new author, no credit.
      </p>

      <p>
        We keep the version with the most stars. The fork count goes into
        metadata so we can surface &ldquo;X people forked this&rdquo; on
        the detail page later.
      </p>

      <h2>Classifying is harder than scraping</h2>

      <p>
        Once you have the SKILL.md, you need to bucket it : document /
        sql / data / web / shell / code / etc. My first version used a
        keyword regex. It was wrong about 18% of the time — skills get
        misclassified as &ldquo;code&rdquo; when they&apos;re really about
        SQL migrations, or as &ldquo;document&rdquo; when they&apos;re
        about web scraping that <em>happens</em> to mention PDFs.
      </p>

      <p>
        Replaced it with a multi-bucket classifier that scores against
        all 27 categories and returns every bucket scoring within 50% of
        the leader. A skill can now belong to two categories
        legitimately — <code>vz-stripe-connect</code> is both <code>code</code>
        and <code>api-integration</code>. The marketplace filter is
        multi-cat aware now, which means filtering by{" "}
        <code>api-integration</code> surfaces it even though its primary
        is <code>code</code>.
      </p>

      <h2>What you can&apos;t scrape</h2>

      <p>
        Two big sources Versuz still doesn&apos;t cover :
      </p>

      <ul>
        <li>
          <strong>npm packages</strong> shipping SKILL.md inside their
          tarball. The npm registry doesn&apos;t expose tarball contents
          for search. Some skills only exist there.
        </li>
        <li>
          <strong>Cursor / Codex marketplaces</strong>. Both have a
          submit-to-list flow that isn&apos;t scrape-friendly. We&apos;ll
          eventually add a manual ingest tier for these.
        </li>
      </ul>

      <p>
        If you publish a skill in either, you can already submit it to
        Versuz via <code>npx versuz submit &lt;url&gt;</code> — that
        bypasses the discovery layer entirely.
      </p>

      <h2>What I&apos;d do differently</h2>

      <p>
        Start with multi-token rotation from day one. GitHub Code Search
        rate-limits at 30 req/min per token. We have 5 tokens rotating
        now and can hammer 150 req/min without backoff — but it took two
        weekends of failed scrapes to get there. If you&apos;re building a
        scraper, design the rotation in before you write a single API
        call.
      </p>

      <p>
        Also : store everything raw, classify later. Versuz v0 ran the
        classifier inline during scrape. Then I had to re-classify the
        whole registry three times as the bucket list grew. Now scrape
        writes raw + a metadata pointer, and a separate
        <code>reclassify-all.mjs</code> job runs against the full
        dataset whenever the rules change. Cheaper, faster, way easier
        to debug.
      </p>

      <p>
        Indexing is the silent 80% of building a marketplace. Ranking is
        what people see, but discovery is what determines whether the
        ranking is useful.
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: "var(--fg-muted)" }}>
        — Toma, May 2026. Building{" "}
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 4 }}>Versuz</Link> in
        public. Reach me at{" "}
        <a href="mailto:contact@flukxstudio.fr" style={{ color: "var(--accent)" }}>contact@flukxstudio.fr</a>.
      </p>
    </>
  );
}
