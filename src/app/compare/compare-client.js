"use client";

import React from "react";
import Link from "next/link";
import { PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { approximateTokens, formatTokenCount } from "@/lib/utils";

function formatCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function Mono({ children }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--fg)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}

// Judge model labels for display
const JUDGE_LABELS = {
  "anthropic/claude-haiku-4-5": "Haiku 4.5",
  "deepseek/deepseek-v4-flash": "DeepSeek V4 Flash",
  "openai/gpt-5-mini": "GPT-5 mini",
};

function description(it) {
  return it.description || null;
}

export default function CompareClientWrapper({
  a,
  b,
  kind,
  isSkill,
  disagreementA,
  disagreementB,
}) {
  const [eloExpanded, setEloExpanded] = React.useState(false);

  const titleOf = (it) =>
    isSkill ? it.name : `${it.author || ""}/${it.repo || it.slug}`;
  const subtitleOf = (it) =>
    isSkill ? `${it.category} · ${it.author || "?"}` : it.project_category;
  const detailHrefOf = (it) =>
    isSkill
      ? `/skills/${it.slug}`
      : `/claude-md/${it.project_category || "generic"}/${it.slug}`;
  const contentOf = (it) => (isSkill ? it.skill_md_content : it.content);

  const hasElo = a.elo != null || b.elo != null;
  const hasDisagreement = disagreementA || disagreementB;

  const rows = [
    ["Tier", (it) => <TierBadge tier={it.tier} priceUsd={it.priceUsd} size="sm" />],
    ["Verification", (it) => <VerificationBadge level={it.verificationLevel} showLabel />],
    ["Quality score", (it) => <Mono>{it.qualityScore != null ? it.qualityScore.toFixed(1) : "—"}</Mono>],
    [
      "ELO score",
      (it) => {
        if (it.elo == null) return <Mono>—</Mono>;
        return (
          <button
            onClick={() => setEloExpanded((p) => !p)}
            style={{
              background: "none",
              border: "none",
              padding: "4px 8px",
              margin: "-4px -8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--fg)",
              fontVariantNumeric: "tabular-nums",
              borderRadius: 2,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            title="Click to see judge breakdown"
          >
            {it.elo.toFixed(1)}
            <span
              style={{
                fontSize: 11,
                color: "var(--accent)",
                display: "inline-block",
                transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: eloExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              →
            </span>
          </button>
        );
      },
    ],
    ["Prior", (it) => <Mono>{it.prior ?? "—"}</Mono>],
    ["Stars", (it) => <Mono>{formatCount(it.stars)}</Mono>],
    ["Forks", (it) => <Mono>{formatCount(it.forks)}</Mono>],
    ...(isSkill
      ? [
          ["Skill type", (it) => <Mono>{it.metadata?.skill_type || "—"}</Mono>],
          [
            "Bundle",
            (it) => (
              <Mono>
                {it.metadata?.bundle_files?.length
                  ? `${it.metadata.bundle_files.length} file${it.metadata.bundle_files.length > 1 ? "s" : ""}`
                  : "—"}
              </Mono>
            ),
          ],
          ["Tools", (it) => <Mono>{(it.metadata?.tools || []).join(", ") || "—"}</Mono>],
        ]
      : [
          [
            "Tokens",
            (it) => (
              <Mono>
                {it.word_count ? `~${formatCount(Math.round(it.word_count * 1.3))}` : "—"}
              </Mono>
            ),
          ],
          ["Language", (it) => <Mono>{it.metadata?.language || "—"}</Mono>],
        ]),
    ["License", (it) => <Mono>{it.metadata?.license || "—"}</Mono>],
    ["Last update", (it) => <Mono>{formatDate(it.metadata?.pushed_at || it.pushedAt)}</Mono>],
    [
      "Topics",
      (it) =>
        Array.isArray(it.topics) && it.topics.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
            {it.topics.slice(0, 6).map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "2px 8px",
                  border: "1px solid var(--rule)",
                  color: "var(--fg-muted)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <Mono>—</Mono>
        ),
    ],
    [
      "Content size",
      (it) => (
        <Mono>
          ~{formatTokenCount(approximateTokens(isSkill ? it.skill_md_content : it.content))} tokens
        </Mono>
      ),
    ],
  ];

  return (
    <div>
      <PageHero
        eyebrow="Compare"
        title={
          <>
            Side by <em style={{ color: "var(--accent)" }}>side</em>.
          </>
        }
        subtitle="Two registry items, all fields aligned. Switch the type via the URL — kind=skill or kind=claude-md."
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        {/* Headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 1fr",
            gap: 24,
            paddingBottom: 24,
            borderBottom: "1px solid var(--rule-strong)",
          }}
          className="vz-compare-grid"
        >
          <div />
          {[a, b].map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                href={detailHrefOf(it)}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                  textDecoration: "none",
                  lineHeight: 1.05,
                  wordBreak: "break-word",
                }}
              >
                {titleOf(it)}
              </Link>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {subtitleOf(it)}
              </span>
              {description(it) && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--fg-muted)",
                  }}
                >
                  {description(it)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="vz-compare-grid">
          {rows.map(([label, render]) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr",
                gap: 24,
                padding: "16px 0",
                borderBottom: "1px solid var(--rule)",
                alignItems: "center",
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
              <div style={{ textAlign: "right" }}>{render(a)}</div>
              <div style={{ textAlign: "right" }}>{render(b)}</div>
            </div>
          ))}
        </div>

        {/* ELO Breakdown — inline accordion */}
        {hasElo && (
          <div
            style={{
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
              maxHeight: eloExpanded ? 1600 : 0,
              opacity: eloExpanded ? 1 : 0,
            }}
          >
            <div
              style={{
                borderBottom: "1px solid var(--rule)",
                padding: "40px 0",
              }}
            >
              {/* Composite ELO — same grid as comparison rows */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 1fr",
                  gap: 24,
                  padding: "16px 0 24px",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "center",
                }}
                className="vz-compare-grid"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      background: "var(--accent)",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    Score
                  </span>
                </div>
                {[a, b].map((it, i) => (
                  <div key={i} style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(36px, 4vw, 56px)",
                        fontWeight: 400,
                        fontStyle: "italic",
                        color: "var(--accent)",
                        letterSpacing: "-0.04em",
                        lineHeight: 0.9,
                        fontVariantNumeric: "tabular-nums",
                        paddingRight: "0.1em",
                      }}
                    >
                      {it.elo != null ? it.elo.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Per-judge breakdown */}
              {hasDisagreement ? (
                <div>
                  {/* Collect all unique judge models from both sides */}
                  {(() => {
                    const judgesA = disagreementA?.judges || [];
                    const judgesB = disagreementB?.judges || [];
                    const allModels = Array.from(
                      new Set([
                        ...judgesA.map((j) => j.model),
                        ...judgesB.map((j) => j.model),
                      ])
                    ).sort();
                    const byModelA = Object.fromEntries(judgesA.map((j) => [j.model, j]));
                    const byModelB = Object.fromEntries(judgesB.map((j) => [j.model, j]));

                    if (allModels.length === 0) return null;

                    return (
                      <>
                        {/* Table header */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "180px 1fr 1fr",
                            gap: 24,
                            paddingBottom: 12,
                            borderBottom: "1px solid var(--rule-strong)",
                          }}
                          className="vz-compare-grid"
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
                            Judge
                          </span>
                          {[a, b].map((it, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--fg-muted)",
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                textAlign: "right",
                              }}
                            >
                              {titleOf(it).slice(0, 25)}
                              {titleOf(it).length > 25 ? "…" : ""}
                            </span>
                          ))}
                        </div>

                        {/* Per-judge rows */}
                        {allModels.map((model, mi) => {
                          const ja = byModelA[model];
                          const jb = byModelB[model];
                          return (
                            <div
                              key={model}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "180px 1fr 1fr",
                                gap: 24,
                                padding: "20px 0",
                                borderBottom:
                                  mi < allModels.length - 1
                                    ? "1px solid var(--rule)"
                                    : "none",
                                alignItems: "start",
                              }}
                              className="vz-compare-grid"
                            >
                              {/* Judge name + weight */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 16,
                                    color: "var(--fg)",
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  {JUDGE_LABELS[model] || model.split("/").pop()}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    color: "var(--fg-muted)",
                                    letterSpacing: "0.12em",
                                  }}
                                >
                                  {ja?.count || jb?.count || 0} scores
                                </span>
                              </div>

                              {/* Score A */}
                              <JudgeScoreCell judge={ja} />

                              {/* Score B */}
                              <JudgeScoreCell judge={jb} />
                            </div>
                          );
                        })}

                        {/* Agreement label */}
                        {(disagreementA || disagreementB) && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "180px 1fr 1fr",
                              gap: 24,
                              paddingTop: 16,
                            }}
                            className="vz-compare-grid"
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
                              Agreement
                            </span>
                            {[disagreementA, disagreementB].map((d, i) => (
                              <div key={i} style={{ textAlign: "right" }}>
                                {d ? (
                                  <span
                                    style={{
                                      fontFamily: "var(--font-mono)",
                                      fontSize: 11,
                                      color:
                                        d.agreementLabel === "high"
                                          ? "var(--accent)"
                                          : d.agreementLabel === "mid"
                                            ? "var(--fg-muted)"
                                            : "var(--danger)",
                                      letterSpacing: "0.12em",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {d.agreementLabel} · σ{d.stdev.toFixed(1)}
                                  </span>
                                ) : (
                                  <Mono>—</Mono>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                    margin: 0,
                  }}
                >
                  No granular judge scores available yet — ELO is computed from
                  arena match history.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content side-by-side */}
        {(contentOf(a) || contentOf(b)) && (
          <div style={{ marginTop: 64 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: "var(--fg)",
                marginBottom: 24,
              }}
            >
              Content
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
              className="vz-compare-content"
            >
              {[a, b].map((it, i) => (
                <pre
                  key={i}
                  style={{
                    margin: 0,
                    padding: 24,
                    border: "1px solid var(--rule)",
                    background: "var(--surface)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    lineHeight: 1.55,
                    color: "var(--fg)",
                    maxHeight: 520,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {contentOf(it) || "(no content)"}
                </pre>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Single judge score cell — mirrors the skill detail page §02 Rationale aesthetic.
 */
function JudgeScoreCell({ judge }) {
  if (!judge) {
    return (
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg-muted)",
          }}
        >
          —
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--accent)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            paddingRight: "0.08em",
          }}
        >
          {judge.avg.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
          }}
        >
          / 100
        </span>
      </div>
      {judge.sampleRationale && (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            lineHeight: 1.4,
            color: "var(--fg-muted)",
            fontStyle: "italic",
            textAlign: "right",
            maxWidth: "100%",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          &ldquo;{judge.sampleRationale.slice(0, 100)}
          {judge.sampleRationale.length > 100 ? "…" : ""}&rdquo;
        </p>
      )}
    </div>
  );
}
