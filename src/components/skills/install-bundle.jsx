"use client";

import { Section, SectionHeader } from "@/components/section";
import { EmbedBadgeBlock } from "@/components/embed-badge-block";
import { CopyContentButton } from "@/components/copy-content-button";
import { approximateTokens, formatTokenCount } from "@/lib/utils";
import { useSkillContext } from "./skill-user-gate";

/**
 * Bloc d'installation user-aware pour /skills/[slug] et
 * /claude-md/[category]/[slug]. Anciennement Server Component dans
 * page.js, migré Client mai 2026 pour permettre à la page d'être
 * ISR-cacheable sans cookies au top-level. Voir
 * src/components/skills/skill-user-gate.jsx pour le rationale CPU.
 *
 * État par défaut (anonymous SSR) : isOwned=false, isAuthored=false.
 * Si user owned/authored après hydratation, le bloc swap pour montrer
 * les vraies install commands + le download premium signed.
 *
 * Use kind="skill" pour SKILL.md (default), kind="claude_md" pour CLAUDE.md.
 */
export function SkillInstallBundle({
  detail,
  kind = "skill",
  slug,
  repoBundleHref,
  bundleTotal,
}) {
  const ctx = useSkillContext({ slug, kind });
  const isOwned = ctx?.isOwned ?? false;
  const isAuthored = ctx?.isAuthored ?? false;
  const premiumDownloadUrl = ctx?.premiumDownloadUrl ?? null;

  return (
    <>
      <InstallSection
        detail={detail}
        isOwned={isOwned}
        isAuthored={isAuthored}
        repoBundleHref={repoBundleHref}
        bundleTotal={bundleTotal}
      />
      {premiumDownloadUrl && (
        <PremiumDownloadSection
          detail={detail}
          downloadUrl={premiumDownloadUrl}
          isAuthored={isAuthored}
        />
      )}
    </>
  );
}

function formatDate(s) {
  if (!s) return null;
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function InstallSection({
  detail,
  isOwned,
  isAuthored,
  repoBundleHref,
  bundleTotal,
}) {
  const meta = detail.metadata || {};
  const repoPath = meta.path || "SKILL.md";
  const repoFull =
    meta.owner && meta.repo ? `${meta.owner}/${meta.repo}` : null;
  const cloneCmd = repoFull
    ? `git clone https://github.com/${repoFull}.git`
    : null;
  const skillType = meta.skill_type || "minimal";
  const license = meta.license;
  const updatedAt = formatDate(meta.pushed_at);

  const isPremium = detail.tier && detail.tier !== "free";
  const showInstallCommands = !isPremium || isOwned || isAuthored;

  let subtitle;
  if (isAuthored) {
    subtitle =
      "Yours. Edit the SKILL.md in the source repo and the new version syncs at the next scrape. Buyers get the same access path you do.";
  } else if (isOwned) {
    subtitle =
      "You purchased this. Clone the repo or copy the file directly. Updates roll in as the author pushes them.";
  } else if (isPremium) {
    subtitle = `Premium · $${detail.priceUsd}. Buying supports the author (70/30 split) and surfaces the item with the verified ribbon. The SKILL.md itself is in a public GitHub repo — you can preview the source below before deciding.`;
  } else {
    subtitle =
      "Free SKILL.md scraped from GitHub. Clone the repo or copy the file directly into your Claude Code skills directory.";
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
              Install instructions unlock after purchase. The underlying
              SKILL.md is hosted on a public GitHub repo — buying gives you the
              verified badge, supports the author (70%), and prioritises this
              item in search and category browsing.
              <br />
              <br />
              Use the Buy button above to checkout via Stripe.
            </div>
          )}
        </div>

        <div
          className="vz-field-card"
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
                  style={{
                    color: "var(--fg)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--accent)",
                  }}
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
            <Field
              label="Bundle"
              value={`${meta.bundle_files.length} file${meta.bundle_files.length > 1 ? "s" : ""}`}
            />
          )}
          {detail.qualityScore != null && (
            <Field
              label="Quality"
              value={
                <span
                  title={
                    detail.qualityRationale ||
                    "LLM-rated quality (clarity, specificity, completeness, structure, usefulness)"
                  }
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
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontStyle: "normal",
              color: "var(--azure)",
              letterSpacing: "0.06em",
              fontSize: 10,
              textTransform: "uppercase",
              marginRight: 10,
            }}
          >
            Quality {Number(detail.qualityScore).toFixed(1)} ·
          </span>
          {detail.qualityRationale}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {isAuthored ? "Show this rank — your skill" : "Show this rank"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(20px, 2.4vw, 26px)",
                letterSpacing: "-0.01em",
                color: "var(--fg)",
              }}
            >
              {isAuthored ? (
                <>
                  Add this badge to your <em style={{ color: "var(--accent)" }}>README</em>.
                </>
              ) : (
                <>
                  Embed this skill&apos;s rank{" "}
                  <em style={{ color: "var(--accent)" }}>anywhere</em>.
                </>
              )}
            </span>
            <span
              style={{
                fontFamily: "var(--font-geist)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--fg-muted)",
                maxWidth: 540,
              }}
            >
              {isAuthored
                ? "Authors who add the Versuz badge to their README get 3-5x more clicks on their skill page. Markdown for GitHub, HTML for blogs, or just the SVG URL for Notion / Linear / Discord."
                : "Paste the snippet into a README, Notion page, Linear ticket, blog post — anywhere. Updates live as the rank changes."}
            </span>
          </div>
        </div>
        <EmbedBadgeBlock kind="skill" slug={detail.slug} name={detail.name} />
      </div>

      {detail.skill_md_content &&
        (isPremium && !isOwned && !isAuthored ? (
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
                maskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
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
              The full SKILL.md (
              {formatTokenCount(approximateTokens(detail.skill_md_content))}{" "}
              tokens) unlocks after purchase. Use the{" "}
              <strong style={{ color: "var(--accent)" }}>
                Buy ${detail.priceUsd}
              </strong>{" "}
              button above to checkout via Stripe.
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
              Show SKILL.md content (~
              {formatTokenCount(approximateTokens(detail.skill_md_content))}{" "}
              tokens)
            </summary>
            <div style={{ position: "relative" }}>
              <CopyContentButton
                text={detail.skill_md_content}
                label="Copy SKILL.md"
              />
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
        ))}
    </Section>
  );
}

function PremiumDownloadSection({ detail, downloadUrl, isAuthored }) {
  const filename =
    (detail.privateStoragePath || "").split("/").pop() || "SKILL.md";
  return (
    <Section
      eyebrow="§ 02b — Premium download"
      markerColor="var(--sage)"
      paddingY={64}
    >
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
            Download {filename}{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>↓</span>
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
        className={`vz-cmd-block${primary ? " vz-cmd-block-primary" : ""}`}
        style={{
          position: "relative",
          padding: "18px 56px 18px 20px",
          border: primary
            ? "1px solid var(--accent)"
            : "1px solid var(--rule-strong)",
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
      <span
        style={{
          color: "var(--fg)",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}
