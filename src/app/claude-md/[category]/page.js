import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { RankBadge } from "@/components/rank-badge";
import {
  getProjectCategories,
  getProjectCategoryIds,
  getCategoryRankings,
} from "@/lib/queries/rankings";
import { judgesLabel } from "@/lib/judges";

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cats = await getProjectCategories();
  const cat = cats.find((c) => c.id === category);
  return {
    title: `${cat?.label || category} CLAUDE.md leaderboard — Versuz`,
    description: `Top CLAUDE.md files for ${cat?.label || category} projects. Ranked by agent task uplift, judged by 3 frontier models.`,
  };
}

export default async function CategoryClaudeMdPage({ params }) {
  const { category } = await params;
  if (!getProjectCategoryIds().includes(category)) notFound();

  const [categories, files] = await Promise.all([
    getProjectCategories(),
    getCategoryRankings(category, "claude_md"),
  ]);
  const cat = categories.find((c) => c.id === category);

  return (
    <div>
      <PageHero
        eyebrow={`CLAUDE.md · ${cat?.label || category}`}
        title={
          files.length === 0 ? (
            <>
              No <em style={{ color: "var(--accent)" }}>scores</em> yet.
            </>
          ) : (
            <>
              Top CLAUDE.md for <em style={{ color: "var(--accent)" }}>{cat?.label || category}</em>.
            </>
          )
        }
        subtitle={
          files.length === 0
            ? `No bench cycle has scored ${cat?.label || category} CLAUDE.md files yet. ${cat?.count ?? 0} listed in the registry — once a cycle completes, the ranking will appear here.`
            : `${files.length} ranked. ${cat?.count || files.length} total in registry. Judged by ${judgesLabel()} on a held-out task suite for this project type.`
        }
        decoration={<CategoryHeroShapes />}
      />

      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 64px 120px" }}>
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
                  href={`/claude-md/${c.id}`}
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

        {files.length === 0 ? (
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
              <Link href={`/marketplace?type=claude-md&cat=${category}`} className="vz-link">
                /marketplace
              </Link>
              .
            </div>
          </div>
        ) : (
          <RevealStagger stagger={0.05} style={{ display: "flex", flexDirection: "column" }}>
            {files.map((file, i) => (
              <RevealItem key={file.slug}>
                <ClaudeMdRow file={file} leader={i === 0} />
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
            <Link href="/leaderboard?type=claude-md" className="vz-link">
              All categories <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function ClaudeMdRow({ file, leader = false }) {
  return (
    <Link
      href={`/claude-md/${file.project_category}/${file.slug}`}
      className="vz-skill-row"
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 110px 110px 80px",
        alignItems: "center",
        gap: 24,
        padding: "24px 0",
        width: "100%",
        textDecoration: "none",
        color: "inherit",
        borderTop: "1px solid var(--rule)",
        background: leader ? "var(--leader-tint)" : "transparent",
      }}
    >
      <RankBadge rank={file.rank} size="md" />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
            lineHeight: 1.05,
            fontStyle: file.rank === 1 ? "italic" : "normal",
          }}
        >
          {file.author}/{file.repo}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {file.word_count ? `~${Math.round(file.word_count * 1.3).toLocaleString()} tokens` : "—"} · {file.license}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Score
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--fg)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          {file.score?.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Elo
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--fg)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {file.elo}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color:
            file.delta > 0
              ? "var(--accent)"
              : file.delta < 0
                ? "var(--danger)"
                : "var(--fg-muted)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {file.delta > 0 ? "↗ +" : file.delta < 0 ? "↘ " : "— "}
        {file.delta !== 0 && Math.abs(file.delta)}
      </span>
    </Link>
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
          background: "var(--sage)",
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
