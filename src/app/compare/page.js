import Link from "next/link";
import { PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { getSkillBySlug, getClaudeMdBySlug } from "@/lib/queries/rankings";
import { approximateTokens, formatTokenCount } from "@/lib/utils";

export const metadata = {
  title: "Compare — Versuz",
  description:
    "Side-by-side comparison of two SKILL.md or CLAUDE.md from the Versuz registry.",
};

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

/**
 * Load a subject by slug. If `kind` is explicit, try that first; otherwise
 * try skill, then fall back to claude_md. Returns the loaded item along
 * with the kind that hit, so the caller knows which type the URL resolved to.
 */
async function loadSubjectAuto(kind, slug) {
  if (!slug) return { item: null, kind: null };
  if (kind === "claude-md") {
    const item = await getClaudeMdBySlug(slug);
    return { item, kind: item ? "claude-md" : null };
  }
  if (kind === "skill") {
    const item = await getSkillBySlug(slug);
    if (item) return { item, kind: "skill" };
    // Auto-fallback : maybe the user typed the wrong kind in the URL.
    const cm = await getClaudeMdBySlug(slug);
    return { item: cm, kind: cm ? "claude-md" : null };
  }
  return { item: null, kind: null };
}

export default async function ComparePage({ searchParams }) {
  const params = (await searchParams) || {};
  const requestedKind = params.kind === "claude-md" ? "claude-md" : "skill";
  const slugA = params.a || null;
  const slugB = params.b || null;

  const [resA, resB] = await Promise.all([
    loadSubjectAuto(requestedKind, slugA),
    loadSubjectAuto(requestedKind, slugB),
  ]);
  const a = resA.item;
  const b = resB.item;
  // Resolve effective kind : both items must agree, else mismatch.
  const kind = resA.kind || resB.kind || requestedKind;
  const kindMismatch = a && b && resA.kind !== resB.kind;

  if (!slugA || !slugB || !a || !b || kindMismatch) {
    return (
      <div>
        <PageHero
          eyebrow="Compare"
          title={
            <>
              Pick <em style={{ color: "var(--accent)" }}>two</em>.
            </>
          }
          subtitle="Sélectionne 2 items dans la marketplace via la checkbox sur chaque card, puis click 'Compare' dans la barre du bas."
        />
        <section
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {!slugA || !slugB ? (
            <p>
              Missing one or both slugs. Browse the{" "}
              <Link href="/marketplace" className="vz-link">
                marketplace
              </Link>{" "}
              and tick 2 checkboxes.
            </p>
          ) : kindMismatch ? (
            <p>
              Can&apos;t compare a skill with a CLAUDE.md — they&apos;re different
              entity types. Pick two of the same kind from{" "}
              <Link href="/marketplace" className="vz-link">marketplace</Link>.
            </p>
          ) : (
            <p>
              {!a && <>&ldquo;{slugA}&rdquo; not found. </>}
              {!b && <>&ldquo;{slugB}&rdquo; not found. </>}
              Browse the{" "}
              <Link href="/marketplace" className="vz-link">
                marketplace
              </Link>{" "}
              to find slugs.
            </p>
          )}
        </section>
      </div>
    );
  }

  const isSkill = kind === "skill";
  const titleOf = (it) =>
    isSkill ? it.name : `${it.author || ""}/${it.repo || it.slug}`;
  const subtitleOf = (it) =>
    isSkill ? `${it.category} · ${it.author || "?"}` : it.project_category;
  const detailHrefOf = (it) =>
    isSkill
      ? `/skills/${it.slug}`
      : `/claude-md/${it.project_category || "generic"}/${it.slug}`;

  const rows = [
    ["Tier", (it) => <TierBadge tier={it.tier} priceUsd={it.priceUsd} size="sm" />],
    ["Verification", (it) => <VerificationBadge level={it.verificationLevel} showLabel />],
    ["Prior", (it) => <Mono>{it.prior ?? "—"}</Mono>],
    ["Stars", (it) => <Mono>{formatCount(it.stars)}</Mono>],
    ["Forks", (it) => <Mono>{formatCount(it.forks)}</Mono>],
    ...(isSkill
      ? [
          ["Skill type", (it) => <Mono>{it.metadata?.skill_type || "—"}</Mono>],
          [
            "Bundle",
            (it) =>
              <Mono>
                {it.metadata?.bundle_files?.length
                  ? `${it.metadata.bundle_files.length} file${it.metadata.bundle_files.length > 1 ? "s" : ""}`
                  : "—"}
              </Mono>,
          ],
          ["Tools", (it) => <Mono>{(it.metadata?.tools || []).join(", ") || "—"}</Mono>],
        ]
      : [
          ["Tokens", (it) => <Mono>{it.word_count ? `~${formatCount(Math.round(it.word_count * 1.3))}` : "—"}</Mono>],
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
      (it) =>
        <Mono>
          ~{formatTokenCount(approximateTokens(isSkill ? it.skill_md_content : it.content))} tokens
        </Mono>,
    ],
  ];

  const description = (it) => it.description || null;
  const contentOf = (it) => (isSkill ? it.skill_md_content : it.content);

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
          {rows.map(([label, render], i) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr",
                gap: 24,
                padding: "16px 0",
                borderBottom: i === rows.length - 1 ? "1px solid var(--rule)" : "1px solid var(--rule)",
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
