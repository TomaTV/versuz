import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { SkillRow } from "@/components/skill-row";
import {
  getCategoryIds,
  getRankableCategories,
  getCategoryRankings,
} from "@/lib/queries/rankings";

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cats = await getRankableCategories();
  const cat = cats.find((c) => c.id === category);
  return {
    title: `${cat?.label || category} leaderboard — Versuz`,
    description: `Top AI agent skills in the ${cat?.label || category} category. Ranked by Bayesian Elo, judged by 3 frontier models. Updated every 24 hours.`,
  };
}

export default async function CategoryStandingsPage({ params }) {
  const { category } = await params;
  if (!getCategoryIds().includes(category) || category === "all") notFound();

  const [categories, ranked] = await Promise.all([
    getRankableCategories(),
    getCategoryRankings(category, "skill"),
  ]);
  const cat = categories.find((c) => c.id === category);
  const skills = ranked;

  return (
    <div>
      <PageHero
        eyebrow={`Leaderboard · ${cat?.label || category}`}
        title={
          skills.length === 0 ? (
            <>
              No <em style={{ color: "var(--accent)" }}>scores</em> yet.
            </>
          ) : (
            <>
              Top in <em style={{ color: "var(--accent)" }}>{cat?.label || category}</em>.
            </>
          )
        }
        subtitle={
          skills.length === 0
            ? `No bench cycle has scored ${cat?.label || category} yet. ${cat?.count ?? 0} skills are listed in the registry — once a cycle completes, the ranking will appear here.`
            : `${skills.length} skills ranked. ${cat?.count || skills.length} total in registry. Updated every 24 hours.`
        }
        decoration={<CategoryHeroShapes />}
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "40px 64px 120px",
        }}
      >
        {/* Category pills */}
        <Reveal delay={0.1}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            {categories.map((c) => {
              const active = c.id === category;
              return (
                <Link
                  key={c.id}
                  href={`/standings/${c.id}`}
                  className="vz-cat-pill"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: active ? "var(--bg)" : "var(--fg-muted)",
                    background: active ? "var(--fg)" : "transparent",
                    border: active ? "1px solid var(--fg)" : "1px solid var(--rule)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    padding: "8px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "color .15s ease, background .15s ease, border-color .15s ease",
                  }}
                >
                  {c.label}
                  <span style={{ opacity: 0.6 }}>{c.count}</span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {skills.length === 0 ? (
          <div
            style={{
              padding: "80px 32px",
              textAlign: "center",
              borderTop: "1px solid var(--rule-strong)",
              borderBottom: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            No ratings yet for this category.
            <div style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)" }}>
              Browse the {cat?.count ?? 0} unranked items on{" "}
              <Link href={`/marketplace?type=skills&cat=${category}`} className="vz-link">
                /marketplace
              </Link>
              .
            </div>
          </div>
        ) : (
          <RevealStagger
            stagger={0.04}
            amount={0.05}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {skills.map((skill, i) => (
              <RevealItem key={skill.slug}>
                <SkillRow skill={skill} leader={i === 0} />
              </RevealItem>
            ))}
          </RevealStagger>
        )}

        <Reveal delay={0.2}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 16,
              marginTop: 32,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
            }}
          >
            <Link href="/leaderboard" className="vz-link">
              All categories <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function CategoryHeroShapes() {
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
          right: -120,
          top: 60,
          width: 240,
          height: 240,
          background: "var(--azure)",
        }}
      />
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
