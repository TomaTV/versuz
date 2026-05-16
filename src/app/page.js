import Link from "next/link";
import { Eyebrow } from "@/components/brand/eyebrow";
import { BattleSpread } from "@/components/battle-spread";
import { SkillRow } from "@/components/skill-row";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { ScrollReveal, ScrollRevealStagger } from "@/components/motion/scroll-reveal";
import { LiveStatsGrid } from "@/components/live-stats-grid";
import { LandingHero } from "@/components/landing/landing-hero";
import { Section, SectionHeader } from "@/components/section";
import { judgesLabel } from "@/lib/judges";
import {
  getFeaturedBattle,
  getBenchedTopByCategory,
  getRankableCategories,
  getLeaderboardCategories,
  getTopTopicsByKind,
  getIndexCounts,
  getCurrentCycle,
  getFeaturedItems,
} from "@/lib/queries/rankings";

// ISR 5min. `cacheComponents` n'est pas activé (cf next.config.mjs) donc
// le `revalidate` classique s'applique. Page la plus visitée — passer en
// ISR shave la majorité des invocations Function. Les KPI dynamiques
// (ranked count, ticker) sont rafraîchis par polling client côté
// LiveStatsGrid/HeroLiveBar (déjà cached via /api/stats edge 60s).
export const revalidate = 300;

export default async function LandingPage() {
  // Fetch first wave — incl. the list of categories with ranked content
  // so we can pick the headline category dynamically (was hardcoded to
  // "document", which has no benched items in prod yet → empty block).
  const [battle, categories, rankedSkills, rankedClaudeMd, skillTopics, claudeTopics, counts, cycle, featured] = await Promise.all([
    getFeaturedBattle(),
    getRankableCategories(),
    getLeaderboardCategories("skill"),
    getLeaderboardCategories("claude_md"),
    getTopTopicsByKind("skill", 12),
    getTopTopicsByKind("claude_md", 12),
    getIndexCounts(),
    getCurrentCycle(),
    getFeaturedItems("skill", 3),
  ]);

  // Headline category — prefer "sql" since it's well-represented in the
  // current bench data (3 benched items as of May 2026) and reads better
  // editorially than "data" / "shell" / "web" for the hero. Fallback to
  // any other category with bench data, else "document" (will render an
  // empty block, hidden by the top10Ranked filter below).
  const HEADLINE_PREFERENCE = ["sql", "web", "shell", "data"];
  const rankedSkillsById = new Set(rankedSkills.filter((c) => c.count > 0).map((c) => c.id));
  const headlineCategory =
    HEADLINE_PREFERENCE.find((id) => rankedSkillsById.has(id)) ||
    rankedSkills.find((c) => c.count > 0)?.id ||
    "document";
  // getBenchedTopByCategory hits `rankings` directly (cycle scope) and
  // joins to skills metadata — handles the case where `skills.category`
  // (native tag) differs from `rankings.category` (bench scope), e.g.
  // peekaboo native=macos but benched under sql scope.
  const top10Ranked = await getBenchedTopByCategory("skill", headlineCategory, 10);

  const totalSkills = counts.skills;
  const totalClaudeMds = counts.claudeMds;
  const rankedTotal =
    rankedSkills.reduce((s, c) => s + (c.count || 0), 0) +
    rankedClaudeMd.reduce((s, c) => s + (c.count || 0), 0);

  // Live ranking block — promu en §01 au-dessus du fold. Le helper retourne
  // déjà filtré (elo non-null), trié par score desc, et stamped (rank).
  const cycleLabel = cycle
    ? cycle.status === "running"
      ? `Cycle #${cycle.id} · live`
      : cycle.status === "completed"
      ? `Cycle #${cycle.id} · last completed`
      : null
    : null;
  const liveRankingBlock = top10Ranked.length > 0 ? (
    <ScrollReveal direction="up" distance={32} threshold={0.1}>
      <Section eyebrow="§ 02 — Live ranking" markerColor="var(--sage)">
        <SectionHeader
          title={
            <>
              Top 10 in <em style={{ color: "var(--accent)" }}>{headlineCategory}</em>.
            </>
          }
          subtitle={
            <>
              You can&apos;t rank skills that don&apos;t do the same thing. Every Versuz
              leaderboard is <em style={{ fontStyle: "italic" }}>scoped to one category</em>.
              {cycleLabel ? <> {cycleLabel}. Cycles refresh daily at 06:00 UTC.</> : <> Cycles refresh daily at 06:00 UTC.</>}
            </>
          }
        />

        <Reveal delay={0.1}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 32,
              marginBottom: 24,
            }}
          >
            {categories.map((c) => {
              const isActive = c.id === headlineCategory;
              return (
                <Link
                  key={c.id}
                  href={`/standings/${c.id}`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: isActive ? "var(--bg)" : "var(--fg-muted)",
                    background: isActive ? "var(--fg)" : "transparent",
                    border: isActive ? "1px solid var(--fg)" : "1px solid var(--rule)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    padding: "8px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "color .15s ease, background .15s ease, border-color .15s ease",
                  }}
                  className="vz-cat-pill"
                >
                  {c.label}
                  <span style={{ opacity: 0.6 }}>{c.count}</span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        <RevealStagger
          stagger={0.05}
          amount={0.05}
          style={{ display: "flex", flexDirection: "column" }}
        >
          {top10Ranked.map((skill, i) => (
            <RevealItem key={skill.slug}>
              <SkillRow skill={skill} leader={i === 0} />
            </RevealItem>
          ))}
        </RevealStagger>

        <div style={{ marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href="/leaderboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              background: "var(--fg)",
              color: "var(--bg)",
              fontFamily: "var(--font-display)",
              fontSize: 15,
              letterSpacing: "-0.01em",
              border: "1px solid var(--fg)",
              textDecoration: "none",
            }}
          >
            See the full leaderboard
            <span>→</span>
          </Link>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            or <Link href="#how" style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}>how a skill earns its rank ↓</Link>
          </span>
        </div>
      </Section>
    </ScrollReveal>
  ) : null;

  return (
    <div style={{ position: "relative" }}>
      <LandingHero counts={counts} />

      {/* ============================================================== */}
      {/* §01 WHAT — c'est quoi Versuz. Promu en premier (mai 2026) :       */}
      {/* l'audit mobile a montré qu'un visiteur non-tech ne comprend pas   */}
      {/* "Top 10 in sql · score 87.3" avant qu'on lui explique ce qu'est   */}
      {/* un benchmark de skills. Explication AVANT preuve.                 */}
      {/* ============================================================== */}
      <ScrollReveal direction="up" distance={32} threshold={0.2}>
        <Section id="what" eyebrow="§ 01 — What" markerColor="var(--azure)">
          <SectionHeader
            title={
              <>
                An <em style={{ color: "var(--accent)" }}>open public benchmark</em> for AI
                agent skills.
              </>
            }
            subtitle="Versuz benchmarks publicly-available SKILL.md files (Claude Code, Codex CLI, Cursor) against each other. We run every skill in a category through the same task suite, judge the outputs with three frontier models, and publish the ranking — every 24 hours."
          />

          <RevealStagger
            stagger={0.1}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              marginTop: 64,
              borderTop: "1px solid var(--rule-strong)",
            }}
            className="vz-pillars"
          >
            {[
              {
                tag: "open",
                color: "var(--azure)",
                title: "No private list.",
                body: "Every skill in the registry has its source, prompt, and tools published. We rank what we can read.",
              },
              {
                tag: "adversarial",
                color: "var(--accent)",
                title: "Skill vs skill.",
                body: "Each cycle, every skill runs the same 30-task suite. Outcomes become head-to-head battles.",
              },
              {
                tag: "judged",
                color: "var(--sage)",
                title: "Three judges.",
                body: `${judgesLabel({ short: true })} grade independently. Disagreement is published, not hidden.`,
              },
            ].map((p, i) => (
              <RevealItem
                key={p.tag}
                style={{
                  padding: "32px 24px 40px",
                  borderRight: i < 2 ? "1px solid var(--rule)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden style={{ width: 10, height: 10, background: p.color }} />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.tag}
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: "var(--fg)",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--fg-muted)",
                    maxWidth: 320,
                  }}
                >
                  {p.body}
                </p>
              </RevealItem>
            ))}
          </RevealStagger>
        </Section>
      </ScrollReveal>

      {/* ============================================================== */}
      {/* §02 LIVE RANKING — la preuve après l'explication.                 */}
      {/* ============================================================== */}
      {liveRankingBlock}

      {/* ============================================================== */}
      {/* §02.5 FEATURED — Versuz first-party curated picks. Tier=100%      */}
      {/* (Versuz keeps full revenue, no author split).                     */}
      {/* ============================================================== */}
      {featured.length > 0 && (
        <ScrollReveal direction="up" distance={28} threshold={0.15}>
          <Section eyebrow="§ Featured" markerColor="var(--amber)">
            <SectionHeader
              title={
                <>
                  <em style={{ color: "var(--accent)" }}>Versuz picks</em>.
                </>
              }
              subtitle={
                <>
                  First-party skills we built ourselves. Battle-tested in our own bench
                  pipeline. Premium quality, expert-curated, $0.99-$4.99 one-time.
                </>
              }
            />
            <RevealStagger
              stagger={0.08}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginTop: 40,
              }}
            >
              {featured.map((s) => (
                <RevealItem key={s.slug}>
                  <Link
                    href={`/skills/${s.slug}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: "20px 22px",
                      border: "1px solid var(--amber)",
                      background: "color-mix(in oklab, var(--amber) 5%, var(--surface))",
                      textDecoration: "none",
                      color: "inherit",
                      height: "100%",
                      transition: "background 0.15s ease",
                    }}
                    className="vz-featured-card"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          background: "var(--amber)",
                          padding: "3px 8px",
                          fontWeight: 600,
                        }}
                      >
                        ★ Featured
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-muted)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {s.category}
                      </span>
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display)",
                        fontSize: 26,
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                        color: "var(--fg)",
                      }}
                    >
                      {s.name}
                    </h3>
                    {s.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: "var(--fg-muted)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {s.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginTop: "auto",
                        paddingTop: 10,
                        borderTop: "1px solid color-mix(in oklab, var(--amber) 30%, transparent)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 22,
                          color: "var(--accent)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        ${Number(s.priceUsd ?? 0).toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-muted)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        View →
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealStagger>
          </Section>
        </ScrollReveal>
      )}

      {/* ============================================================== */}
      {/* §03 WHY                                                          */}
      {/* ============================================================== */}
      <ScrollReveal direction="up" distance={32} threshold={0.2}>
        <Section eyebrow="§ 03 — Why" markerColor="var(--crimson)">
          <SectionHeader
            title={
              <>
                4,200 skills claim to do task X.{" "}
                <em style={{ color: "var(--accent)" }}>Which one</em> works?
              </>
            }
            subtitle="Existing directories rank by stars and installs — popularity, not quality. Versuz runs every skill against the same task suite and publishes a ranking based on actual performance, not virality."
          />

          <LiveStatsGrid
            initialSkills={totalSkills}
            initialClaudeMds={totalClaudeMds}
            initialRanked={rankedTotal}
            initialAsOf={counts.asOf}
          />
        </Section>
      </ScrollReveal>

      {/* ============================================================== */}
      {/* §04 HOW IT WORKS                                                */}
      {/* ============================================================== */}
      <ScrollReveal direction="up" distance={32} threshold={0.15}>
        <Section id="how" eyebrow="§ 04 — How it works" markerColor="var(--amber)">
          <SectionHeader
            title={
              <>
                How a skill <em style={{ color: "var(--accent)" }}>earns its rank</em>.
              </>
            }
            subtitle="Five steps, deterministic where possible, transparent at every stage. The full methodology lives at /methodology."
          />

          <RevealStagger
            stagger={0.08}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0,
              marginTop: 56,
              borderTop: "1px solid var(--rule-strong)",
            }}
            className="vz-method-flow"
          >
            {[
              {
                n: "01",
                label: "Submit",
                color: "var(--azure)",
                body: "A skill is published to the public registry. Source, prompt, tools all readable.",
              },
              {
                n: "02",
                label: "30 Tasks",
                color: "var(--accent)",
                body: "A held-out task split is drawn each cycle. Every skill runs every task.",
              },
              {
                n: "03",
                label: "3 Judges",
                color: "var(--amber)",
                body: `${judgesLabel({ short: true })} grade independently with the same rubric.`,
              },
              {
                n: "04",
                label: "Score",
                color: "var(--crimson)",
                body: "Scores tallied fairly. When judges disagree, we publish their exact reasoning.",
              },
              {
                n: "05",
                label: "Rank",
                color: "var(--sage)",
                body: "Skills are ranked like chess players. New entries start fair. Top performers earn harder matches.",
              },
            ].map((step, i, arr) => (
              <RevealItem
                key={step.n}
                style={{
                  padding: "32px 24px 32px 0",
                  paddingLeft: i === 0 ? 0 : 24,
                  borderRight: i < arr.length - 1 ? "1px solid var(--rule)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden style={{ width: 12, height: 12, background: step.color }} />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                    }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: "var(--fg)",
                    fontStyle: i === 4 ? "italic" : "normal",
                  }}
                >
                  {step.label}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--fg-muted)",
                  }}
                >
                  {step.body}
                </p>
              </RevealItem>
            ))}
          </RevealStagger>
        </Section>
      </ScrollReveal>

      {/* ============================================================== */}
      {/* §05 EXAMPLE — un match (only when bench engine has produced one) */}
      {/* ============================================================== */}
      {battle && (
        <ScrollReveal direction="scale" threshold={0.2}>
          <Section eyebrow="§ 05 — Example" markerColor="var(--accent)">
            <SectionHeader
              title={
                <>
                  Here&apos;s what one <em style={{ color: "var(--accent)" }}>match</em> looks
                  like.
                </>
              }
              subtitle="Two skills, the same task suite, three judges. The card below is today's headline match in the document category — click through for the full breakdown."
            />

            <div style={{ marginTop: 56 }}>
              <Reveal delay={0.1}>
                <BattleSpread battle={battle} />
              </Reveal>
            </div>
          </Section>
        </ScrollReveal>
      )}

      {/* ============================================================== */}
      {/* §06 TOPICS — 2 sections séparées, count par kind exact          */}
      {/* ============================================================== */}
      {(skillTopics.length > 0 || claudeTopics.length > 0) && (
        <ScrollReveal direction="up" distance={28} threshold={0.15}>
          <Section eyebrow="§ 06 — Topics" markerColor="var(--azure)">
            <SectionHeader
              title={
                <>
                  Browse by <em style={{ color: "var(--accent)" }}>topic</em>.
                </>
              }
              subtitle="GitHub repo topics aggregated across the registry. Click any topic to pre-filter the marketplace."
            />
            {skillTopics.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, background: "var(--azure)" }} />
                  Top topics across skills
                </div>
                <ScrollRevealStagger
                  stagger={35}
                  duration={500}
                  distance={12}
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {skillTopics.map((t) => (
                    <Link
                      key={`s-${t.id}`}
                      href={`/marketplace?type=skills&topics=${encodeURIComponent(t.id)}`}
                      title={`${t.count} skill(s) tagged ${t.id}`}
                      className="vz-pill-btn"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        padding: "8px 14px",
                        border: "1px solid var(--rule)",
                        color: "var(--fg)",
                        textDecoration: "none",
                        letterSpacing: "0.04em",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--surface)",
                      }}
                    >
                      {t.id}
                      <span style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>{t.count}</span>
                    </Link>
                  ))}
                </ScrollRevealStagger>
              </div>
            )}
            {claudeTopics.length > 0 && (
              <div style={{ marginTop: skillTopics.length > 0 ? 32 : 40 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, background: "var(--sage)" }} />
                  Top topics across CLAUDE.md
                </div>
                <ScrollRevealStagger
                  stagger={35}
                  duration={500}
                  distance={12}
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {claudeTopics.map((t) => (
                    <Link
                      key={`c-${t.id}`}
                      href={`/marketplace?type=claude-md&topics=${encodeURIComponent(t.id)}`}
                      title={`${t.count} CLAUDE.md tagged ${t.id}`}
                      className="vz-pill-btn"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        padding: "8px 14px",
                        border: "1px solid var(--rule)",
                        color: "var(--fg)",
                        textDecoration: "none",
                        letterSpacing: "0.04em",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--surface)",
                      }}
                    >
                      {t.id}
                      <span style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>{t.count}</span>
                    </Link>
                  ))}
                </ScrollRevealStagger>
              </div>
            )}
          </Section>
        </ScrollReveal>
      )}

      {/* ============================================================== */}
      {/* §07 INSTALL — CLI + MCP server                                    */}
      {/* ============================================================== */}
      <ScrollReveal direction="up" distance={32} threshold={0.12}>
        <Section eyebrow="§ 07 — Install" markerColor="var(--azure)">
          <SectionHeader
            title={
              <>
                Pipe Versuz <em style={{ color: "var(--accent)" }}>into your terminal</em>.
              </>
            }
            subtitle="Two ways to consume the registry from where you already work : a CLI for one-off installs, or an MCP server so Claude Code itself can search + install skills inline."
          />
          <div
            style={{
              marginTop: 48,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {/* CLI card */}
            <ScrollReveal direction="left" distance={32} delay={50} className="vz-install-card">
              <div
                style={{
                  padding: "32px 28px",
                  border: "1px solid var(--rule)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      padding: "3px 7px",
                      color: "var(--bone)",
                      background: "var(--ink)",
                    }}
                  >
                    CLI
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      color: "var(--azure)",
                      border: "1px solid var(--azure)",
                      background: "color-mix(in oklab, var(--azure) 8%, transparent)",
                      fontWeight: 600,
                    }}
                  >
                    Beta
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "var(--fg)",
                  }}
                >
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>npx versuz</code>
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                  Browse, search, inspect, install. Interactive prompts, ASCII gradient logo, colored tables. Free items install instantly to <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>.claude/skills/&lt;slug&gt;/</code>.
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    background: "var(--ink)",
                    color: "var(--bone)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflow: "auto",
                  }}
                >
                  {`$ npx versuz search pdf
$ npx versuz install pdf-generator
✓ Wrote .claude/skills/pdf-generator/SKILL.md`}
                </pre>
                <a
                  href="https://github.com/TomaTV/versuz/tree/main/cli"
                  target="_blank"
                  rel="noreferrer"
                  className="vz-link"
                  style={{ marginTop: "auto" }}
                >
                  Read the CLI docs ↗
                </a>
              </div>
            </ScrollReveal>

            {/* MCP card */}
            <ScrollReveal direction="right" distance={32} delay={150} className="vz-install-card">
              <div
                style={{
                  padding: "32px 28px",
                  border: "1px solid var(--rule)",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      padding: "3px 7px",
                      color: "var(--bone)",
                      background: "var(--accent)",
                    }}
                  >
                    MCP
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      color: "var(--azure)",
                      border: "1px solid var(--azure)",
                      background: "color-mix(in oklab, var(--azure) 8%, transparent)",
                      fontWeight: 600,
                    }}
                  >
                    Beta
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "var(--fg)",
                  }}
                >
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>@versuz/mcp</code>
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                  Plug Versuz into Claude Code as native tools. Ask Claude <em>"find me a SQL migration skill and install it"</em> — it searches, inspects, downloads, all inline. 5 tools : search, list, get, install (skills + CLAUDE.md).
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    background: "var(--ink)",
                    color: "var(--bone)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflow: "auto",
                  }}
                >
                  {`$ claude mcp add versuz npx -y @versuz/mcp
> find me a PDF skill and install it
✓ versuz_install pdf-generator`}
                </pre>
                <a
                  href="https://github.com/TomaTV/versuz/tree/main/mcp-server"
                  target="_blank"
                  rel="noreferrer"
                  className="vz-link"
                  style={{ marginTop: "auto" }}
                >
                  Read the MCP docs ↗
                </a>
              </div>
            </ScrollReveal>
          </div>
        </Section>
      </ScrollReveal>

      {/* ============================================================== */}
      {/* §08 ENTER — submit + V1 monetize teaser                         */}
      {/* ============================================================== */}
      <ScrollReveal direction="up" distance={36} threshold={0.15}>
        <section
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "160px 64px 200px",
            borderTop: "1px solid var(--rule)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            className="vz-shape-round"
            style={{
              position: "absolute",
              right: -160,
              top: 80,
              width: 380,
              height: 380,
              background: "var(--sage)",
              opacity: 0.92,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            className="vz-shape-round"
            style={{
              position: "absolute",
              right: -80,
              top: 160,
              width: 220,
              height: 220,
              background: "var(--bg)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <svg
            aria-hidden
            width="100"
            height="100"
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              right: 360,
              top: 100,
              transform: "rotate(8deg)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <path d="M 50 6 L 94 94 L 6 94 Z" fill="var(--amber)" />
          </svg>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 32,
              top: 200,
              width: 4,
              height: 160,
              background: "var(--accent)",
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <Reveal>
              <Eyebrow>§ 08 — Enter</Eyebrow>
            </Reveal>

            <Reveal delay={0.1}>
              <h2
                style={{
                  margin: "16px 0 32px",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(56px, 7vw, 128px)",
                  fontWeight: 400,
                  lineHeight: 0.95,
                  letterSpacing: "-0.035em",
                  color: "var(--fg)",
                  maxWidth: 1000,
                }}
              >
                Bring your <em style={{ color: "var(--accent)" }}>skill</em>.
              </h2>
            </Reveal>

            <Reveal delay={0.2}>
              <p
                style={{
                  margin: "0 0 32px",
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  lineHeight: 1.5,
                  letterSpacing: "-0.01em",
                  color: "var(--fg-muted)",
                  maxWidth: 600,
                }}
              >
                Open a pull request to the public registry, or push directly with the CLI. Your
                skill enters tomorrow&apos;s bench cycle. No fee, no gatekeeper.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 32,
                }}
              >
                <Link
                  href="/submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "18px 26px",
                    background: "var(--fg)",
                    color: "var(--bg)",
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                    border: "1px solid var(--fg)",
                    textDecoration: "none",
                    transition: "background 0.2s",
                  }}
                >
                  Submit your skill
                  <span style={{ marginLeft: 4 }}>→</span>
                </Link>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 24px",
                    border: "1px solid var(--rule-strong)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--fg)",
                    background: "var(--surface)",
                  }}
                >
                  <span style={{ color: "var(--accent)" }}>$</span>
                  <span>
                    npx <em style={{ color: "var(--accent)", fontStyle: "italic" }}>versuz</em>{" "}
                    submit ./my-skill
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: 48 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Already listed?{" "}
                  <Link
                    href="/pricing#boost"
                    style={{
                      color: "var(--accent)",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                      textUnderlineOffset: 4,
                    }}
                  >
                    Boost a skill · $4.99 / 30 days
                  </Link>
                </span>
              </div>
            </Reveal>

            {/* V1.5 = monetisation live (Stripe Connect Express) — pas un teaser,
              c'est shippé. Bandeau live au lieu de "coming soon". */}
            <Reveal delay={0.4}>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 24,
                  borderTop: "1px dashed var(--rule)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  maxWidth: 720,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--sage)",
                  }}
                >
                  <span aria-hidden style={{ width: 8, height: 8, background: "var(--sage)" }} />
                  Live
                </span>
                <span>
                  Premium listings · Stripe Connect Express · authors keep 70% on every install.
                </span>
              </div>
            </Reveal>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}

