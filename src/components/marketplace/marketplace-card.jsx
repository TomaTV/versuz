import Link from "next/link";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { OfficialBadge } from "@/components/marketplace/official-badge";
import { HairBar } from "@/components/hair-bar";
import { approximateTokens, formatTokenCount } from "@/lib/utils";

/**
 * "TOP N" pill — sage for top 3 (most prestigious), azure for 4-5, muted
 * for 6-10. Only shown when bench has actually ranked the item.
 */
function TopNBadge({ rank }) {
  const tier = rank <= 3 ? "top3" : rank <= 5 ? "top5" : "top10";
  const bg =
    tier === "top3" ? "var(--sage)" : tier === "top5" ? "var(--azure)" : "transparent";
  const color = tier === "top10" ? "var(--fg)" : "var(--bg)";
  const border = tier === "top10" ? "1px solid var(--rule-strong)" : "none";
  const label = tier === "top3" ? `Top ${rank}` : tier === "top5" ? "Top 5" : "Top 10";
  return (
    <span
      title={`Ranked #${rank} in its category`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 7px",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        background: bg,
        border,
      }}
    >
      {label}
    </span>
  );
}

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
  featured = false, // legacy 2-col span (unused in V1.5)
  sponsored = false, // boosted OR featured tier → taller card, description always shown
}) {
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
      : `${item.project_category} · ${item.word_count ? formatTokenCount(Math.round(item.word_count * 1.3)) : "?"} tokens`;

  const isBoosted = !!item.isBoosted;

  return (
    <div
      className={`vz-mp-wrapper${featured ? " vz-mp-featured" : ""}${isBoosted ? " vz-mp-boosted" : ""}${sponsored ? " vz-mp-sponsored" : ""}`}
      style={{
        position: "relative",
        height: "100%",
        // Sponsored items (boosted + featured) span 2 columns horizontally —
        // same height as a regular card, just twice as wide. Matches skillsmp /
        // npm featured row pattern : visually distinctive without being taller
        // and breaking the grid rhythm.
        gridColumn: sponsored ? "span 2" : undefined,
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
    <Link
      href={href}
      className="vz-mp-card"
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        background: isLeader ? "var(--leader-tint)" : "var(--bg)",
        // Border priority : compare > boosted (amber 2px) > featured (sage 1.5px) > default
        border: (() => {
          if (compareChecked) return "1px solid var(--accent)";
          if (isBoosted) return "2px solid var(--amber)";
          if (item.tier === "featured") return "1.5px solid var(--sage)";
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
          {/* Boosted is signaled by the diagonal corner ribbon — no need
              for a duplicate inline pill in the top row. */}
          {item.rank != null && item.rank <= 10 && (
            <TopNBadge rank={item.rank} />
          )}
        </span>
        {item.rank != null && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: item.rank <= 3 ? "var(--accent)" : "var(--fg-muted)",
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            #{String(item.rank).padStart(2, "0")}
          </span>
        )}
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
          fontStyle: isLeader ? "italic" : "normal",
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
              {item.stars != null && (
                <span title="GitHub stars" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ★ {fmtK(item.stars)}
                </span>
              )}
              {item.forks != null && item.forks > 0 && (
                <span title="GitHub forks" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ⑂ {fmtK(item.forks)}
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
    </Link>
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
