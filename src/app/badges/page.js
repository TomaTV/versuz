import Link from "next/link";
import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { CopyContentButton } from "@/components/copy-content-button";
import { getTopRankedItems, getTopAuthors } from "@/lib/queries/rankings";

/**
 * /badges — showcase + how-to for the 3 SVG badge endpoints.
 *
 * Why : the audit flagged that badges (item, author, category) are a
 * massive viral lever — every README that pastes one becomes a backlink +
 * organic discovery channel. The endpoints existed but no surface
 * encouraged use. This page is the missing CTA.
 *
 * Three sections :
 *   §01 Item badge — pick a slug, copy markdown
 *   §02 Author badge — pick a login, copy markdown
 *   §03 Category badge — pick a category, copy markdown
 * Plus FAQ on cache, variants, where to use.
 *
 * Variants Show=score|elo|prior|rank and Style=default|terminal are
 * documented inline so authors learn the URL surface organically.
 */

export const revalidate = 600;

export const metadata = {
  title: "Embeddable badges — show your Versuz rank anywhere",
  description:
    "Paste a Versuz SVG badge into your README, blog, Notion or Linear. Three endpoints — per-item, per-author, per-category. Updates live as rankings change.",
  alternates: { canonical: "/badges" },
  openGraph: {
    title: "Versuz · Embeddable badges",
    description:
      "Show your skill, author tier, or category rank on any README. SVG, free, live.",
    url: "/badges",
    type: "website",
  },
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

function buildItemMarkdown(kind, slug, name) {
  const url = `${BASE}/badge/${kind}/${slug}`;
  const detail = `${BASE}/${kind === "claude-md" ? "claude-md" : "skills"}/${slug}`;
  return `[![Versuz · ${name}](${url})](${detail})`;
}

function buildAuthorMarkdown(login) {
  const url = `${BASE}/badge/author/${login}`;
  const profile = `${BASE}/u/${login}`;
  return `[![Versuz · @${login}](${url})](${profile})`;
}

function buildCategoryMarkdown(kind, cat) {
  const url = `${BASE}/badge/category/${cat}?kind=${kind}`;
  const detail =
    kind === "skill" ? `${BASE}/standings/${cat}` : `${BASE}/claude-md/${cat}`;
  return `[![Versuz · ${cat}](${url})](${detail})`;
}

export default async function BadgesPage() {
  // Pick one real, well-ranked example per endpoint so the preview is
  // never blank. Falls back to placeholders if the DB is empty.
  const [topSkills, topAuthors] = await Promise.all([
    getTopRankedItems("skill", null, 1),
    getTopAuthors(1),
  ]);
  const exampleSkill = topSkills[0] || null;
  const exampleAuthor = topAuthors[0] || null;

  return (
    <div>
      <PageHero
        eyebrow="Badges"
        title={
          <>
            Show your <em style={{ color: "var(--accent)" }}>Versuz rank</em>{" "}
            on any README.
          </>
        }
        subtitle="Three SVG endpoints — item, author, category. Each one renders a live badge that updates as the bench engine cycles. Free, no auth, cached 24h at the edge. Paste the snippet and forget."
      />

      <Section eyebrow="§ 01 — Item badge" markerColor="var(--accent)" paddingY={64}>
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>One skill</em>, one badge.
            </>
          }
          subtitle="The most common embed — surface a specific skill's bench score on its source repo's README. The badge color reflects the tier (ember Premium, sage Featured), the right number defaults to the composite score."
        />
        {exampleSkill ? (
          <ExampleCard
            previewUrl={`/badge/skill/${exampleSkill.slug}`}
            snippet={buildItemMarkdown("skill", exampleSkill.slug, exampleSkill.name)}
            detailHref={`/skills/${exampleSkill.slug}`}
            captionLabel="Live example"
            captionName={exampleSkill.name}
          />
        ) : (
          <PlaceholderCard label="No skills indexed yet" />
        )}
        <VariantsTable
          rows={[
            { label: "?show=score", note: "Composite score 0-100 (default)" },
            { label: "?show=elo", note: "Bayesian Elo if benched" },
            { label: "?show=prior", note: "Quality prior 0-100" },
            { label: "?show=rank", note: "Position #N in its category" },
            { label: "?style=terminal", note: "Dark palette for dark READMEs" },
          ]}
        />
      </Section>

      <Section eyebrow="§ 02 — Author badge" markerColor="var(--azure)" paddingY={64}>
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>One author</em>, one tier badge.
            </>
          }
          subtitle="Renders the author's tier (Newcomer → Veteran) + their indexed contribution count. The tier color stripe matches the public profile page. Useful for personal sites, X bios, GitHub profile README."
        />
        {exampleAuthor ? (
          <ExampleCard
            previewUrl={`/badge/author/${exampleAuthor.login}`}
            snippet={buildAuthorMarkdown(exampleAuthor.login)}
            detailHref={`/u/${exampleAuthor.login}`}
            captionLabel="Live example"
            captionName={`@${exampleAuthor.login}`}
          />
        ) : (
          <PlaceholderCard label="No authors with contributions yet" />
        )}
      </Section>

      <Section eyebrow="§ 03 — Category badge" markerColor="var(--sage)" paddingY={64}>
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>One category</em>, one count.
            </>
          }
          subtitle="Show the size of a category's registry — e.g. on awesome-* lists, blog posts about SKILL.md collections, or methodology docs. The right column flips between 'INDEXED' (count only) and 'RANKED' (count + benched signal)."
        />
        <ExampleCard
          previewUrl={`/badge/category/sql?kind=skill`}
          snippet={buildCategoryMarkdown("skill", "sql")}
          detailHref={`/standings/sql`}
          captionLabel="Live example"
          captionName="SQL category"
        />
        <div
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.7,
          }}
        >
          Available categories — skills :{" "}
          <code>document · sql · data · web · shell · code · claude-skill · cursor-rule · mcp-server · …</code>{" "}
          (full list in{" "}
          <Link href="/marketplace" className="vz-link">
            /marketplace
          </Link>
          ). CLAUDE.md categories : <code>nextjs · react · python-data · backend-api · …</code>
        </div>
      </Section>

      <Section eyebrow="§ 04 — Where to use them" markerColor="var(--amber)" paddingY={64}>
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>Anywhere</em> markdown or SVG lands.
            </>
          }
        />
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <UseCase
            title="GitHub README"
            body="Paste the markdown snippet. It renders on the repo page + on the npm package page (for skills published as npm packages)."
          />
          <UseCase
            title="Notion / Linear / Confluence"
            body="Use the SVG URL directly in the image / embed block. The URL is stable, no token needed."
          />
          <UseCase
            title="Discord / Slack"
            body="Paste the URL — most chat clients unfurl it to inline preview. Use ?style=terminal for dark mode channels."
          />
          <UseCase
            title="Blog posts"
            body="HTML <img> tag or markdown image. Pair with a link to the detail page for traffic + context."
          />
        </div>
      </Section>

      <Section eyebrow="§ 05 — FAQ" markerColor="var(--accent)" paddingY={64}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 820,
          }}
        >
          <Faq
            q="How fresh is the score?"
            a="The bench engine cycles daily at 06:00 UTC. After a cycle, badges refresh within 24h (edge cache 1h, SWR 7d). If you need a faster refresh on your own README, append a cache-busting query like ?t=1 — but most readers won't care."
          />
          <Faq
            q="Is this rate-limited?"
            a="No per-IP limit. The endpoint is served from Vercel edge with aggressive caching, so even high-traffic READMEs cost us pennies. If you're embedding 100+ badges on a single page, ping us — we may rate-limit abusive bot scrapes."
          />
          <Faq
            q="Can I customize colors or fonts?"
            a="Two style variants today : default (light) and terminal (dark). Custom styles are part of the upcoming Pro Author tier — sign up for the waitlist on /pricing#pro-author to get early access."
          />
          <Faq
            q="What if my skill isn't ranked yet?"
            a="The item badge renders with the quality prior (LLM-rated 0-100) until the bench cycle ranks it. The right column shows 'PRIOR' instead of 'SCORE'. Once benched, it auto-flips."
          />
        </div>
      </Section>
    </div>
  );
}

function ExampleCard({ previewUrl, snippet, detailHref, captionLabel, captionName }) {
  return (
    <Reveal>
      <div
        style={{
          marginTop: 32,
          padding: "24px 24px",
          border: "1px solid var(--rule)",
          background: "var(--surface)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "center",
        }}
        className="vz-pricing-boost"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {captionLabel}
          </span>
          <Link
            href={detailHref}
            style={{
              display: "inline-block",
              maxWidth: "100%",
            }}
            aria-label={`Preview badge for ${captionName}`}
          >
            <img
              src={previewUrl}
              alt={`Versuz badge — ${captionName}`}
              width={420}
              height={62}
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
          </Link>
        </div>
        <div
          style={{
            position: "relative",
            background: "var(--ink)",
            color: "var(--bone)",
            padding: "14px 16px",
            paddingRight: 80,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
            wordBreak: "break-all",
          }}
        >
          {snippet}
          <CopyContentButton text={snippet} />
        </div>
      </div>
    </Reveal>
  );
}

function PlaceholderCard({ label }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: "48px 32px",
        border: "1px dashed var(--rule-strong, var(--rule))",
        textAlign: "center",
        color: "var(--fg-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </div>
  );
}

function VariantsTable({ rows }) {
  return (
    <div
      style={{
        marginTop: 24,
        border: "1px solid var(--rule)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          borderBottom: "1px solid var(--rule)",
          background: "var(--surface)",
        }}
      >
        Query string variants
      </div>
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr",
            gap: 16,
            padding: "10px 16px",
            borderTop: i === 0 ? "none" : "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          <code style={{ color: "var(--accent)" }}>{r.label}</code>
          <span style={{ color: "var(--fg-muted)" }}>{r.note}</span>
        </div>
      ))}
    </div>
  );
}

function UseCase({ title, body }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "16px 18px",
        border: "1px solid var(--rule)",
        background: "var(--bg)",
        height: "100%",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 17,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--fg-muted)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(18px, 2.2vw, 22px)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        {q}
      </h3>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-geist)",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--fg-muted)",
        }}
      >
        {a}
      </p>
    </div>
  );
}
