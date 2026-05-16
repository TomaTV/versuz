import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { RankBadge } from "@/components/rank-badge";
import { HairBar } from "@/components/hair-bar";
import { Sparkline } from "@/components/sparkline";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { OfficialBadge } from "@/components/marketplace/official-badge";
import { displayJudgeModel } from "@/lib/judges";
import { getFeaturedItems } from "@/lib/queries/rankings";
import {
  getSkillBySlug,
  getSiblingSkills,
  getJudgeDisagreement,
  getItemAchievements,
  getRegistryByRepo,
} from "@/lib/queries/rankings";
import { approximateTokens, formatTokenCount } from "@/lib/utils";
import { BackButton } from "@/components/site/back-button";
import { RepoBundleCallout } from "@/components/site/repo-bundle-callout";
import {
  SkillPrimaryAction,
  SkillBoostButton,
} from "@/components/skills/skill-user-gate";
import { SkillInstallBundle } from "@/components/skills/install-bundle";
import { PromoteSkillSlot } from "@/components/skills/promote-skill-slot";
import { TrackPage } from "@/components/track-page";
import { NewsletterInline } from "@/components/newsletter-inline";

function formatCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(s) {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

/**
 * Inter-judge disagreement panel — shows per-judge avg + global stdev +
 * a categorical agreement label (high / mid / low). Helps the reader
 * calibrate trust in the avg score : a 73 with stdev=2 is solid, a 73
 * with stdev=24 means the judges fought.
 */
function DisagreementSection({ disagreement }) {
  const { judges, stdev, overallMean, agreementLabel } = disagreement;
  const labelColor =
    agreementLabel === "high"
      ? "var(--sage)"
      : agreementLabel === "mid"
        ? "var(--amber)"
        : "var(--crimson)";
  const labelCopy =
    agreementLabel === "high"
      ? "Judges agree — score is reliable."
      : agreementLabel === "mid"
        ? "Typical spread — score is acceptable."
        : "Judges disagree — take the score with a grain of salt.";

  const AXES = ["instruction_following", "correctness", "completeness", "usefulness", "safety"];
  const axisLabel = {
    instruction_following: "Instruction",
    correctness: "Correctness",
    completeness: "Completeness",
    usefulness: "Usefulness",
    safety: "Safety",
  };
  // Subdued coloring : only the strongest signals get color, the rest stays
  // neutral so the table doesn't look like a Christmas tree.
  const colorFor = (v) => {
    if (v == null) return "var(--fg-muted)";
    if (v >= 80) return "var(--accent)";
    if (v <= 35) return "var(--crimson)";
    return "var(--fg)";
  };

  return (
    <Section eyebrow="§ 02c — Judges" markerColor="var(--azure)" paddingY={64}>
      <SectionHeader
        title={
          <>
            Judges differ by <em style={{ color: labelColor }}>±{stdev.toFixed(1)}</em> points.
          </>
        }
        subtitle={`${labelCopy} The "spread" is the standard deviation between the ${judges.length} judges' average scores — small spread means they agree, large spread means take the score with a grain of salt.`}
      />

      {/* Compact table : judge | Co | Fo | Cp | Us | De | Avg
          On mobile the 7-column grid becomes unreadable — the .vz-judges-table
          CSS rule reflows each row into a stacked card (model+score on top,
          axes as a pill row below). */}
      <div
        className="vz-judges-table"
        style={{
          marginTop: 32,
          border: "1px solid var(--rule-strong)",
          background: "var(--bg)",
        }}
      >
        <div
          className="vz-judges-table-header"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) repeat(5, 1fr) 100px",
            alignItems: "center",
            gap: 8,
            padding: "14px 24px",
            borderBottom: "1px solid var(--rule-strong)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <span>Judge</span>
          {AXES.map((k) => (
            <span key={k} style={{ textAlign: "center" }}>
              {axisLabel[k]}
            </span>
          ))}
          <span style={{ textAlign: "right" }}>Score</span>
        </div>
        {judges.map((j) => {
          const delta = j.avg - overallMean;
          const deltaColor =
            Math.abs(delta) < 5
              ? "var(--fg-muted)"
              : delta > 0
                ? "var(--sage)"
                : "var(--crimson)";
          return (
            <div
              key={j.model}
              className="vz-judges-table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) repeat(5, 1fr) 100px",
                alignItems: "center",
                gap: 8,
                padding: "20px 24px",
                borderBottom: "1px solid var(--rule)",
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div
                className="vz-judges-table-name"
                style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}
              >
                <span style={{ color: "var(--fg)", fontSize: 14, fontWeight: 500 }}>
                  {displayJudgeModel(j.model)}
                </span>
                <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>
                  {j.count} scores · <span style={{ color: deltaColor }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)} vs avg</span>
                </span>
              </div>
              {AXES.map((k) => {
                const v = j.axes?.[k];
                return (
                  <span
                    key={k}
                    className="vz-judges-axis"
                    data-axis={axisLabel[k]}
                    style={{ textAlign: "center", color: colorFor(v) }}
                  >
                    <span className="vz-judges-axis-label" aria-hidden>
                      {axisLabel[k]}
                    </span>
                    <span className="vz-judges-axis-value">
                      {v != null ? Math.round(v) : "—"}
                    </span>
                  </span>
                );
              })}
              <span
                className="vz-judges-table-score"
                style={{
                  textAlign: "right",
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 400,
                  color: "var(--fg)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {j.avg.toFixed(1)}
                <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 2, fontFamily: "var(--font-mono)" }}>
                  /100
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Hidden — kept the old 3-card markup commented out below in case we
          want it back. The compact table above is cleaner. */}
      <div
        style={{
          display: "none",
          marginTop: 32,
          gridTemplateColumns: `repeat(${Math.min(judges.length, 3)}, 1fr)`,
          gap: 0,
          border: "1px solid var(--rule-strong)",
        }}
        className="vz-judge-status-grid"
      >
        {judges.map((j) => {
          const delta = j.avg - overallMean;
          const deltaColor =
            Math.abs(delta) < 5
              ? "var(--fg-muted)"
              : delta > 0
                ? "var(--sage)"
                : "var(--crimson)";
          return (
            <div
              key={j.model}
              style={{
                padding: "32px 24px",
                borderRight: "1px solid var(--rule)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {displayJudgeModel(j.model)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {j.avg.toFixed(1)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {j.count} score{j.count > 1 ? "s" : ""}
                {Math.abs(delta) >= 0.1 && (
                  <>
                    {" · "}
                    <span style={{ color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)} vs avg
                    </span>
                  </>
                )}
              </span>
              {/* Per-axis breakdown (multi-dim scoring) */}
              {j.axes && (
                <div style={{ marginTop: 4 }}>
                  {Object.entries(j.axes).map(([k, v]) => {
                    if (v == null) return null;
                    const pct = Math.round(v);
                    return (
                      <div
                        key={k}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "100px 1fr 40px",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                        }}
                      >
                        <span style={{ color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {k}
                        </span>
                        <span
                          style={{
                            height: 4,
                            background: "var(--rule)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${pct}%`,
                              background: pct >= 80 ? "var(--sage)" : pct >= 60 ? "var(--amber)" : "var(--crimson)",
                            }}
                          />
                        </span>
                        <span style={{ color: "var(--fg)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {pct}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {j.sampleRationale && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color: "var(--fg-muted)",
                    fontStyle: "italic",
                    lineHeight: 1.4,
                  }}
                >
                  &ldquo;{j.sampleRationale.slice(0, 180)}{j.sampleRationale.length > 180 ? "…" : ""}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
      {/* Score methodology explainer */}
      <div
        style={{
          marginTop: 32,
          padding: "20px 24px",
          background: "var(--surface)",
          border: "1px solid var(--rule)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--fg)", fontWeight: 500 }}>How the score works.</strong>{" "}
        Each judge scores the agent output across 5 axes (instruction-following × 0.35,
        correctness × 0.30, completeness × 0.20, usefulness × 0.10, safety × 0.05). No cap — the
        full 0-100 range is in play. Rubric v4 aligned with FLASK / JudgeBench / HELM, with explicit
        length-bias neutrality. The final score is the average across all judges. Mean across the
        registry targets ~55 with stdev ~12, so a 70+ is genuinely above-average. Per-judge calibration
        on a human gold set + pairwise tie-breaking on close scores arrive in V1.
      </div>

      {/* Sample rationale per judge — one quote each, stacked compactly */}
      {judges.some((j) => j.sampleRationale) && (
        <details style={{ marginTop: 16 }}>
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "8px 0",
            }}
          >
            Show judge rationales
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {judges.map((j) =>
              j.sampleRationale ? (
                <div
                  key={j.model}
                  style={{
                    padding: "14px 18px",
                    borderLeft: "2px solid var(--azure)",
                    background: "var(--surface)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    {displayJudgeModel(j.model)}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 14,
                      color: "var(--fg)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;{j.sampleRationale}&rdquo;
                  </p>
                </div>
              ) : null
            )}
          </div>
        </details>
      )}
    </Section>
  );
}

// ISR 1h. La page ne lit plus de cookies au top-level (mai 2026 refactor) :
// les blocs user-conditional (primary action button, boost CTA, install
// commands, premium download, promote slot) sont des Client Components qui
// fetch /api/v1/me/skill-context après hydratation. Du coup `revalidate`
// reprend du sens et le shell de la page peut être pre-rendered + cached
// côté Vercel pour amortir massivement les bots.
//
// Avant : 58K invocations / 12h × 26ms CPU = 25min CPU (#1 sink Vercel).
// Après : shell statique servi depuis ISR cache pour 95%+ des hits.
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) return { title: "Skill not found — Versuz" };
  return {
    title: `${skill.name} — Versuz`,
    description: `${skill.name}: ranked #${skill.rank} in ${skill.category}. Elo ${skill.elo}. ${skill.description}`,
  };
}

export default async function SkillDetailPage({ params }) {
  const { slug } = await params;

  // Top-level fetches : pas de lecture cookies pour préserver l'ISR. Les
  // données user-conditional (owned/authored/premium signed URL) sont
  // récupérées côté client via /api/v1/me/skill-context, voir les Client
  // Components <SkillPrimaryAction>, <SkillBoostButton>, <SkillInstallBundle>,
  // <PromoteSkillSlot>.
  const detail = await getSkillBySlug(slug);
  if (!detail) notFound();
  const meta = detail.metadata || {};

  const [siblings, disagreement, repoRegistry, achievements, featuredPicks] = await Promise.all([
    getSiblingSkills(slug, 3),
    getJudgeDisagreement({ kind: "skill", subjectId: detail.id }),
    meta.owner && meta.repo ? getRegistryByRepo(meta.owner, meta.repo) : Promise.resolve(null),
    getItemAchievements("skill", detail.id),
    getFeaturedItems("skill", 4),
  ]);
  // Exclude the currently displayed skill from the cross-sell list.
  const featuredOthers = featuredPicks.filter((f) => f.slug !== slug).slice(0, 3);
  const hasTripleCrown = achievements.some((a) => a.type === "triple_crown");
  const tripleCrownCategories = new Set(
    achievements.filter((a) => a.type === "triple_crown").map((a) => a.category).filter(Boolean)
  );

  const repoBundleHref =
    repoRegistry &&
    repoRegistry.skills.length + repoRegistry.claudeMds.length > 1 &&
    meta.owner &&
    meta.repo
      ? `/repo/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`
      : null;
  const bundleTotal = repoRegistry
    ? repoRegistry.skills.length + repoRegistry.claudeMds.length
    : 0;

  const statCells = [];
  if (detail.stars != null && Number(detail.stars) > 0) {
    statCells.push(["Stars", formatCount(detail.stars)]);
  }
  if (detail.forks != null && Number(detail.forks) > 0) {
    statCells.push(["Forks", formatCount(detail.forks)]);
  }
  statCells.push(
    ["Prior", detail.prior != null ? Math.round(detail.prior) : "—"],
    ["Quality", detail.qualityScore != null ? Number(detail.qualityScore).toFixed(1) : "—"],
    ["Score", detail.elo != null ? Number(detail.elo).toFixed(1) : "—"],
    [
      "Tasks",
      detail.taskCount > 0
        ? `${detail.successfulTasks ?? detail.taskCount}/${detail.taskCount}`
        : "—",
    ]
  );

  // premiumDownloadUrl : déplacé dans /api/v1/me/skill-context (Client
  // Component fetch après hydratation). Voir <SkillInstallBundle>.

  return (
    <div style={{ position: "relative" }}>
      <TrackPage
        event="item_detail_view"
        props={{
          kind: "skill",
          slug,
          tier: detail.tier || "free",
          is_premium: detail.tier === "premium" || detail.tier === "featured",
          rank: detail.rank ?? null,
        }}
      />
      {/* HERO with rank-aware composition */}
      <section
        style={{
          position: "relative",
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
          maxWidth: 1440,
          margin: "0 auto",
          overflow: "hidden",
        }}
      >
        {detail.rank != null && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -32,
              top: -64,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(280px, 38vw, 600px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--accent)",
              opacity: 0.06,
              lineHeight: 0.8,
              letterSpacing: "-0.06em",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
            }}
          >
            {String(detail.rank).padStart(2, "0")}
          </div>
        )}

        {/* Breadcrumb */}
        <Reveal delay={0.05}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 64,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              flexWrap: "wrap",
              gap: 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            <BackButton
              fallbackHref="/marketplace"
              label="← Back"
              className="vz-nav-link"
              style={{ color: "var(--fg-muted)", textDecoration: "none" }}
            />
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/skills/${s.slug}`}
                  className="vz-nav-link"
                  style={{ color: "var(--fg-muted)", textDecoration: "none" }}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        <div style={{ position: "relative", zIndex: 1 }}>
          <Reveal delay={0.1}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                flexWrap: "wrap",
              }}
            >
              {detail.rank != null && <RankBadge rank={detail.rank} size="lg" />}
              {detail.rank != null && <span aria-hidden style={{ width: 1, height: 14, background: "var(--rule-strong)" }} />}
              <span>{detail.category}</span>
              {detail.author && <span aria-hidden style={{ width: 1, height: 14, background: "var(--rule-strong)" }} />}
              {detail.author && <span>{detail.author}</span>}
              <span aria-hidden style={{ width: 1, height: 14, background: "var(--rule-strong)" }} />
              <TierBadge tier={detail.tier} priceUsd={detail.priceUsd} size="md" />
              <OfficialBadge official={detail.isOfficial} showLabel />
              <VerificationBadge level={detail.verificationLevel} showLabel />
              {detail.isBoosted && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--bg)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    background: "var(--amber)",
                  }}
                >
                  <span aria-hidden style={{ width: 6, height: 6, background: "var(--bg)" }} />
                  Boosted
                </span>
              )}
              {detail.streakDays > 0 && (
                <span
                  title={`At #1 in ${detail.streakCategory || detail.category} for ${detail.streakDays} consecutive cycle${detail.streakDays > 1 ? "s" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--accent)",
                    letterSpacing: "0.04em",
                    background: "color-mix(in oklab, var(--accent) 10%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span aria-hidden>🔥</span>
                  {detail.streakDays}-day streak
                </span>
              )}
              {hasTripleCrown && (
                <span
                  title={`Triple Crown · won #1 in ${tripleCrownCategories.size > 1 ? `${tripleCrownCategories.size} categories` : Array.from(tripleCrownCategories)[0] || "a category"} with all three judges aligned`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--bg)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    background: "linear-gradient(135deg, var(--amber) 0%, var(--accent) 100%)",
                    fontWeight: 700,
                  }}
                >
                  <span aria-hidden>♛</span>
                  Triple Crown
                </span>
              )}
            </div>
          </Reveal>

          {detail.isBoosted && (
            <Reveal delay={0.12}>
              <div
                style={{
                  marginTop: 18,
                  padding: "10px 16px",
                  border: "1px solid var(--amber)",
                  background: "color-mix(in oklch, var(--amber) 12%, transparent)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg)",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--amber)", fontWeight: 600 }}>★ Boosted listing</span>
                <span style={{ color: "var(--fg-muted)" }}>·</span>
                <span style={{ color: "var(--fg-muted)" }}>
                  Paid placement{detail.promotedUntil
                    ? ` until ${new Date(detail.promotedUntil).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}. Rank and Elo are unaffected — boost only buys visibility.
                </span>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.15}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(72px, 10vw, 168px)",
                fontWeight: 400,
                lineHeight: 0.92,
                letterSpacing: "-0.045em",
                color: "var(--fg)",
                fontStyle: detail.rank === 1 ? "italic" : "normal",
              }}
            >
              {detail.name}
            </h1>
          </Reveal>

          <Reveal delay={0.25}>
            <p
              style={{
                margin: "32px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.45,
                letterSpacing: "-0.01em",
                color: "var(--fg)",
                maxWidth: 720,
              }}
            >
              {detail.description}
            </p>
          </Reveal>

          {repoBundleHref && (
            <Reveal delay={0.3}>
              <div style={{ marginTop: 36, maxWidth: 920 }}>
                <RepoBundleCallout
                  href={repoBundleHref}
                  owner={meta.owner}
                  repo={meta.repo}
                  total={repoRegistry.skills.length + repoRegistry.claudeMds.length}
                />
              </div>
            </Reveal>
          )}

          <Reveal delay={0.35}>
            <div
              style={{
                marginTop: 40,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <SkillPrimaryAction slug={slug} kind="skill" detail={detail} />
              <a
                href={`https://${detail.github}`}
                target="_blank"
                rel="noreferrer"
                className="vz-btn-ghost-outline"
                style={{
                  padding: "16px 24px",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--fg)",
                  border: "1px solid var(--rule-strong)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{"</>"}</span>
                {detail.tier === "free" ? detail.github : "Preview"}
              </a>
              {(detail.verificationLevel ?? 0) < 1 && detail.metadata?.owner && (
                <Link
                  href={`/claim/skill/${detail.slug}`}
                  style={{
                    padding: "16px 24px",
                    textDecoration: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  title={`If you're @${detail.metadata.owner} on GitHub, claim this skill.`}
                >
                  Yours? Claim it{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
                </Link>
              )}
              <SkillBoostButton slug={slug} kind="skill" detail={detail} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats strip */}
      <Section eyebrow="§ 01 — Stats" markerColor="var(--accent)" paddingY={80}>
        <RevealStagger
          stagger={0.06}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${statCells.length}, minmax(0, 1fr))`,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
            marginTop: 24,
          }}
          className="vz-stat-grid"
        >
          {statCells.map(([label, val], i) => (
            <RevealItem
              key={`${label}-${i}`}
              style={{
                padding: "28px 18px",
                borderRight: i < statCells.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 4vw, 40px)",
                  fontWeight: 400,
                  color: "var(--fg)",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                  lineHeight: 0.95,
                }}
              >
                {val}
              </span>
            </RevealItem>
          ))}
        </RevealStagger>

        {detail.elo7d && (
          <Reveal delay={0.4}>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                7-day Elo trajectory
              </span>
              <Sparkline values={detail.elo7d} />
            </div>
          </Reveal>
        )}
      </Section>

      {disagreement && <DisagreementSection disagreement={disagreement} />}

      <SkillInstallBundle
        slug={slug}
        kind="skill"
        detail={detail}
        repoBundleHref={repoBundleHref}
        bundleTotal={bundleTotal}
      />

      {/* Judges */}
      {detail.judges && (
        <Section eyebrow="§ 02 — Rationale" markerColor="var(--azure)">
          <SectionHeader
            title={
              <>
                Three <em style={{ color: "var(--accent)" }}>judges</em> weighed in.
              </>
            }
          />

          <RevealStagger
            stagger={0.1}
            style={{ display: "flex", flexDirection: "column", marginTop: 56 }}
          >
            {detail.judges.map((j, i) => (
              <RevealItem
                key={j.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 64,
                  padding: "40px 0",
                  borderTop: "1px solid var(--rule)",
                  borderBottom:
                    i === detail.judges.length - 1 ? "1px solid var(--rule)" : "none",
                }}
                className="vz-judge-row"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    weight {j.weight.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      color: "var(--fg)",
                      lineHeight: 1,
                    }}
                  >
                    {j.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 64,
                        fontStyle: "italic",
                        fontWeight: 400,
                        color: "var(--accent)",
                        letterSpacing: "-0.04em",
                        lineHeight: 0.9,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {j.score.toFixed(2)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--fg-muted)",
                      }}
                    >
                      / 1.00
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    lineHeight: 1.45,
                    color: "var(--fg)",
                    letterSpacing: "-0.01em",
                    fontStyle: "italic",
                  }}
                >
                  “{j.verdict}”
                </p>
              </RevealItem>
            ))}
          </RevealStagger>
        </Section>
      )}

      {/* History */}
      {detail.recent && detail.taskScores && (
        <Section eyebrow="§ 03 — History" markerColor="var(--sage)">
          <SectionHeader
            title={
              <>
                Last 5 <em style={{ color: "var(--accent)" }}>battles</em> + per-task scores.
              </>
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 48,
              marginTop: 56,
            }}
            className="vz-history-grid"
          >
            <Reveal delay={0.15}>
              <h3
                style={{
                  margin: "0 0 24px",
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                }}
              >
                Recent battles
              </h3>
              <div>
                {detail.recent.map((b, i) => (
                  <div
                    key={i}
                    className="vz-battle-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr auto auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 0",
                      borderTop: "1px solid var(--rule)",
                      borderBottom:
                        i === detail.recent.length - 1 ? "1px solid var(--rule)" : "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        color: b.result === "W" ? "var(--accent)" : "var(--danger)",
                        fontWeight: 600,
                      }}
                    >
                      {b.result}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 16,
                          color: "var(--fg)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        vs {b.vs}
                      </span>
                      <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>by {b.judge}</span>
                    </div>
                    <span style={{ color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {b.score}
                    </span>
                    <span
                      style={{
                        color: b.delta > 0 ? "var(--accent)" : "var(--danger)",
                        fontVariantNumeric: "tabular-nums",
                        width: 40,
                        textAlign: "right",
                      }}
                    >
                      {b.delta > 0 ? "+" : ""}
                      {b.delta}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <h3
                style={{
                  margin: "0 0 24px",
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                }}
              >
                Per-task scores
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {detail.taskScores.slice(0, 8).map((t, i) => {
                  const col =
                    t.status === "pass"
                      ? "var(--accent)"
                      : t.status === "partial"
                        ? "var(--warning)"
                        : "var(--danger)";
                  return (
                    <div
                      key={t.id}
                      className="vz-task-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "24px 1fr 100px 48px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 0",
                        borderTop: i === 0 ? "1px solid var(--rule)" : "none",
                        borderBottom: "1px solid var(--rule)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: "var(--fg-muted)" }}>
                        {String(t.id).padStart(2, "0")}
                      </span>
                      <span
                        className="vz-task-name"
                        style={{
                          color: "var(--fg)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.name}
                      </span>
                      <span className="vz-task-bar" style={{ display: "block" }}>
                        <HairBar value={t.score} color={col} />
                      </span>
                      <span
                        style={{
                          color: col,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                        }}
                      >
                        {t.score.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                <span
                  style={{
                    marginTop: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  + {detail.taskScores.length - 8} more · task suite v04
                </span>
              </div>
            </Reveal>
          </div>
        </Section>
      )}

      {/* Rivalries */}
      {detail.rivalries && (
        <Section eyebrow="§ 04 — Rivalries" markerColor="var(--crimson)">
          <SectionHeader
            title={
              <>
                Head-to-head <em style={{ color: "var(--accent)" }}>matchups</em>.
              </>
            }
          />
          <RevealStagger
            stagger={0.1}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginTop: 56,
            }}
            className="vz-history-grid"
          >
            {detail.rivalries.map((r) => (
              <RevealItem
                key={r.opponent}
                style={{
                  border: "1px solid var(--rule)",
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  <span>vs</span>
                  <span style={{ color: r.lastDelta >= 0 ? "var(--accent)" : "var(--danger)" }}>
                    {r.lastDelta >= 0 ? "+" : ""}
                    {r.lastDelta}
                  </span>
                </div>
                <Link
                  href={`/skills/${r.opponent}`}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "var(--fg)",
                    textDecoration: "none",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {r.opponent}
                </Link>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                  }}
                >
                  {r.record}
                </span>
                <HairBar value={r.share} color="var(--accent)" />
                {r.note && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      lineHeight: 1.4,
                      color: "var(--fg-muted)",
                      fontStyle: "italic",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {r.note}
                  </p>
                )}
              </RevealItem>
            ))}
          </RevealStagger>
        </Section>
      )}

      {/* Cross-sell : Versuz first-party Featured picks (excl. current item) */}
      {featuredOthers.length > 0 && (
        <FeaturedPicksStrip items={featuredOthers} />
      )}

      {/* Native promo slot — author-aware. Authors see Boost, visitors see Submit. */}
      <PromoteSkillSlot slug={slug} kind="skill" skillName={detail.name} />

      {/* Newsletter capture — pinned on the most-shared destination pages
          (skill detail) to convert viral Wave 1 traffic before bounce. */}
      <Section eyebrow="§ Stay close" markerColor="var(--accent)" paddingY={48}>
        <div style={{ maxWidth: 560 }}>
          <NewsletterInline
            source={`skill-detail-${detail.category || "other"}`}
            title="Weekly digest"
            body={`Top movers, new entries, and ranking shifts. One email per week, no other noise.`}
          />
        </div>
      </Section>

      {/* Challenge CTA */}
      <Section eyebrow="§ 05 — Challenge" markerColor="var(--amber)">
        <SectionHeader
          title={
            <>
              Think you can <em style={{ color: "var(--accent)" }}>beat it</em>?
            </>
          }
        />
        <Reveal delay={0.2}>
          <div
            style={{
              marginTop: 40,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 24px",
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
              challenge {detail.slug}
            </span>
            <span style={{ color: "var(--fg-muted)", marginLeft: 24 }}>↵</span>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}

/**
 * Featured cross-sell strip — surfaces other Versuz-first-party items.
 * Visible to all visitors (incl. authors of the current skill — they may
 * be interested in other Versuz Featured items). Cards keep the same amber
 * accent as the home Featured section so the visual language is consistent.
 */
function FeaturedPicksStrip({ items }) {
  return (
    <section
      style={{
        maxWidth: 1440,
        margin: "32px auto 0",
        padding: "0 clamp(16px, 4.5vw, 64px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            background: "var(--amber)",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          More Versuz picks
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((s) => (
          <Link
            key={s.slug}
            href={`/skills/${s.slug}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "16px 18px",
              border: "1px solid var(--amber)",
              background: "color-mix(in oklab, var(--amber) 4%, var(--surface))",
              textDecoration: "none",
              color: "inherit",
              transition: "background 0.15s ease",
            }}
            className="vz-featured-card"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
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
                  padding: "2px 6px",
                  fontWeight: 600,
                }}
              >
                ★ Featured
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--accent)",
                  letterSpacing: "-0.01em",
                }}
              >
                ${Number(s.priceUsd ?? 0).toFixed(2)}
              </span>
            </div>
            <h4
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                color: "var(--fg)",
                lineHeight: 1.15,
              }}
            >
              {s.name}
            </h4>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {s.category}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
