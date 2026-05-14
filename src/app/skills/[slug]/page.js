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
import {
  getSkillBySlug,
  getSiblingSkills,
  getJudgeDisagreement,
  getRegistryByRepo,
} from "@/lib/queries/rankings";
import { approximateTokens, formatTokenCount } from "@/lib/utils";
import { EmbedBadgeBlock } from "@/components/embed-badge-block";
import { CopyContentButton } from "@/components/copy-content-button";
import { getCurrentUser } from "@/lib/auth/server";
import { getOwnedSlugs, getAuthoredSlugs } from "@/lib/purchases/server";
import { signPremiumDownloadUrl } from "@/lib/premium/storage";
import { BackButton } from "@/components/site/back-button";
import { RepoBundleCallout } from "@/components/site/repo-bundle-callout";

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

function InstallSection({ detail, isOwned, isAuthored, repoBundleHref, bundleTotal }) {
  const meta = detail.metadata || {};
  const repoPath = meta.path || "SKILL.md";
  const repoFull = meta.owner && meta.repo ? `${meta.owner}/${meta.repo}` : null;
  const cloneCmd = repoFull ? `git clone https://github.com/${repoFull}.git` : null;
  const skillType = meta.skill_type || "minimal";
  const license = meta.license;
  const updatedAt = formatDate(meta.pushed_at);

  const isPremium = detail.tier && detail.tier !== "free";
  const showInstallCommands = !isPremium || isOwned || isAuthored;

  let subtitle;
  if (isAuthored) {
    subtitle = "Yours. Edit the SKILL.md in the source repo and the new version syncs at the next scrape. Buyers get the same access path you do.";
  } else if (isOwned) {
    subtitle = "You purchased this. Clone the repo or copy the file directly. Updates roll in as the author pushes them.";
  } else if (isPremium) {
    subtitle = `Premium · $${detail.priceUsd}. Buying supports the author (70/30 split) and surfaces the item with the verified ribbon. The SKILL.md itself is in a public GitHub repo — you can preview the source below before deciding.`;
  } else {
    subtitle = "Free SKILL.md scraped from GitHub. Clone the repo or copy the file directly into your Claude Code skills directory.";
  }

  return (
    <Section eyebrow="§ 02 — Install" markerColor="var(--azure)" paddingY={80}>
      <SectionHeader
        title={
          <>
            Get <em style={{ color: "var(--accent)" }}>{detail.name}</em>.
          </>
        }
        subtitle={subtitle}
      />

      {/* Repo bundle callout removed here — it's already shown in the hero
          section (line ~1090) at full size. Was duplicated. */}

      <div
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 32,
        }}
        className="vz-install-grid"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {showInstallCommands ? (
            <>
              <CommandBlock
                label="One-line install · Claude Code"
                command={`npx versuz@latest install ${detail.slug}`}
                primary
              />
              {cloneCmd && (
                <CommandBlock label="Or clone the repo" command={cloneCmd} />
              )}
              {repoFull && (
                <CommandBlock
                  label={`Or copy ${skillType === "bundled" ? "the skill folder" : "the SKILL.md"} manually`}
                  command={
                    skillType === "bundled"
                      ? `cp -r ${meta.repo}/${repoPath.replace(/\/?SKILL\.md$/i, "")} ~/.claude/skills/${detail.slug}/`
                      : `cp ${meta.repo}/${repoPath} ~/.claude/skills/${detail.slug}/SKILL.md`
                  }
                />
              )}
            </>
          ) : (
            <div
              style={{
                padding: "32px 28px",
                border: "1px dashed var(--accent)",
                background: "var(--accent-soft)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--fg)",
                lineHeight: 1.6,
                letterSpacing: "0.02em",
              }}
            >
              <strong style={{ fontWeight: 500, color: "var(--accent)" }}>
                Premium · ${detail.priceUsd}
              </strong>
              <br />
              <br />
              Install instructions unlock after purchase. The underlying SKILL.md
              is hosted on a public GitHub repo — buying gives you the verified
              badge, supports the author (70%), and prioritises this item in
              search and category browsing.
              <br />
              <br />
              Use the Buy button above to checkout via Stripe.
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--rule)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          <Field label="Type" value={skillType} />
          <Field label="License" value={license || "—"} />
          <Field label="Last update" value={updatedAt || "—"} />
          <Field
            label="Repo"
            value={
              repoFull ? (
                <a
                  href={`https://github.com/${repoFull}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--fg)", textDecoration: "none", borderBottom: "1px solid var(--accent)" }}
                >
                  {repoFull}
                </a>
              ) : (
                "—"
              )
            }
          />
          {meta.tools && meta.tools.length > 0 && (
            <Field label="Tools" value={meta.tools.join(", ")} />
          )}
          {meta.bundle_files && meta.bundle_files.length > 0 && (
            <Field label="Bundle" value={`${meta.bundle_files.length} file${meta.bundle_files.length > 1 ? "s" : ""}`} />
          )}
          {detail.qualityScore != null && (
            <Field
              label="Quality"
              value={
                <span
                  title={detail.qualityRationale || "LLM-rated quality (clarity, specificity, completeness, structure, usefulness)"}
                  style={{
                    color: "var(--azure)",
                    fontVariantNumeric: "tabular-nums",
                    cursor: "help",
                    borderBottom: "1px dotted var(--azure)",
                  }}
                >
                  {Number(detail.qualityScore).toFixed(1)} / 100
                </span>
              }
            />
          )}
        </div>
      </div>
      {detail.qualityScore != null && detail.qualityRationale && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 18px",
            border: "1px solid var(--rule)",
            background: "var(--surface)",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--fg-muted)",
            fontStyle: "italic",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontStyle: "normal", color: "var(--azure)", letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase", marginRight: 10 }}>
            Quality {Number(detail.qualityScore).toFixed(1)} ·
          </span>
          {detail.qualityRationale}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <EmbedBadgeBlock kind="skill" slug={detail.slug} name={detail.name} />
      </div>

      {detail.skill_md_content && (
        // GATING : premium content is paywalled. Owned/authored users see
        // the full SKILL.md ; everyone else gets a teaser (first ~500 chars
        // truncated) with a CTA to buy. Free items stay fully visible.
        isPremium && !isOwned && !isAuthored ? (
          <div
            style={{
              marginTop: 32,
              border: "1px dashed var(--accent)",
              background: "var(--accent-soft)",
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              🔒 Preview · paywalled
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--fg)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 200,
                overflow: "hidden",
                position: "relative",
                maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              }}
            >
              {(detail.skill_md_content || "").slice(0, 500)}
            </pre>
            <p
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--fg-muted)",
                lineHeight: 1.5,
              }}
            >
              The full SKILL.md ({formatTokenCount(approximateTokens(detail.skill_md_content))} tokens) unlocks after purchase.
              Use the <strong style={{ color: "var(--accent)" }}>Buy ${detail.priceUsd}</strong> button above to checkout via Stripe.
            </p>
          </div>
        ) : (
          <details
            style={{
              marginTop: 32,
              border: "1px solid var(--rule)",
              background: "var(--surface)",
            }}
          >
            <summary
              style={{
                padding: "16px 24px",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-muted)",
                letterSpacing: "0.06em",
                userSelect: "none",
              }}
            >
              Show SKILL.md content (~{formatTokenCount(approximateTokens(detail.skill_md_content))} tokens)
            </summary>
            <div style={{ position: "relative" }}>
              <CopyContentButton text={detail.skill_md_content} label="Copy SKILL.md" />
              <pre
                style={{
                  margin: 0,
                  padding: 24,
                  borderTop: "1px solid var(--rule)",
                  maxHeight: 480,
                  overflow: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--fg)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {detail.skill_md_content}
              </pre>
            </div>
          </details>
        )
      )}
    </Section>
  );
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

function PremiumDownloadSection({ detail, downloadUrl, isAuthored }) {
  const filename = (detail.privateStoragePath || "").split("/").pop() || "SKILL.md";
  return (
    <Section eyebrow="§ 02b — Premium download" markerColor="var(--sage)" paddingY={64}>
      <SectionHeader
        title={
          <>
            Your <em style={{ color: "var(--accent)" }}>exclusive</em> payload.
          </>
        }
        subtitle={
          isAuthored
            ? "This is the file buyers receive after checkout. Re-submit the listing with a new upload to ship a v2."
            : "Stored in a private bucket; the link below is signed to your account and rotates every 7 days. Refresh this page if the download stops working."
        }
      />
      <div
        style={{
          marginTop: 32,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "28px 28px",
          border: "1px solid var(--sage)",
          background: "rgba(63, 125, 79, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              File
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--fg)",
              }}
            >
              {filename}
            </span>
          </div>
          <a
            href={downloadUrl}
            download={filename}
            className="vz-btn-primary"
            style={{
              padding: "14px 22px",
              background: "var(--sage)",
              color: "var(--bg)",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Download {filename} <span style={{ fontFamily: "var(--font-mono)" }}>↓</span>
          </a>
        </div>
      </div>
    </Section>
  );
}

function CommandBlock({ label, command, primary = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: primary ? "var(--accent)" : "var(--fg-muted)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "relative",
          padding: "18px 56px 18px 20px",
          border: primary ? "1px solid var(--accent)" : "1px solid var(--rule-strong)",
          background: primary ? "var(--accent-soft)" : "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: primary ? 14 : 13,
          color: "var(--fg)",
          overflowX: "auto",
        }}
      >
        <span style={{ color: "var(--accent)" }}>$</span>
        <code style={{ whiteSpace: "nowrap" }}>{command}</code>
        <CopyContentButton text={command} label="Copy" />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ color: "var(--fg)", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  
  // Parallel data fetching - get everything we can at once
  const [detail, user] = await Promise.all([
    getSkillBySlug(slug),
    getCurrentUser(),
  ]);
  
  if (!detail) notFound();
  const meta = detail.metadata || {};
  
  // Fetch remaining data in parallel
  const [siblings, disagreement, repoRegistry, owned, authored] = await Promise.all([
    getSiblingSkills(slug, 3),
    getJudgeDisagreement({ kind: "skill", subjectId: detail.id }),
    meta.owner && meta.repo ? getRegistryByRepo(meta.owner, meta.repo) : Promise.resolve(null),
    getOwnedSlugs(user?.id),
    getAuthoredSlugs(user?.id),
  ]);
  
  const repoBundleHref =
    repoRegistry &&
    repoRegistry.skills.length + repoRegistry.claudeMds.length > 1 &&
    meta.owner &&
    meta.repo
      ? `/repo/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`
      : null;
  
  const isOwned = owned.skills.has(slug);
  const isAuthored = authored.skills.has(slug);

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

  // Mint a fresh signed URL on every render — cheap, server-only, never
  // shipped to clients who shouldn't have it (we gate on isOwned/isAuthored
  // before calling). This dodges any "my cached URL expired" complaints.
  let premiumDownloadUrl = null;
  if ((isOwned || isAuthored) && detail.privateStoragePath) {
    const signed = await signPremiumDownloadUrl(detail.privateStoragePath);
    if (signed.url) premiumDownloadUrl = signed.url;
  }

  return (
    <div style={{ position: "relative" }}>
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
              {(() => {
                const ghHref = `https://${detail.github}`;
                const btnBase = {
                  padding: "16px 24px",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                };
                // Free tier or already owned/authored → primary action is GitHub access.
                if (detail.tier === "free" || isOwned || isAuthored) {
                  const label =
                    detail.tier === "free"
                      ? "View on GitHub"
                      : isAuthored
                        ? "◆ Yours · Open on GitHub"
                        : "✓ Owned · Open on GitHub";
                  const bg =
                    isAuthored
                      ? "var(--azure)"
                      : isOwned
                        ? "var(--sage)"
                        : "var(--fg)";
                  return (
                    <a
                      href={ghHref}
                      target="_blank"
                      rel="noreferrer"
                      className="vz-btn-primary"
                      style={{ ...btnBase, background: bg, color: "var(--bg)" }}
                    >
                      {label} <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
                    </a>
                  );
                }
                // Premium / featured, not owned, not authored → Buy CTA.
                return (
                  <Link
                    href={`/buy/skill/${detail.slug}`}
                    className="vz-btn-primary"
                    style={{ ...btnBase, background: "var(--accent)", color: "var(--bg)" }}
                  >
                    Buy · ${detail.priceUsd}{" "}
                    <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
                  </Link>
                );
              })()}
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
              {isAuthored && (
                <Link
                  href={`/promote/skill/${detail.slug}`}
                  style={{
                    padding: "16px 24px",
                    textDecoration: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "var(--bg)",
                    background: "var(--amber)",
                    border: "1px solid var(--amber)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  title="Pay to feature this item at the top of /marketplace for 30 days"
                >
                  {detail.isBoosted ? "Extend boost" : "◆ Boost this skill"}{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
                </Link>
              )}
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

      <InstallSection
        detail={detail}
        isOwned={isOwned}
        isAuthored={isAuthored}
        repoBundleHref={repoBundleHref}
        bundleTotal={
          repoRegistry ? repoRegistry.skills.length + repoRegistry.claudeMds.length : 0
        }
      />

      {premiumDownloadUrl && (
        <PremiumDownloadSection
          detail={detail}
          downloadUrl={premiumDownloadUrl}
          isAuthored={isAuthored}
        />
      )}

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
