import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { OfficialBadge } from "@/components/marketplace/official-badge";
import { getClaudeMdBySlug, getRegistryByRepo } from "@/lib/queries/rankings";
import { approximateTokens, formatTokenCount } from "@/lib/utils";
import { EmbedBadgeBlock } from "@/components/embed-badge-block";
import { CopyContentButton } from "@/components/copy-content-button";
import { RepoBundleCallout } from "@/components/site/repo-bundle-callout";
import {
  ClaudeMdFreeContentBlock,
  ClaudeMdPremiumContentBlock,
} from "@/components/claude-md/premium-content-block";

// ISR 1h. La page ne lit plus de cookies au top-level (mai 2026 refactor,
// suit le même pattern que /skills/[slug]) : le bloc paywalled / download
// signed URL est un Client Component (<ClaudeMdPremiumContentBlock>) qui
// fetch /api/v1/me/skill-context?kind=claude_md après hydratation. Du coup
// `revalidate` reprend du sens et le shell peut être pre-rendered + cached.
//
// Avant : Vercel Speed Insights score 35 (Poor) car chaque request était
// dynamic (cookies au top-level). Après : shell statique servi via ISR.
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const file = await getClaudeMdBySlug(slug);
  if (!file) return { title: "CLAUDE.md not found — Versuz" };
  const repoFull = file.author && file.repo ? `${file.author}/${file.repo}` : file.slug;
  return {
    title: `${repoFull} CLAUDE.md — Versuz`,
    description: file.description || `${repoFull} project context file. ${file.word_count ? `~${Math.round(file.word_count * 1.3)}` : "?"} tokens.`,
  };
}

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

export default async function ClaudeMdDetailPage({ params }) {
  const { category, slug } = await params;
  const detail = await getClaudeMdBySlug(slug);
  if (!detail) notFound();
  if (detail.project_category !== category) {
    // canonical redirect-equivalent: 404 if URL doesn't match the actual category
    notFound();
  }

  const meta = detail.metadata || {};
  const repoFull = detail.author && detail.repo ? `${detail.author}/${detail.repo}` : null;
  const updatedAt = formatDate(meta.pushed_at);
  const license = meta.license;
  const language = meta.language;

  // Top-level fetches : pas de lecture cookies pour préserver l'ISR. Les
  // données user-conditional (owned/authored/premium signed URL) sont
  // récupérées côté client via /api/v1/me/skill-context?kind=claude_md,
  // voir <ClaudeMdPremiumContentBlock>.
  const repoRegistry =
    meta.owner && meta.repo ? await getRegistryByRepo(meta.owner, meta.repo) : null;
  const repoBundleHref =
    repoRegistry &&
    repoRegistry.skills.length + repoRegistry.claudeMds.length > 1 &&
    meta.owner &&
    meta.repo
      ? `/repo/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`
      : null;

  const isPremium = detail.tier && detail.tier !== "free";

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

  return (
    <div style={{ position: "relative" }}>
      <section
        style={{
          position: "relative",
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
          maxWidth: 1440,
          margin: "0 auto",
          overflow: "hidden",
        }}
      >
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
            <Link
              href="/marketplace?type=claude-md"
              className="vz-nav-link"
              style={{ color: "var(--fg-muted)", textDecoration: "none" }}
            >
              ← Marketplace
            </Link>
            <span>{detail.project_category}</span>
          </div>
        </Reveal>

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
            <span>{detail.project_category}</span>
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
              fontSize: "clamp(48px, 7vw, 112px)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
              color: "var(--fg)",
              wordBreak: "break-word",
            }}
          >
            {repoFull || detail.slug}
          </h1>
        </Reveal>

        {detail.description && (
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
        )}

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
          <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {detail.github && (
              <a
                href={`https://${detail.github}`}
                target="_blank"
                rel="noreferrer"
                className="vz-btn-primary"
                style={{
                  background: "var(--fg)",
                  color: "var(--bg)",
                  padding: "16px 24px",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                View on GitHub <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
              </a>
            )}
            {(detail.verificationLevel ?? 0) < 1 && detail.metadata?.owner && (
              <Link
                href={`/claim/claude-md/${detail.slug}`}
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
                title={`If you're @${detail.metadata.owner} on GitHub, claim this CLAUDE.md.`}
              >
                Yours? Claim it{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
              </Link>
            )}
          </div>
        </Reveal>
      </section>

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
      </Section>

      <Section eyebrow="§ 02 — Use" markerColor="var(--azure)" paddingY={80}>
        <SectionHeader
          title={
            <>
              Drop into your <em style={{ color: "var(--accent)" }}>project</em>.
            </>
          }
          subtitle="A CLAUDE.md is just a markdown file at the root of your repo. Copy the content below into your own project's CLAUDE.md to give your agent the same context."
        />

        {repoBundleHref && (
          <div style={{ marginTop: 28, maxWidth: 920 }}>
            <RepoBundleCallout
              compact
              href={repoBundleHref}
              owner={meta.owner}
              repo={meta.repo}
              total={repoRegistry.skills.length + repoRegistry.claudeMds.length}
            />
          </div>
        )}

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
            <CommandBlock
              label="One-line install · current directory"
              command={`npx versuz@latest install ${detail.slug} --kind=claude-md`}
              primary
            />
            {repoFull && (
              <CommandBlock
                label="Or curl directly"
                command={`curl -o CLAUDE.md https://raw.githubusercontent.com/${repoFull}/HEAD/CLAUDE.md`}
              />
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
            <Field label="Project type" value={detail.project_category} />
            <Field label="Tokens" value={detail.word_count ? `~${Math.round(detail.word_count * 1.3).toLocaleString()}` : "—"} />
            <Field label="License" value={license || "—"} />
            <Field label="Language" value={language || "—"} />
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
            {detail.qualityScore != null && (
              <Field
                label="Quality"
                value={
                  <span
                    title={detail.qualityRationale || "LLM-rated quality"}
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
          <EmbedBadgeBlock
            kind="claude-md"
            slug={detail.slug}
            name={repoFull || detail.slug}
          />
        </div>

        {detail.content &&
          (isPremium ? (
            <ClaudeMdPremiumContentBlock
              slug={detail.slug}
              teaser={(detail.content || "").slice(0, 500)}
              tokenCount={formatTokenCount(approximateTokens(detail.content))}
              priceUsd={detail.priceUsd}
            />
          ) : (
            <ClaudeMdFreeContentBlock
              content={detail.content}
              tokenCount={formatTokenCount(approximateTokens(detail.content))}
            />
          ))}
      </Section>
    </div>
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
