import { PageHero } from "@/components/section";
import { MarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import {
  getPaginatedItems,
  getCategoryCounts,
  getAllRanksBySlug,
  getAvailableSources,
} from "@/lib/queries/rankings";
import { getCurrentUser } from "@/lib/auth/server";
import { getOwnedSlugs, getAuthoredSlugs } from "@/lib/purchases/server";

export const metadata = {
  title: "Marketplace — Versuz",
  description:
    "Browse the full Versuz registry: free SKILL.md and CLAUDE.md verified, plus premium expert items. Filter by tier, category, verification level. Instant client-side filtering.",
};

export const revalidate = 60;

export default async function MarketplacePage({ searchParams }) {
  const params = (await searchParams) || {};
  const type = params.type === "claude-md" ? "claude-md" : "skills";
  const kind = type === "claude-md" ? "claude_md" : "skill";

  const user = await getCurrentUser();
  const [result, skillCats, claudeCats, owned, authored, ranks, availableSources] = await Promise.all([
    getPaginatedItems(kind, params),
    getCategoryCounts("skill"),
    getCategoryCounts("claude_md"),
    getOwnedSlugs(user?.id),
    getAuthoredSlugs(user?.id),
    getAllRanksBySlug(),
    getAvailableSources(kind),
  ]);

  // Stamp bench ranks onto items
  function stampRank(item, k) {
    const key = `${k}:${item.slug}`;
    const hit = ranks[key];
    return hit ? { ...item, rank: hit.rank, avgScore: hit.avg_score } : item;
  }
  const items = result.items.map((it) => stampRank(it, kind === "skill" ? "skill" : "claude_md"));

  return (
    <div>
      <PageHero
        eyebrow="Marketplace"
        title={
          <>
            Browse <em style={{ color: "var(--accent)" }}>everything</em>.
          </>
        }
        subtitle="The full Versuz registry — free verified SKILL.md and CLAUDE.md, plus premium expert items. Filter and sort instantly. Top-ranked items get the leaderboard badge once judging runs."
        decoration={<MarketHeroShapes />}
      />

      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)" }}>
        <MarketplaceGrid
          items={items}
          totalCount={result.total}
          currentPage={result.page}
          totalPages={result.totalPages}
          skillCategories={skillCats}
          projectCategories={claudeCats}
          availableSources={availableSources}
          ownedSkillSlugs={Array.from(owned.skills)}
          ownedClaudeMdSlugs={Array.from(owned.claudeMds)}
          authoredSkillSlugs={Array.from(authored.skills)}
          authoredClaudeMdSlugs={Array.from(authored.claudeMds)}
          initial={params}
        />

        <p
          style={{
            marginTop: 40,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            maxWidth: 760,
          }}
        >
          Free items are scraped from public GitHub and verified progressively (claimed →
          verified → reviewed → featured). Premium items are author-listed at a fixed price
          (Versuz takes 30%, author keeps 70%). Featured items are Versuz first-party
          curation.
        </p>
      </section>
    </div>
  );
}

function MarketHeroShapes() {
  return (
    <div
      aria-hidden
      className="vz-hero-decoration"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <span
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -160,
          top: 80,
          width: 280,
          height: 280,
          background: "var(--azure)",
        }}
      />
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{ position: "absolute", right: 200, top: 100, transform: "rotate(8deg)" }}
      >
        <path d="M 40 6 L 74 74 L 6 74 Z" fill="var(--amber)" />
      </svg>
      <span
        style={{
          position: "absolute",
          left: 32,
          top: 160,
          width: 4,
          height: 140,
          background: "var(--accent)",
        }}
      />
    </div>
  );
}
