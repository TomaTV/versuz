import Link from "next/link";
import { notFound } from "next/navigation";
import { Section, PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthorStats } from "@/lib/queries/rankings";
import { computeAuthorTier } from "@/lib/author-tier";

// ISR 10min. Profil public — change rarement (counts/items). Pas de
// generateStaticParams : pre-render à la demande, puis cache. Bots SEO
// crawlent à fond sans déclencher d'invocation après le 1er hit.
export const revalidate = 600;

export async function generateMetadata({ params }) {
  const { login } = await params;
  return {
    title: `@${login} — Versuz`,
    description: `Public profile of @${login} on Versuz : skills + CLAUDE.md they've authored or claimed.`,
  };
}

async function loadProfileByLogin(login) {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("id, github_login, github_id, display_name, avatar_url, bio, created_at")
    .eq("github_login", login)
    .maybeSingle();
  return profile;
}

async function loadContributions(userId) {
  const sb = createSupabaseAdminClient();
  if (!sb || !userId) return { skills: [], claudeMds: [] };
  const [skills, claudeMds] = await Promise.all([
    sb
      .from("skills")
      .select("slug, name, category, tier, price_usd, verification_level, github_stars, scraped_at, promoted_until")
      .eq("author_user_id", userId)
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(80),
    sb
      .from("claude_md_files")
      .select("slug, project_category, tier, price_usd, verification_level, github_stars, metadata, scraped_at, promoted_until")
      .eq("author_user_id", userId)
      .order("verification_level", { ascending: false })
      .order("github_stars", { ascending: false, nullsFirst: false })
      .limit(80),
  ]);
  return { skills: skills.data || [], claudeMds: claudeMds.data || [] };
}

export default async function PublicProfilePage({ params }) {
  const { login } = await params;
  const profile = await loadProfileByLogin(login);
  if (!profile) notFound();

  const [{ skills, claudeMds }, authorStats] = await Promise.all([
    loadContributions(profile.id),
    getAuthorStats(login),
  ]);
  const totalContributions = skills.length + claudeMds.length;
  const verifiedCount =
    skills.filter((s) => (s.verification_level || 0) >= 1).length +
    claudeMds.filter((c) => (c.verification_level || 0) >= 1).length;
  const totalStars =
    skills.reduce((s, x) => s + (x.github_stars || 0), 0) +
    claudeMds.reduce((s, x) => s + (x.github_stars || 0), 0);
  const premiumCount =
    skills.filter((s) => s.tier !== "free").length +
    claudeMds.filter((c) => c.tier !== "free").length;
  const boostedCount = [...skills, ...claudeMds].filter(
    (it) => it.promoted_until && new Date(it.promoted_until) > new Date()
  ).length;

  // Author tier — uses the scrape-based stats (GitHub URL prefix match),
  // which is the same data source as the public author badge SVG. So an
  // author who never logs in but has 10 scraped contributions still
  // shows the Contender tier here. Falls back to a profile-derived
  // estimate if scrape stats are empty (new sign-up with claimed items).
  const statsForTier = authorStats.total > 0
    ? authorStats
    : { total: totalContributions, benched: 0 };
  const tier = computeAuthorTier(statsForTier);

  return (
    <div>
      <PageHero
        eyebrow={tier ? `${tier.label} · author` : "Profile"}
        title={
          <>
            <em style={{ color: "var(--accent)" }}>@{login}</em>
          </>
        }
        subtitle={`${profile.display_name ? profile.display_name + " · " : ""}${totalContributions} contribution${totalContributions === 1 ? "" : "s"} on the Versuz registry.${tier ? ` ${tier.tone}` : ""}`}
      />

      <Section eyebrow="§ 01 — At a glance" markerColor="var(--accent)">
        {tier && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 18px",
              border: `1px solid ${tier.color}`,
              background: `color-mix(in oklab, ${tier.color} 8%, transparent)`,
              marginBottom: 28,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                background: tier.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: tier.color,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {tier.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              {authorStats.total > 0
                ? `${authorStats.total} indexed · ${authorStats.benched} benched`
                : `${totalContributions} indexed`}
            </span>
            <Link
              href={`/badge/author/${login}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
              title="Get an embeddable SVG badge for this profile"
            >
              Badge ↗
            </Link>
          </div>
        )}
        <StatGrid
          stats={[
            { label: "Contributions", value: totalContributions },
            {
              label: "Verified",
              value: verifiedCount,
              color: verifiedCount > 0 ? "var(--sage)" : undefined,
            },
            {
              label: "Combined ★",
              value: totalStars >= 1000 ? `${(totalStars / 1000).toFixed(1)}k` : totalStars,
            },
            {
              label: "Premium",
              value: premiumCount,
              color: premiumCount > 0 ? "var(--accent)" : undefined,
            },
            ...(boostedCount > 0
              ? [{ label: "Boosted", value: boostedCount, color: "var(--amber)" }]
              : []),
          ]}
        />
        {profile.bio && (
          <p
            style={{
              marginTop: 24,
              fontFamily: "var(--font-display)",
              fontSize: 20,
              color: "var(--fg)",
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            {profile.bio}
          </p>
        )}
        <p
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          GitHub :{" "}
          <a
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noreferrer"
            className="vz-link"
            style={{ color: "var(--fg)" }}
          >
            @{login} ↗
          </a>
          {profile.created_at && (
            <>
              {" · joined "}
              <span suppressHydrationWarning>
                {new Date(profile.created_at).toUTCString().slice(8, 16)}
              </span>
            </>
          )}
        </p>
      </Section>

      <Section eyebrow="§ 02 — Skills" markerColor="var(--azure)">
        <ContributionList kind="skill" items={skills} login={login} />
      </Section>

      <Section eyebrow="§ 03 — CLAUDE.md" markerColor="var(--sage)">
        <ContributionList kind="claude_md" items={claudeMds} login={login} />
      </Section>
    </div>
  );
}

function ContributionList({ kind, items }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: "32px 24px",
          border: "1px solid var(--rule)",
          background: "var(--surface)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        Nothing here yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it) => {
        const meta = it.metadata || {};
        const display =
          kind === "skill"
            ? it.name || it.slug
            : meta.author && meta.repo
              ? `${meta.author}/${meta.repo}`
              : it.slug;
        const sub = kind === "skill" ? it.category : it.project_category;
        const href =
          kind === "skill"
            ? `/skills/${it.slug}`
            : `/claude-md/${it.project_category || "generic"}/${it.slug}`;
        const isBoosted = it.promoted_until && new Date(it.promoted_until) > new Date();
        return (
          <Link
            key={it.slug}
            href={href}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 16,
              alignItems: "center",
              padding: "16px 0",
              borderTop: "1px solid var(--rule)",
              textDecoration: "none",
              color: "var(--fg)",
            }}
            className="vz-admin-row"
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg)",
                letterSpacing: "-0.01em",
                wordBreak: "break-word",
              }}
            >
              {display}
              <span
                style={{
                  marginLeft: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {sub} · ★ {it.github_stars || 0}
              </span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <TierBadge tier={it.tier} priceUsd={it.price_usd} size="sm" />
              {isBoosted && (
                <span
                  style={{
                    padding: "2px 6px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--bg)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    background: "var(--amber)",
                  }}
                >
                  Boost
                </span>
              )}
            </span>
            <VerificationBadge level={it.verification_level} showLabel />
          </Link>
        );
      })}
    </div>
  );
}
