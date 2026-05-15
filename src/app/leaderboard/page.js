import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { JudgePanel } from "@/components/judge-panel";
import {
  getAllRankings,
  getLeaderboardCategories,
  getJudgeLifetimeStats,
} from "@/lib/queries/rankings";

// Avant : `revalidate = 300`. Caching maintenant déclaré via `'use cache'`
// + `cacheLife()` à l'intérieur des helpers de `src/lib/queries/rankings.js`
// (cacheComponents:true Next 16.2).
export const metadata = {
  title: "Leaderboard — Versuz",
  description:
    "Ranked AI agent skills and CLAUDE.md project context files. Judged by 3 frontier LLMs on a held-out task suite. Updated every 24 hours.",
};

const TYPES = {
  skills: { label: "Skills", kind: "skill" },
  "claude-md": { label: "CLAUDE.md", kind: "claude_md" },
};

export default async function LeaderboardPage({ searchParams }) {
  const params = (await searchParams) || {};
  const requestedType = params.type === "claude-md" ? "claude-md" : "skills";
  const selectedCategory = params.category || null;
  const config = TYPES[requestedType];

  const [allSkills, allClaudeMd, skillCats, claudeMdCats, judgeStats] = await Promise.all([
    requestedType === "skills" ? getAllRankings("skill") : Promise.resolve([]),
    requestedType === "claude-md" ? getAllRankings("claude_md") : Promise.resolve([]),
    getLeaderboardCategories("skill"),
    getLeaderboardCategories("claude_md"),
    getJudgeLifetimeStats(),
  ]);
  const allRanked = requestedType === "skills" ? allSkills : allClaudeMd;
  const categories = requestedType === "skills" ? skillCats : claudeMdCats;
  const skillsTotal = skillCats.reduce((s, c) => s + (c.count || 0), 0);
  const claudeMdTotal = claudeMdCats.reduce((s, c) => s + (c.count || 0), 0);
  const totalsByType = { skills: skillsTotal, "claude-md": claudeMdTotal };

  // Filter by category if requested — sort happens client-side in LeaderboardTable
  const ranked = selectedCategory
    ? allRanked.filter((r) => r.category === selectedCategory)
    : allRanked;

  const totalCount = totalsByType[requestedType];


  return (
    <div>
      <PageHero
        eyebrow={`Leaderboard · ${selectedCategory ? selectedCategory : "All"}`}
        title={
          totalCount === 0 ? (
            <>
              No <em style={{ color: "var(--accent)" }}>rankings</em> yet.
            </>
          ) : selectedCategory ? (
            <>
              Top in <em style={{ color: "var(--accent)" }}>{selectedCategory}</em>.
            </>
          ) : (
            <>
              Top <em style={{ color: "var(--accent)" }}>{config.label}</em>.
            </>
          )
        }
        subtitle={
          totalCount === 0
            ? "The bench engine has not produced rankings yet. They'll appear here once a cycle completes."
            : `${ranked.length} ${requestedType === "skills" ? "skills" : "CLAUDE.md files"} ranked${selectedCategory ? ` in ${selectedCategory}` : ""}. Judged by Haiku 4.5 · DeepSeek V3 · GPT-5 mini against 5 held-out tasks each, scored on 5 axes. Updated daily.`
        }
        decoration={<HeroShapes />}
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 10vw, 120px)",
        }}
      >
        {/* Skill / CLAUDE.md toggle */}
        <Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 0,
              border: "1px solid var(--rule)",
              padding: 4,
              background: "var(--surface)",
              width: "fit-content",
              marginBottom: 24,
            }}
          >
            {Object.entries(TYPES).map(([id, t]) => {
              const active = id === requestedType;
              return (
                <Link
                  key={id}
                  href={`/leaderboard${id === "skills" ? "" : `?type=${id}`}`}
                  style={{
                    padding: "10px 20px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    color: active ? "var(--bg)" : "var(--fg-muted)",
                    background: active ? "var(--fg)" : "transparent",
                    transition: "background 0.2s ease, color 0.2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {t.label}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.6 }}>
                    {totalsByType[id]}
                  </span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* Category pills — trop de pills sur mobile (le user a remonté qu'il y
            en a trop). Top 8 par count toujours visibles + reste dans un
            <details> natif "+N more" (pas besoin de client state). La cat
            active reste visible quoi qu'il arrive. */}
        {categories.length > 0 && (() => {
          const buildHref = (id) =>
            `/leaderboard?${requestedType === "claude-md" ? "type=claude-md&" : ""}category=${id}`;
          const baseHref = `/leaderboard${requestedType === "claude-md" ? "?type=claude-md" : ""}`;
          const enriched = categories
            .map((c) => ({
              ...c,
              count: allRanked.filter((r) => r.category === c.id).length,
            }))
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count);
          const TOP_N = 8;
          const top = enriched.slice(0, TOP_N);
          const rest = enriched.slice(TOP_N);
          const activeInRest = rest.find((c) => c.id === selectedCategory);
          if (activeInRest) {
            top.push(activeInRest);
          }
          const restToShow = rest.filter((c) => c.id !== selectedCategory);
          const renderPill = (c) => {
            const active = c.id === selectedCategory;
            return (
              <Link
                key={c.id}
                href={buildHref(c.id)}
                style={{
                  padding: "8px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: active ? "var(--bg)" : "var(--fg-muted)",
                  background: active ? "var(--fg)" : "var(--surface)",
                  border: "1px solid var(--rule)",
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
              >
                {c.label || c.id} <span style={{ opacity: 0.7 }}>{c.count}</span>
              </Link>
            );
          };
          return (
            <Reveal delay={0.05}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 32,
                }}
              >
                <Link
                  href={baseHref}
                  style={{
                    padding: "8px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: !selectedCategory ? "var(--bg)" : "var(--fg-muted)",
                    background: !selectedCategory ? "var(--fg)" : "var(--surface)",
                    border: "1px solid var(--rule)",
                    textDecoration: "none",
                    transition: "all 0.18s ease",
                  }}
                >
                  All <span style={{ opacity: 0.7 }}>{allRanked.length}</span>
                </Link>
                {top.map(renderPill)}
                {restToShow.length > 0 && (
                  <details
                    style={{
                      display: "inline-block",
                      position: "relative",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        listStyle: "none",
                        padding: "8px 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        background: "var(--surface)",
                        border: "1px solid var(--rule)",
                        userSelect: "none",
                      }}
                    >
                      + {restToShow.length} more
                    </summary>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {restToShow.map(renderPill)}
                    </div>
                  </details>
                )}
              </div>
            </Reveal>
          );
        })()}

        {/* Empty state */}
        {ranked.length === 0 ? (
          <Reveal>
            <div
              style={{
                borderTop: "1px solid var(--rule-strong)",
                borderBottom: "1px solid var(--rule)",
                padding: "clamp(48px, 8vw, 96px) clamp(24px, 5vw, 48px)",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 24,
                maxWidth: 720,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Bench engine · waiting
              </span>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  color: "var(--fg)",
                }}
              >
                Bench is <em style={{ color: "var(--accent)" }}>warming up</em>.
              </h2>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--fg-muted)",
                  lineHeight: 1.55,
                  maxWidth: 600,
                }}
              >
                {selectedCategory
                  ? `No skills ranked in ${selectedCategory} yet. Pick another category or browse the marketplace.`
                  : "No cycles have completed yet. The bench engine pits each item against a held-out task suite, judges with 3 LLM frontiers, and aggregates Elo."}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <Link
                  href="/marketplace"
                  style={{
                    padding: "12px 20px",
                    border: "1px solid var(--accent)",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Browse marketplace →
                </Link>
                <Link
                  href="/methodology"
                  style={{
                    padding: "12px 20px",
                    border: "1px solid var(--rule-strong)",
                    background: "transparent",
                    color: "var(--fg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  How the bench works →
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <LeaderboardTable items={ranked} />
          </Reveal>
        )}

        <Reveal delay={0.2}>
          <p
            style={{
              marginTop: 32,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              maxWidth: 720,
            }}
          >
            Score = average of judge scores on the held-out task suite (0-100). True
            Bayesian Elo with pairwise battles arrives post-V0. Every leaderboard is
            scoped to one category — apples vs oranges yields nothing.
          </p>
        </Reveal>

        {/* Meet the Judges panel — LMArena-style stats panel */}
        {judgeStats.length > 0 && (
          <Reveal delay={0.25}>
            <div style={{ marginTop: 64 }}>
              <JudgePanel stats={judgeStats} />
            </div>
          </Reveal>
        )}

        {/* Native promo slot — invites authors to climb via Boost */}
        <Reveal delay={0.3}>
          <div
            style={{
              marginTop: 64,
              padding: "24px 28px",
              border: "1px solid var(--rule-strong)",
              background: "color-mix(in oklab, var(--accent) 4%, var(--surface))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--accent)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Want to climb this ranking ?
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  color: "var(--fg)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                Submit your skill, get judged tomorrow — or boost an existing one to the
                top for{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}>$4.99 / 30d</span>.
              </span>
            </div>
            <div style={{ display: "inline-flex", gap: 10, flexShrink: 0 }}>
              <Link
                href="/pricing#boost"
                style={{
                  padding: "10px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--fg)",
                  border: "1px solid var(--rule-strong)",
                  background: "var(--bg)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Learn boost
              </Link>
              <Link
                href="/submit"
                style={{
                  padding: "10px 18px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--bg)",
                  background: "var(--fg)",
                  border: "1px solid var(--fg)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                Submit yours →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroShapes() {
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
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -60,
          top: 120,
          width: 120,
          height: 120,
          background: "var(--bg)",
        }}
      />
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{
          position: "absolute",
          left: 200,
          top: 100,
          transform: "rotate(8deg)",
        }}
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
