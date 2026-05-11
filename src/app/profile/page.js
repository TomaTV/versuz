import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { signOut } from "@/lib/auth/actions";
import { deleteOwnSubject } from "@/lib/submit/actions";
import { Section, SectionHeader, PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { PipelineStepper } from "@/components/profile/pipeline-stepper";
import { StatGrid, BarChart, Sparkline } from "@/components/dashboard/stat-grid";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";

export const metadata = { title: "Profile — Versuz" };

async function loadMyContributions(userId) {
  const sb = createSupabaseAdminClient();
  if (!sb || !userId) return { skills: [], claudeMds: [] };
  const [skills, claudeMds] = await Promise.all([
    sb
      .from("skills")
      .select(
        "id, slug, name, category, tier, price_usd, verification_level, github_stars, scraped_at, verified_at, promoted_until, quality_score, bench_pending"
      )
      .eq("author_user_id", userId)
      .order("scraped_at", { ascending: false })
      .limit(40),
    sb
      .from("claude_md_files")
      .select(
        "id, slug, project_category, tier, price_usd, verification_level, github_stars, metadata, scraped_at, verified_at, promoted_until, quality_score, bench_pending"
      )
      .eq("author_user_id", userId)
      .order("scraped_at", { ascending: false })
      .limit(40),
  ]);

  // Enrich each item with its bench data (avg_score + task_count from rankings)
  const skillIds = (skills.data || []).map((s) => s.id);
  const claudeIds = (claudeMds.data || []).map((c) => c.id);
  let benchBySkillId = new Map();
  let benchByClaudeId = new Map();
  if (skillIds.length > 0) {
    const { data } = await sb
      .from("rankings")
      .select("skill_id, avg_score, task_count, successful_tasks")
      .eq("subject_kind", "skill")
      .in("skill_id", skillIds);
    benchBySkillId = new Map((data || []).map((r) => [r.skill_id, r]));
  }
  if (claudeIds.length > 0) {
    const { data } = await sb
      .from("rankings")
      .select("claude_md_id, avg_score, task_count, successful_tasks")
      .eq("subject_kind", "claude_md")
      .in("claude_md_id", claudeIds);
    benchByClaudeId = new Map((data || []).map((r) => [r.claude_md_id, r]));
  }
  return {
    skills: (skills.data || []).map((s) => ({ ...s, bench: benchBySkillId.get(s.id) || null })),
    claudeMds: (claudeMds.data || []).map((c) => ({ ...c, bench: benchByClaudeId.get(c.id) || null })),
  };
}

/**
 * Compute the pipeline stage for a submitted item.
 * Stages : 1 Submitted · 2 Quality judged · 3 Bench queued · 4 Benched
 */
function pipelineStage(item) {
  if (item.bench && item.bench.avg_score != null) {
    return {
      step: 4,
      label: "Benched",
      color: "var(--sage)",
      hint: `Score ${Number(item.bench.avg_score).toFixed(1)} · ${item.bench.successful_tasks ?? item.bench.task_count}/${item.bench.task_count} tasks`,
    };
  }
  if (item.bench_pending) {
    return {
      step: 3,
      label: "Queued for bench",
      color: "var(--azure)",
      hint: "Will be picked up by the next bench cycle (priority).",
    };
  }
  if (item.quality_score != null) {
    return {
      step: 2,
      label: "Quality judged",
      color: "var(--amber)",
      hint: `Quality ${Number(item.quality_score).toFixed(1)}/100 — awaiting bench cycle.`,
    };
  }
  return {
    step: 1,
    label: "Submitted",
    color: "var(--crimson)",
    hint: "Quality judge runs within ~5 sec at submit. Refresh if stuck.",
  };
}

function bucketByWeek(items, getDate, weeksBack = 12) {
  const buckets = Array.from({ length: weeksBack }, () => 0);
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const it of items) {
    const ts = getDate(it);
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) continue;
    const weeksAgo = Math.floor((now - t) / weekMs);
    if (weeksAgo < 0 || weeksAgo >= weeksBack) continue;
    const idx = weeksBack - 1 - weeksAgo;
    buckets[idx] += 1;
  }
  return buckets;
}

export default async function ProfilePage() {
  const sb = await createSupabaseServerClient();
  if (!sb) {
    return (
      <PageHero
        eyebrow="Profile"
        title="Auth not configured."
        subtitle="Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable login."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const contributions = await loadMyContributions(user.id);

  // Aggregate stats for the dashboard
  const totalSubmissions = contributions.skills.length + contributions.claudeMds.length;
  const verifiedCount =
    contributions.skills.filter((s) => (s.verification_level || 0) >= 1).length +
    contributions.claudeMds.filter((c) => (c.verification_level || 0) >= 1).length;
  const totalStars =
    contributions.skills.reduce((s, x) => s + (x.github_stars || 0), 0) +
    contributions.claudeMds.reduce((s, x) => s + (x.github_stars || 0), 0);
  const premiumCount =
    contributions.skills.filter((s) => s.tier !== "free").length +
    contributions.claudeMds.filter((c) => c.tier !== "free").length;

  // Skills + claude-md by category for the chart
  const categoryCounts = new Map();
  for (const s of contributions.skills) {
    const k = `skill · ${s.category}`;
    categoryCounts.set(k, (categoryCounts.get(k) || 0) + 1);
  }
  for (const c of contributions.claudeMds) {
    const k = `claude · ${c.project_category}`;
    categoryCounts.set(k, (categoryCounts.get(k) || 0) + 1);
  }
  const categoryRows = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      color: label.startsWith("skill") ? "var(--azure)" : "var(--sage)",
    }));

  // Sparkline of submissions per week (last 12 weeks).
  // Use scraped_at as proxy for "added to my registry" — both for fresh
  // submits and claims (the row was scraped before a claim, so the spike
  // shows on the original scrape week, which is fine as a heatmap signal).
  const allItems = [...contributions.skills, ...contributions.claudeMds];
  const weeks = bucketByWeek(allItems, (it) => it.verified_at || it.scraped_at, 12);

  const handle = user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email;
  const provider = user.app_metadata?.provider || "email";

  return (
    <div>
      <OnboardingModal />
      <PageHero
        compact
        eyebrow="Profile"
        title={
          <>
            Hi <em style={{ color: "var(--accent)" }}>{handle}</em>.
          </>
        }
        subtitle={`Signed in via ${provider}. Submissions and claimed skills appear below.`}
      />

      <Section eyebrow="§ 01 — Account" markerColor="var(--azure)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 0,
            borderTop: "1px solid var(--rule-strong)",
            borderBottom: "1px solid var(--rule)",
          }}
          className="vz-stat-grid"
        >
          <Cell label="Email" value={user.email} />
          <Cell label="Provider" value={provider} />
          <Cell label="Created" value={new Date(user.created_at).toUTCString().slice(0, 16)} />
          <Cell label="Handle" value={handle} />
        </div>

        <form action={signOut} style={{ marginTop: 32 }}>
          <button
            type="submit"
            className="vz-btn-ghost-outline"
            style={{
              padding: "14px 22px",
              border: "1px solid var(--rule-strong)",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Sign out ↗
          </button>
        </form>
      </Section>

      <Section eyebrow="§ 02 — Dashboard" markerColor="var(--accent)" paddingY={48}>
        <StatGrid
          stats={[
            { label: "Submissions", value: totalSubmissions },
            {
              label: "Verified",
              value: verifiedCount,
              color: verifiedCount > 0 ? "var(--sage)" : undefined,
              hint:
                totalSubmissions > 0
                  ? `${Math.round((verifiedCount / totalSubmissions) * 100)}% of your items`
                  : undefined,
            },
            { label: "Combined ★", value: totalStars >= 1000 ? `${(totalStars / 1000).toFixed(1)}k` : totalStars },
            {
              label: "Premium tier",
              value: premiumCount,
              color: premiumCount > 0 ? "var(--accent)" : undefined,
            },
          ]}
        />

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
          }}
          className="vz-history-grid"
        >
          <BarChart
            data={categoryRows}
            title="Items by category"
          />
          <div
            style={{
              border: "1px solid var(--rule)",
              padding: "20px 24px",
              background: "var(--bg)",
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
              Activity · last 12 weeks
            </span>
            <Sparkline data={weeks} width={320} height={80} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              {allItems.length} item{allItems.length === 1 ? "" : "s"} · peak{" "}
              {Math.max(...weeks, 0)} / week
            </span>
          </div>
        </div>
      </Section>

      <Section eyebrow="§ 03 — My skills" markerColor="var(--accent)">
        <ContributionList kind="skill" items={contributions.skills} />
      </Section>

      <Section eyebrow="§ 04 — My CLAUDE.md" markerColor="var(--sage)">
        <ContributionList kind="claude_md" items={contributions.claudeMds} />
      </Section>

      <Section eyebrow="§ 05 — Quick actions" markerColor="var(--azure)" paddingY={48}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <ActionCard
            href="/submit/skill"
            title="Submit a SKILL.md"
            sub="Paste a GitHub URL or content"
          />
          <ActionCard
            href="/submit/claude-md"
            title="Submit a CLAUDE.md"
            sub="Same flow, project-typed"
          />
          <ActionCard
            href="/marketplace"
            title="Browse marketplace"
            sub="Filter, search, compare"
          />
          <ActionCard
            href="/profile/settings"
            title="Sell on Versuz"
            sub="Connect Stripe to receive payouts"
          />
          <ActionCard
            href="/profile/earnings"
            title="My earnings"
            sub="Sales, fees, net revenue"
          />
        </div>
      </Section>
    </div>
  );
}

function BoostedMini() {
  return (
    <span
      title="Currently boosted"
      style={{
        display: "inline-flex",
        alignItems: "center",
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
  );
}

function ContributionList({ kind, items }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: "48px 32px",
          border: "1px solid var(--rule)",
          background: "var(--surface)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        Nothing here yet.{" "}
        <Link
          href={kind === "skill" ? "/submit/skill" : "/submit/claude-md"}
          className="vz-link"
        >
          Submit one
        </Link>{" "}
        or{" "}
        <Link href="/marketplace" className="vz-link">
          claim from the registry
        </Link>
        .
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
        const claimHref = `/claim/${kind === "skill" ? "skill" : "claude-md"}/${it.slug}`;
        const editHref = `/profile/items/${kind === "skill" ? "skill" : "claude-md"}/${it.slug}`;
        const promoteHref = `/promote/${kind === "skill" ? "skill" : "claude-md"}/${it.slug}`;
        const isClaimed = (it.verification_level || 0) >= 1;
        const isBoosted = it.promoted_until && new Date(it.promoted_until) > new Date();
        const stage = pipelineStage(it);
        return (
          <div
            key={it.slug}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "20px 0",
              borderTop: "1px solid var(--rule)",
            }}
            className="vz-admin-row"
          >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <Link
              href={href}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg)",
                textDecoration: "none",
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
            </Link>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <TierBadge tier={it.tier} priceUsd={it.price_usd} size="sm" />
              {isBoosted && <BoostedMini />}
            </span>
            <VerificationBadge level={it.verification_level} showLabel />
            {isClaimed ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                <Link href={editHref} className="vz-link" style={{ color: "var(--fg)" }}>
                  Edit ↗
                </Link>
                <Link
                  href={promoteHref}
                  style={{
                    color: "var(--bg)",
                    background: "var(--amber)",
                    padding: "4px 8px",
                    textDecoration: "none",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}
                >
                  ◆ Boost
                </Link>
                <form action={deleteOwnSubject} style={{ display: "inline" }}>
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="slug" value={it.slug} />
                  <button
                    type="submit"
                    title="Delete this item permanently"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--crimson)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      padding: 0,
                    }}
                  >
                    Delete
                  </button>
                </form>
              </span>
            ) : (
              <Link
                href={claimHref}
                className="vz-link"
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em" }}
              >
                Claim ↗
              </Link>
            )}
          </div>
          {/* Pipeline stepper — Submitted → Quality → Queued → Benched */}
          <div style={{ paddingTop: 4, paddingLeft: 2 }}>
            <PipelineStepper stage={stage} />
          </div>
        </div>
        );
      })}
    </div>
  );
}

function ActionCard({ href, title, sub }) {
  return (
    <Link
      href={href}
      style={{
        padding: "24px 20px",
        border: "1px solid var(--rule)",
        textDecoration: "none",
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      className="vz-cat-card"
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </span>
    </Link>
  );
}

function Cell({ label, value }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
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
          fontSize: 28,
          fontWeight: 400,
          color: "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          wordBreak: "break-all",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}
