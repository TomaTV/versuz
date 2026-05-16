import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { SkillRow } from "@/components/skill-row";
import { NewsletterInline } from "@/components/newsletter-inline";
import {
  getRankableCategories,
  getProjectCategories,
  getTopRankedItems,
  getCurrentCycle,
} from "@/lib/queries/rankings";
import { judgesLabel, JUDGES } from "@/lib/judges";

/**
 * SEO long-tail pages — auto-generated for every (kind × category) tuple.
 * Targets queries like "best Claude SQL skill", "best Next.js CLAUDE.md",
 * "top Cursor rules for React", etc. The data is the same as
 * /standings/[category] and /claude-md/[category], but the framing is
 * search-optimized : H1 with "Best X", editorialized intro, FAQ block,
 * internal cross-links.
 *
 * Why a separate route instead of overloading /standings : different
 * intent (search-driven vs browse-driven), different headline framing,
 * room for a richer SEO body without bloating the existing pages.
 *
 * Indexed via sitemap.js at priority 0.8. ISR 1h — the leaderboard
 * itself revalidates every 5 min so we don't need this to be tighter.
 */

export const revalidate = 3600;

const KINDS = new Set(["skill", "claude-md"]);

function kindLabel(kind) {
  return kind === "skill" ? "SKILL.md" : "CLAUDE.md";
}

function kindNiceLabel(kind) {
  return kind === "skill" ? "Claude Code skill" : "CLAUDE.md project context";
}

async function loadCategories(kind) {
  return kind === "skill" ? getRankableCategories() : getProjectCategories();
}

export async function generateStaticParams() {
  const [skillCats, claudeCats] = await Promise.all([
    getRankableCategories(),
    getProjectCategories(),
  ]);
  const params = [];
  for (const c of skillCats) {
    if (!c.id || c.id === "all" || c.id === "other") continue;
    params.push({ kind: "skill", category: c.id });
  }
  for (const c of claudeCats) {
    if (!c.id || c.id === "all" || c.id === "other") continue;
    params.push({ kind: "claude-md", category: c.id });
  }
  return params;
}

export async function generateMetadata({ params }) {
  const { kind, category } = await params;
  if (!KINDS.has(kind)) return {};
  const cats = await loadCategories(kind);
  const cat = cats.find((c) => c.id === category);
  if (!cat) return {};
  const niceCat = cat.label || category;
  const niceKind = kindNiceLabel(kind);
  const title = `Best ${niceCat} ${niceKind}s · ranked by 3 AI judges`;
  const description = `The top ${niceCat} ${niceKind}s, ranked daily by three frontier LLM judges (${judgesLabel({ short: true })}). No stars, no hype — just measured performance on a held-out task suite.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/best/${kind}/${category}`,
    },
    openGraph: {
      title,
      description,
      url: `/best/${kind}/${category}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BestCategoryPage({ params }) {
  const { kind, category } = await params;
  if (!KINDS.has(kind)) notFound();

  const cats = await loadCategories(kind);
  const cat = cats.find((c) => c.id === category);
  if (!cat || cat.id === "all" || cat.id === "other") notFound();

  const dbKind = kind === "skill" ? "skill" : "claude_md";
  const [top10, cycle] = await Promise.all([
    getTopRankedItems(dbKind, category, 10),
    getCurrentCycle(),
  ]);

  const niceCat = cat.label || category;
  const niceKind = kindNiceLabel(kind);
  const browseHref = kind === "skill" ? `/standings/${category}` : `/claude-md/${category}`;
  const otherKindHref = kind === "skill" ? "claude-md" : "skill";

  const cycleNote = cycle
    ? cycle.status === "running"
      ? `Cycle #${cycle.id} in progress · live updates`
      : cycle.status === "completed"
        ? `Last cycle · #${cycle.id} completed`
        : null
    : null;

  // JSON-LD ItemList — helps Google render rich results for "best of" lists.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${niceCat} ${niceKind}s`,
    description: `Top ${niceCat} ${niceKind}s benchmarked and ranked by 3 LLM judges.`,
    numberOfItems: top10.length,
    itemListElement: top10.map((item, i) => {
      const itemUrl =
        kind === "skill"
          ? `/skills/${item.slug}`
          : `/claude-md/${item.project_category || "generic"}/${item.slug}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        url: itemUrl,
        name: item.name || item.slug,
      };
    }),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <PageHero
        eyebrow={`Best · ${niceCat}`}
        title={
          <>
            Best <em style={{ color: "var(--accent)" }}>{niceCat}</em> {niceKind}s.
          </>
        }
        subtitle={
          top10.length === 0
            ? `${niceCat} has ${cat.count ?? 0} ${niceKind}s indexed. The bench engine hasn't scored this category yet — once the next cycle completes, the ranking will appear here.`
            : `${top10.length} ${niceKind}s ranked by ${judgesLabel({ short: true })}. ${cycleNote ? cycleNote + "." : ""} Rankings refresh daily at 06:00 UTC. No stars, no hype — just measured performance.`
        }
      />

      <Section eyebrow="§ 01 — The top 10" markerColor="var(--accent)" paddingY={64}>
        {top10.length === 0 ? (
          <div
            style={{
              padding: "48px 32px",
              border: "1px dashed var(--rule-strong)",
              textAlign: "center",
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            No ranked items yet for {niceCat}.{" "}
            <Link
              href={browseHref}
              style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              Browse the unranked registry →
            </Link>
          </div>
        ) : (
          <RevealStagger
            stagger={0.04}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {top10.map((item, i) => (
              <RevealItem key={item.slug}>
                {kind === "skill" ? (
                  <SkillRow skill={item} leader={i === 0} />
                ) : (
                  <ClaudeMdRow item={item} rank={i + 1} leader={i === 0} />
                )}
              </RevealItem>
            ))}
          </RevealStagger>
        )}

        <Reveal delay={0.3}>
          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link
              href={browseHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: "var(--fg)",
                color: "var(--bg)",
                fontFamily: "var(--font-display)",
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Browse all {niceCat} {niceKind}s
              <span>→</span>
            </Link>
            <Link
              href="/methodology"
              style={{
                color: "var(--fg-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              How we rank ↓
            </Link>
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="§ 02 — How we rank" markerColor="var(--azure)" paddingY={64}>
        <SectionHeader
          title={
            <>
              <em style={{ color: "var(--accent)" }}>3 judges</em>. Same tasks. Daily.
            </>
          }
          subtitle="Every public SKILL.md and CLAUDE.md gets indexed, then run through a held-out task suite. Three frontier LLMs grade the outputs independently. The composite is a weighted average across five axes : instruction following, correctness, completeness, usefulness, and safety."
        />

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
          }}
        >
          {JUDGES.map((j) => (
            <div
              key={j.id}
              style={{
                padding: "20px 22px",
                border: "1px solid var(--rule)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 8, height: 8, background: j.color }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Judge
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  letterSpacing: "-0.01em",
                  color: "var(--fg)",
                }}
              >
                {j.label}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="§ 03 — FAQ" markerColor="var(--sage)" paddingY={64}>
        <SectionHeader
          title={
            <>
              About <em style={{ color: "var(--accent)" }}>{niceCat}</em> {niceKind}s.
            </>
          }
        />

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 28, maxWidth: 820 }}>
          <Faq
            q={`What is a ${niceCat} ${niceKind}?`}
            a={`A ${kindLabel(kind)} file that teaches an AI coding agent how to handle ${niceCat.toLowerCase()} tasks. ${kind === "skill" ? "It's a markdown file with a YAML frontmatter that Claude Code, Cursor, and Codex CLI can load on demand." : "It sits at the root of a project and gives the AI agent context about the codebase, conventions, and architecture."}`}
          />
          <Faq
            q="How are the rankings produced?"
            a="Three frontier LLM judges grade each item against the same task suite. Composite score is a weighted average across instruction following, correctness, completeness, usefulness, and safety. Updated every 24 hours."
          />
          <Faq
            q="Why not just rank by GitHub stars?"
            a="Stars measure popularity, not quality. A skill with 50k stars might be unmaintained ; a skill with 30 stars might smoke it on the actual task. Versuz measures the latter."
          />
          <Faq
            q={`Where can I find ${otherKindHref === "claude-md" ? "CLAUDE.md project contexts" : "SKILL.md files"}?`}
            a={
              <>
                Versuz indexes both. See the{" "}
                <Link
                  href={`/best/${otherKindHref}/${category}`}
                  style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
                >
                  best {otherKindHref === "claude-md" ? "CLAUDE.md" : "SKILL.md"} files for {niceCat}
                </Link>{" "}
                or browse the{" "}
                <Link
                  href="/marketplace"
                  style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
                >
                  full marketplace
                </Link>
                .
              </>
            }
          />
          <Faq
            q="Is this free?"
            a={
              <>
                The leaderboard, rankings, and methodology are free and open. Free items install via{" "}
                <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                  npx versuz install &lt;slug&gt;
                </code>
                . Some items are author-listed Premium (70/30 split) — those have a price tag on the card.
              </>
            }
          />
        </div>
      </Section>

      <Section eyebrow="§ 04 — Stay close" markerColor="var(--amber)" paddingY={64}>
        <div style={{ maxWidth: 560 }}>
          <NewsletterInline
            source="best-page"
            title={`Updates on ${niceCat}`}
            body={`Top movers, new entries, and ranking shifts in the ${niceCat} category. One email per week, no other noise.`}
          />
        </div>
      </Section>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(20px, 2.4vw, 26px)",
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
          fontSize: 15,
          lineHeight: 1.65,
          color: "var(--fg-muted)",
        }}
      >
        {a}
      </p>
    </div>
  );
}

function ClaudeMdRow({ item, rank, leader }) {
  // Simple inline row for CLAUDE.md items — we don't have a dedicated
  // ClaudeMdRow component yet, so render a compact version inline.
  const href = `/claude-md/${item.project_category || "generic"}/${item.slug}`;
  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        gap: 16,
        alignItems: "center",
        padding: "18px 20px",
        borderTop: "1px solid var(--rule)",
        color: "var(--fg)",
        textDecoration: "none",
        background: leader ? "var(--accent-soft, transparent)" : "transparent",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: leader ? "var(--accent)" : "var(--fg-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        #{rank}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name || item.slug}
        </span>
        {item.description && (
          <span
            style={{
              fontSize: 12,
              color: "var(--fg-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.description}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: leader ? "var(--accent)" : "var(--fg)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.benchScore != null ? Number(item.benchScore).toFixed(1) : "—"}
      </span>
    </Link>
  );
}
