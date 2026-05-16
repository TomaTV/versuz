import Link from "next/link";
import { PageHero, Section, SectionHeader } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { NewsletterInline } from "@/components/newsletter-inline";
import { TrackPage } from "@/components/track-page";
import {
  getRecentItemAchievements,
  getStreakLeaders,
  getTopAuthors,
} from "@/lib/queries/rankings";
import { computeAuthorTier } from "@/lib/author-tier";

/**
 * /achievements — public wall of fame. Surfaces the gamification work
 * from migration 0052 that was previously only visible on individual
 * detail pages (Triple Crown badge) or implicit (author tiers).
 *
 * Three sections :
 *   §01 Recent achievements (Triple Crown / first_blood / category_winner /
 *       streak_milestone, latest 24)
 *   §02 Top authors (sorted by total contributions, badged by tier)
 *   §03 On a streak (items with the longest active top-rank streaks)
 *
 * ISR 10min — the underlying queries cache 30min, this page cache 10min,
 * so the page revalidates at most 4×/h. Bots index static.
 */

export const revalidate = 600;

export const metadata = {
  title: "Achievements — top items and authors",
  description:
    "Versuz wall of fame. Recent achievements, top authors by tier (Newcomer → Veteran), and the longest active top-rank streaks across the registry.",
  alternates: { canonical: "/achievements" },
  openGraph: {
    title: "Versuz · Achievements — wall of fame",
    description:
      "Triple Crowns, category winners, streak milestones, and the top authors of the Versuz registry.",
    url: "/achievements",
    type: "website",
  },
};

const ACHIEVEMENT_META = {
  triple_crown: {
    label: "Triple Crown",
    icon: "♛",
    color: "var(--amber)",
    tone: "3 judges agreed on #1.",
  },
  category_winner: {
    label: "Category winner",
    icon: "★",
    color: "var(--sage)",
    tone: "First time #1 in this category.",
  },
  first_blood: {
    label: "First blood",
    icon: "◆",
    color: "var(--azure)",
    tone: "First entry into the rankings.",
  },
  streak_milestone: {
    label: "Streak milestone",
    icon: "🔥",
    color: "var(--accent)",
    tone: "Days at #1 in a row.",
  },
};

function formatRelative(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const day = 24 * 3600 * 1000;
    if (diff < day) return "today";
    if (diff < 2 * day) return "yesterday";
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default async function AchievementsPage() {
  const [recent, authors, streaks] = await Promise.all([
    getRecentItemAchievements(24),
    getTopAuthors(30),
    getStreakLeaders(15),
  ]);

  const totalRecent = recent.length;
  const totalAuthors = authors.length;
  const totalStreaks = streaks.length;
  const isEmpty = totalRecent === 0 && totalAuthors === 0 && totalStreaks === 0;

  return (
    <div>
      <TrackPage event="achievements_view" />
      <PageHero
        eyebrow="Wall of fame"
        title={
          <>
            Skills and authors{" "}
            <em style={{ color: "var(--accent)" }}>climbing the arena</em>.
          </>
        }
        subtitle={
          isEmpty
            ? "Nothing unlocked yet. The wall fills up after each completed cycle — Triple Crowns when 3 judges agree on #1, category winners, streak milestones (7 / 30 / 100 days), and tier progression for authors."
            : `${totalRecent} recent unlock${totalRecent === 1 ? "" : "s"} · ${totalAuthors} ranked author${totalAuthors === 1 ? "" : "s"} · ${totalStreaks} active streak${totalStreaks === 1 ? "" : "s"}. Updates after every bench cycle.`
        }
      />

      <Section eyebrow="§ 01 — Recent unlocks" markerColor="var(--accent)" paddingY={64}>
        <SectionHeader
          title={
            <>
              What just happened in the <em style={{ color: "var(--accent)" }}>arena</em>.
            </>
          }
          subtitle="Triple Crowns are the rarest — three judges agree the same skill is #1 in its category. Category winners and first-blood entries fire once per item. Streak milestones land at 7 / 30 / 100 consecutive days at #1."
        />

        {recent.length === 0 ? (
          <EmptyState>
            No achievements yet. The next bench cycle could unlock the first
            Triple Crown.
          </EmptyState>
        ) : (
          <RevealStagger
            stagger={0.04}
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {recent.map((row) => {
              const meta = ACHIEVEMENT_META[row.type] || {
                label: row.type,
                icon: "◇",
                color: "var(--fg)",
                tone: "",
              };
              const days = row.metadata?.days;
              const subline =
                row.type === "streak_milestone" && days
                  ? `${days}-day streak`
                  : row.category
                    ? `Category : ${row.category}`
                    : meta.tone;
              return (
                <RevealItem key={row.id}>
                  <Link
                    href={row.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: "18px 20px",
                      border: `1px solid ${meta.color}`,
                      background: `color-mix(in oklab, ${meta.color} 6%, transparent)`,
                      textDecoration: "none",
                      color: "var(--fg)",
                      height: "100%",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: meta.color,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 13 }}>
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {row.name || row.slug}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {subline}
                      <span style={{ opacity: 0.5 }}> · </span>
                      {formatRelative(row.unlocked_at)}
                    </span>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealStagger>
        )}
      </Section>

      <Section eyebrow="§ 02 — Top authors" markerColor="var(--azure)" paddingY={64}>
        <SectionHeader
          title={
            <>
              Authors with the most <em style={{ color: "var(--accent)" }}>indexed</em> work.
            </>
          }
          subtitle="Tiers progress with the number of contributions — Newcomer (1+), Challenger (5+), Contender (10+ with at least 1 benched), Champion (25+ with 3 benched), Veteran (50+). Click an author to see their profile."
        />

        {authors.length === 0 ? (
          <EmptyState>
            No authors in the registry yet. Submit your skill via{" "}
            <Link
              href="/submit"
              style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              /submit
            </Link>{" "}
            to land here.
          </EmptyState>
        ) : (
          <RevealStagger
            stagger={0.03}
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {authors.map((a, i) => {
              const tier = computeAuthorTier(a);
              const color = tier?.color || "var(--fg-muted)";
              return (
                <RevealItem key={a.login}>
                  <Link
                    href={`/u/${a.login}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      border: "1px solid var(--rule)",
                      textDecoration: "none",
                      color: "var(--fg)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 17,
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        @{a.login}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--fg-muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {a.total} indexed · {a.benched} benched
                      </span>
                    </span>
                    {tier && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          color: color,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          border: `1px solid ${color}`,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{ width: 5, height: 5, background: color }}
                        />
                        {tier.label}
                      </span>
                    )}
                  </Link>
                </RevealItem>
              );
            })}
          </RevealStagger>
        )}
      </Section>

      <Section eyebrow="§ 03 — Active streaks" markerColor="var(--sage)" paddingY={64}>
        <SectionHeader
          title={
            <>
              On a <em style={{ color: "var(--accent)" }}>streak</em>.
            </>
          }
          subtitle="Items that have held #1 in their category for consecutive cycles. Streak resets the day a new leader takes the spot. Milestones (7 / 30 / 100 days) unlock the streak_milestone achievement."
        />

        {streaks.length === 0 ? (
          <EmptyState>
            No active streaks yet. Once an item holds #1 across two consecutive
            cycles, it lands here.
          </EmptyState>
        ) : (
          <Reveal>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {streaks.map((s, i) => (
                <Link
                  key={`${s.kind}-${s.slug}`}
                  href={s.href}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    gap: 16,
                    alignItems: "center",
                    padding: "16px 20px",
                    borderTop: i === 0 ? "1px solid var(--rule)" : "none",
                    borderBottom: "1px solid var(--rule)",
                    textDecoration: "none",
                    color: "var(--fg)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--accent)",
                      letterSpacing: "0.08em",
                    }}
                    aria-hidden
                  >
                    🔥
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 19,
                        letterSpacing: "-0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name || s.slug}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-muted)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {s.kind === "skill" ? "Skill" : "CLAUDE.md"} ·{" "}
                      {s.streakCategory || s.itemCategory}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      color: "var(--accent)",
                      letterSpacing: "0.04em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.streakDays}d
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </Section>

      <Section eyebrow="§ 04 — Follow" markerColor="var(--amber)" paddingY={64}>
        <div style={{ maxWidth: 560 }}>
          <NewsletterInline
            source="achievements"
            title="Get the next unlock first"
            body="Every Friday : Triple Crowns, category winners, streak milestones — straight to your inbox. No spam, unsubscribe in one click."
          />
        </div>
      </Section>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: "48px 32px",
        border: "1px dashed var(--rule-strong, var(--rule))",
        textAlign: "center",
        color: "var(--fg-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.7,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </div>
  );
}
