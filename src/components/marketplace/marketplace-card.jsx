import Link from "next/link";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { OfficialBadge } from "@/components/marketplace/official-badge";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { HairBar } from "@/components/hair-bar";
import { approximateTokens, formatTokenCount } from "@/lib/utils";

// SPDX licenses qui sont restrictives (copyleft fort) — on les flag visuellement
// pour informer l'user qu'installer = obligations légales (disclosure du code
// dérivé sur AGPL, du source des modifs sur GPL).
const RESTRICTIVE_LICENSES = new Set(["GPL-3.0", "GPL-2.0", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1"]);
// Permissives — affiché en gris discret (info utile sans alarmer)
const PERMISSIVE_LICENSES = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Unlicense", "0BSD", "CC0-1.0"]);

const SOURCE_LABELS = {
  github: "GitHub",
  sourcegraph: "Sourcegraph",
  aggregator: "Awesome list",
  searchcode: "searchcode",
  submit: "Submitted",
  cli: "CLI submit",
  gitlab: "GitLab",
};

/**
 * Returns a human-readable relative time string from an ISO date string.
 */
function relativeTime(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < day) return "today";
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  if (diff < 365 * day) return `${Math.round(diff / (30 * day))}mo ago`;
  return `${Math.round(diff / (365 * day))}y ago`;
}

/**
 * Square-ish card for marketplace browsing. Used in the grid view.
 * Works for both skills and CLAUDE.md (kind switches a few labels).
 */
export function MarketplaceCard({
  item,
  kind = "skill",
  leader = false,
  owned = false,
  authored = false,
  compareChecked = false,
  onCompareToggle = null,
  featured = false,
  sponsored = false, // boosted OR featured tier → taller card, description always shown
}) {
  // Featured tier OR explicit `featured` prop → card spans 2 grid cells.
  // Grid is `auto-flow: dense` so the wider card slots into gaps without
  // leaving holes in the layout.
  const isFeatured = featured || (item?.tier === "featured");
  const isLeader = leader && item.rank === 1;
  const href =
    kind === "skill"
      ? `/skills/${item.slug}`
      : `/claude-md/${item.project_category || "generic"}/${item.slug}`;
  const buyHref = `/buy/${kind === "skill" ? "skill" : "claude-md"}/${item.slug}`;
  const isBuyable = item.tier && item.tier !== "free" && item.priceUsd != null;
  // Priority: authored > owned > buyable. Authored = "Yours" (any tier).
  // Owned = "Owned" (post-purchase). Otherwise Buy if premium, no CTA if free.
  const ctaMode = authored ? "authored" : owned ? "owned" : isBuyable ? "buy" : null;
  const showCta = ctaMode !== null;

  const displayName =
    kind === "skill"
      ? item.name
      : `${item.author || "—"}/${item.repo || item.slug}`;

  const subline =
    kind === "skill"
      ? `${item.author} · ${item.category}`
      : (() => {
          // Token estimate hierarchy (post-Storage migration `content` is NULL,
          // so `word_count` generated col is NULL too) :
          //   1. word_count × 1.3   — generated col, when content still inline
          //   2. byte_count / 4     — backfilled from Storage object size
          //   3. metadata.byte_count (if real column not yet there)
          //   4. "?" fallback
          let approxTokens = null;
          if (item.word_count != null && item.word_count > 0) {
            approxTokens = Math.round(item.word_count * 1.3);
          } else if (item.byteCount != null && item.byteCount > 0) {
            approxTokens = Math.round(item.byteCount / 4);
          } else if (item.metadata?.byte_count != null) {
            approxTokens = Math.round(Number(item.metadata.byte_count) / 4);
          }
          return `${item.project_category} · ${approxTokens != null ? formatTokenCount(approxTokens) : "?"} tokens`;
        })();

  const isBoosted = !!item.isBoosted;

  return (
    <div
      className={`vz-mp-wrapper${isFeatured ? " vz-mp-featured" : ""}${isBoosted ? " vz-mp-boosted" : ""}${sponsored ? " vz-mp-sponsored" : ""}`}
      style={{
        position: "relative",
        height: "100%",
        gridColumn: isFeatured ? "span 2" : undefined,
      }}
    >
    {/* Diagonal BOOSTED ribbon — top-right corner, only when boosted */}
    {isBoosted && (
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 14,
          right: -32,
          zIndex: 4,
          padding: "4px 36px",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--bg)",
          background: "var(--amber)",
          transform: "rotate(35deg)",
          transformOrigin: "center",
          pointerEvents: "none",
          boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
        }}
      >
        ★ Boosted
      </span>
    )}
    {onCompareToggle && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCompareToggle();
        }}
        title={compareChecked ? "Remove from comparison" : "Add to comparison"}
        aria-pressed={compareChecked}
        data-checked={compareChecked ? "true" : "false"}
        className="vz-mp-checkbox"
        style={{
          // Stamp position : sit ON the top-left CORNER (half outside the
          // card) so it never overlaps in-card content like the tier badge.
          position: "absolute",
          top: -10,
          left: -10,
          zIndex: 3,
          width: 22,
          height: 22,
          padding: 0,
          border: `1px solid ${compareChecked ? "var(--accent)" : "var(--rule-strong)"}`,
          background: compareChecked ? "var(--accent)" : "var(--bg)",
          color: compareChecked ? "var(--bg)" : "transparent",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity .18s ease, background .15s ease, border-color .15s ease",
          boxShadow: compareChecked ? "0 2px 6px -2px rgba(194,65,12,0.4)" : "none",
        }}
      >
        ✓
      </button>
    )}
    <div
      className="vz-mp-card"
      style={{
        display: "flex",
        flexDirection: "column",
        color: "inherit",
        background: "var(--bg)",
        border: (() => {
          if (compareChecked) return "1px solid var(--accent)";
          if (isBoosted) return "2px solid var(--amber)";
          return "1px solid var(--rule)";
        })(),
        padding: showCta ? "16px 16px 44px" : "16px 16px 14px",
        gap: 10,
        height: "100%",
        minHeight: 220,
        position: "relative",
        transition: "border-color .15s ease, transform .2s ease, background .15s ease",
      }}
    >
      <Link
        href={href}
        prefetch={false}
        aria-label={`Open ${displayName}`}
        title={displayName}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          minHeight: 0,
          pointerEvents: "none",
        }}
      >
      {/* Top row: tier (+ boosted pill) + rank */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <TierBadge tier={item.tier} priceUsd={item.priceUsd} size="sm" />
          <OfficialBadge official={item.isOfficial} />
          {item.licenseSpdx && (() => {
            const restrictive = RESTRICTIVE_LICENSES.has(item.licenseSpdx);
            const permissive = PERMISSIVE_LICENSES.has(item.licenseSpdx);
            return (
              <span
                title={
                  restrictive
                    ? `License ${item.licenseSpdx} — copyleft, derivative work must disclose source.`
                    : permissive
                      ? `License ${item.licenseSpdx} — permissive (commercial reuse allowed).`
                      : `License ${item.licenseSpdx}`
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  color: restrictive ? "var(--crimson)" : "var(--fg-muted)",
                  background: "var(--surface)",
                  border: `1px solid ${restrictive ? "var(--crimson)" : "var(--rule)"}`,
                  textTransform: "uppercase",
                }}
              >
                {item.licenseSpdx}
              </span>
            );
          })()}
          {item.source && item.source !== "github" && SOURCE_LABELS[item.source] && (
            <span
              title={`Source : ${SOURCE_LABELS[item.source]}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 6px",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                color: "var(--azure)",
                background: "var(--surface)",
                border: "1px solid var(--rule)",
                textTransform: "uppercase",
              }}
            >
              {SOURCE_LABELS[item.source]}
            </span>
          )}
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          margin: "2px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: kind === "skill" ? 24 : 19,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "var(--fg)",
          wordBreak: "break-word",
        }}
      >
        {displayName}
      </h3>

      {/* Subline */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {subline}
      </span>

      {/* Multi-cat badges — additional categories beyond the primary one.
          Cap at 2 visible + "+N" overflow indicator. Discreet, not links. */}
      {Array.isArray(item.categories) && item.categories.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {item.categories.slice(1, 3).map((c) => (
            <span
              key={c}
              style={{
                padding: "1px 6px",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--fg-muted)",
                background: "var(--surface)",
                border: "1px solid var(--rule)",
                letterSpacing: "0.04em",
              }}
            >
              {c}
            </span>
          ))}
          {item.categories.length > 3 && (
            <span
              style={{
                padding: "1px 6px",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              +{item.categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bundle badge — shows when multiple registry rows share this GitHub repo */}
      {/* For CLAUDE.md: clickable link to repo bundle view. For skills: non-clickable badge only */}
      {item.metadata?.repoSkillCount > 1 && item.metadata?.owner && item.metadata?.repo && (
        kind === "skill" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
              width: "fit-content",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="5" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {item.metadata.repoSkillCount} in bundle
          </span>
        ) : (
          <Link
            href={`/repo/${encodeURIComponent(item.metadata.owner)}/${encodeURIComponent(item.metadata.repo)}`}
            prefetch={false}
            title={`This repo contains ${item.metadata.repoSkillCount} files — view all`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
              width: "fit-content",
              textDecoration: "none",
              pointerEvents: "auto",
              position: "relative",
              zIndex: 3,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="5" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {item.metadata.repoSkillCount} in bundle
          </Link>
        )
      )}


      {item.description && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--fg-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </p>
      )}

      {/* Sponsored cards show top 3 topics as small pills, like skillsmp */}
      {sponsored && Array.isArray(item.topics) && item.topics.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {item.topics.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                padding: "2px 7px",
                border: "1px solid var(--rule)",
                background: "var(--surface)",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Body sponsored label removed — TierBadge "FEATURED" + corner
          ribbon "★ Boosted" already convey the same info. */}

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Hair bar — win rate */}
      {item.winRate != null && (
        <HairBar
          value={item.winRate}
          color={item.winRate > 0.6 ? "var(--accent)" : "var(--fg-muted)"}
        />
      )}

      {/* Bottom row: stats — single line compacte, pas de wrap. Le score
          primaire (Elo > Quality > Prior) prend la couleur signature, les
          metas (★ ⑂ date) restent en muted. Tooltips conservés pour la
          sémantique. */}
      {(() => {
        let primaryValue = null;
        let primaryColor = "var(--fg)";
        let primaryTitle = "";
        if (item.elo != null) {
          // Bench score : 1 decimal (e.g. 64.2/100)
          primaryValue = Number(item.elo).toFixed(1);
          primaryColor = "var(--accent)";
          primaryTitle = "Bench score (0-100, 5-axis weighted)";
        } else if (item.qualityScore != null) {
          // Quality cold-start : 1 decimal
          primaryValue = Number(item.qualityScore).toFixed(1);
          primaryColor = "var(--azure)";
          primaryTitle = item.qualityRationale || "LLM-judged quality (5 axes, 0-100)";
        } else if (item.prior != null) {
          // Prior is on a different scale (600-2100) — integer ok
          primaryValue = Math.round(item.prior);
          primaryColor = "var(--fg-muted)";
          primaryTitle = "Pre-judging cold-start prior. Real Elo arrives after bench cycles.";
        }
        const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              paddingTop: 8,
              borderTop: "1px solid var(--rule)",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {primaryValue != null && (
                <span
                  title={primaryTitle}
                  style={{
                    color: primaryColor,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  {primaryValue}
                </span>
              )}
              {item.stars != null && item.stars > 0 && (
                <span title="GitHub stars" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ★ {fmtK(item.stars)}
                </span>
              )}
              {item.forks != null && item.forks > 0 && (
                <span title="GitHub forks" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ⑂ {fmtK(item.forks)}
                </span>
              )}
              {/* When no GitHub stats, show the source */}
              {(!item.stars || item.stars === 0) && (!item.forks || item.forks === 0) && item.metadata?.source && (
                <span title="Discovery source" style={{ opacity: 0.7, textTransform: "uppercase", fontSize: 9 }}>
                  via {item.metadata.source}
                </span>
              )}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {item.pushedAt && (
                <span
                  suppressHydrationWarning
                  title={`Last update: ${new Date(item.pushedAt).toUTCString()}`}
                  style={{ opacity: 0.7 }}
                >
                  {relativeTime(item.pushedAt)}
                </span>
              )}
              <VerificationBadge level={item.verificationLevel} />
              {item.delta != null && item.delta !== 0 && (
                <span
                  style={{
                    color: item.delta > 0 ? "var(--accent)" : "var(--danger)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.delta > 0 ? "↗ +" : "↘ "}
                  {Math.abs(item.delta)}
                </span>
              )}
            </span>
          </div>
        );
      })()}
      </div>
    </div>
    {showCta && (() => {
      const baseStyle = {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        padding: "8px 16px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bg)",
        textDecoration: "none",
        textAlign: "center",
      };
      if (ctaMode === "authored") {
        return (
          <Link
            href={href}
            aria-label="You authored this — manage"
            style={{
              ...baseStyle,
              background: "var(--azure)",
              borderTop: "1px solid var(--azure)",
            }}
          >
            ◆ Yours · Manage ↗
          </Link>
        );
      }
      if (ctaMode === "owned") {
        return (
          <Link
            href={href}
            aria-label="You own this — access"
            style={{
              ...baseStyle,
              background: "var(--sage)",
              borderTop: "1px solid var(--sage)",
            }}
          >
            ✓ Owned · Access ↗
          </Link>
        );
      }
      return (
        <Link
          href={buyHref}
          aria-label={`Buy for $${item.priceUsd}`}
          style={{
            ...baseStyle,
            background: "var(--accent)",
            borderTop: "1px solid var(--accent)",
          }}
        >
          Buy now · ${item.priceUsd}
        </Link>
      );
    })()}
    </div>
  );
}
