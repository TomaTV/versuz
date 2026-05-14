import Link from "next/link";
import { getRecentUpsets, getLeaderboardCategories } from "@/lib/queries/rankings";
import { CopyUrlButton } from "./copy-url-button";

export const metadata = { title: "Content drafts — Admin Versuz" };
export const dynamic = "force-dynamic";

/**
 * Editorial dashboard for the "Today's Upset" pipeline. Lists the biggest
 * rank changes between the two most recent cycles (via rank_history,
 * populated by scripts/bench/post-cycle-hooks.mjs). Each row links to a
 * preview of the OG card ready to download as PNG.
 *
 * UX intent : after each cycle completes, the editorial team opens this
 * page, picks 1-3 upsets worth sharing, downloads the cards, publishes
 * to Twitter/LinkedIn. Zero manual SVG/PNG fiddling.
 */
export default async function ContentDraftsPage({ searchParams }) {
  const params = await searchParams;
  const minDelta = Number(params?.delta || 3);
  const kindParam = params?.kind === "claude_md" || params?.kind === "claude-md" ? "claude_md" : "skill";

  const [skillUpsets, claudeMdUpsets, skillCats] = await Promise.all([
    getRecentUpsets({ kind: "skill", minDelta, limit: 20 }),
    getRecentUpsets({ kind: "claude_md", minDelta, limit: 20 }),
    getLeaderboardCategories("skill"),
  ]);

  const allUpsets = [...skillUpsets, ...claudeMdUpsets];

  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Content drafts <em style={{ color: "var(--accent)", fontStyle: "italic" }}>·</em> today&apos;s upsets
        </h1>
        <p
          style={{
            marginTop: 12,
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--fg-muted)",
            maxWidth: 760,
          }}
        >
          Biggest rank movers vs the previous bench cycle. Pick 1-3 worth sharing, copy the
          OG card URL or download the PNG, then publish to Twitter/LinkedIn.
        </p>
      </header>

      <FilterRow minDelta={minDelta} kindParam={kindParam} />

      <Stats
        skillCount={skillUpsets.length}
        claudeCount={claudeMdUpsets.length}
        catTotal={skillCats.length}
        minDelta={minDelta}
      />

      {allUpsets.length === 0 ? (
        <EmptyState minDelta={minDelta} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {allUpsets.map((u) => (
            <UpsetCard key={`${u.kind}:${u.subjectId}:${u.category}`} upset={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ minDelta }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "16px 0",
        marginBottom: 24,
        borderTop: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        Min delta
      </span>
      <div style={{ display: "inline-flex", gap: 0, border: "1px solid var(--rule)" }}>
        {[1, 3, 5, 10].map((n) => (
          <Link
            key={n}
            href={`/admin/content-drafts?delta=${n}`}
            style={{
              padding: "6px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: n === minDelta ? "var(--bg)" : "var(--fg-muted)",
              background: n === minDelta ? "var(--fg)" : "transparent",
              textDecoration: "none",
              letterSpacing: "0.06em",
            }}
          >
            ≥{n}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stats({ skillCount, claudeCount, catTotal, minDelta }) {
  const tiles = [
    { label: "Skill upsets", value: skillCount },
    { label: "CLAUDE.md upsets", value: claudeCount },
    { label: "Categories tracked", value: catTotal },
    { label: "Threshold", value: `≥ ${minDelta} rank` },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 0,
        marginBottom: 32,
        border: "1px solid var(--rule)",
      }}
    >
      {tiles.map((t, i) => (
        <div
          key={t.label}
          style={{
            padding: 16,
            borderRight: i < tiles.length - 1 ? "1px solid var(--rule)" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {t.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ minDelta }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        border: "1px dashed var(--rule)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 22,
          color: "var(--fg)",
        }}
      >
        No upsets found.
      </p>
      <p
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg-muted)",
        }}
      >
        Either rank_history is empty (run <code>node scripts/bench/post-cycle-hooks.mjs</code> after a cycle),
        or no rank moved ≥ {minDelta} places between cycles. Lower the threshold above to surface smaller moves.
      </p>
    </div>
  );
}

function UpsetCard({ upset }) {
  const kindSlug = upset.kind === "claude_md" ? "claude-md" : "skill";
  const detailPath = upset.kind === "claude_md" ? `/claude-md` : `/skills`;
  const isUp = upset.delta > 0;
  const ogUrl = `/api/og/upset?kind=${upset.kind}&category=${encodeURIComponent(upset.category)}&challenger=${encodeURIComponent(upset.slug || "")}&delta=${upset.delta}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 24,
        padding: 20,
        border: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "3px 8px",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              background: isUp ? "var(--sage)" : "var(--crimson)",
              color: "var(--bg)",
              fontWeight: 600,
            }}
          >
            {isUp ? "↑ Upset" : "↓ Drop"}
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
            {kindSlug} · {upset.category}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
            }}
          >
            cycle #{upset.cycleId} (vs #{upset.prevCycleId})
          </span>
        </div>

        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            wordBreak: "break-word",
          }}
        >
          <em style={{ color: "var(--accent)" }}>{upset.name}</em>
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 14,
          }}
        >
          <span>
            <span style={{ color: "var(--fg-muted)" }}>#{upset.prevRank}</span>{" "}
            <span style={{ color: "var(--fg-muted)" }}>→</span>{" "}
            <span style={{ color: isUp ? "var(--sage)" : "var(--crimson)", fontWeight: 600 }}>
              #{upset.currentRank}
            </span>
          </span>
          <span
            style={{
              color: isUp ? "var(--sage)" : "var(--crimson)",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {isUp ? `+${upset.delta}` : `${upset.delta}`} places
          </span>
          {upset.elo != null && (
            <span style={{ color: "var(--fg-muted)" }}>
              elo {upset.elo.toFixed(1)}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          <Link
            href={`${detailPath}/${upset.slug || ""}`}
            target="_blank"
            style={{
              padding: "8px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg)",
              border: "1px solid var(--rule-strong)",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            View item ↗
          </Link>
          <Link
            href={ogUrl}
            target="_blank"
            style={{
              padding: "8px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--bg)",
              background: "var(--fg)",
              border: "1px solid var(--fg)",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Open PNG (1200×630)
          </Link>
          <CopyUrlButton url={`https://versuz.dev${ogUrl}`} />
        </div>
      </div>

      {/* Preview thumbnail */}
      <a
        href={ogUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "block",
          lineHeight: 0,
          border: "1px solid var(--rule)",
          aspectRatio: "1200 / 630",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogUrl}
          alt={`Upset card · ${upset.name}`}
          width={320}
          height={168}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </a>
    </div>
  );
}

