import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { getCurrentProfile } from "@/lib/profiles/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Section, PageHero } from "@/components/section";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { openStripeDisputes } from "@/lib/stripe/connect-actions";

export const metadata = { title: "Earnings — Versuz" };

async function loadSellerPurchases(userId) {
  const sb = createSupabaseAdminClient();
  if (!sb) return [];
  // Service-role read so we can join skills / claude_md_files in one go.
  // Filter manually by author_user_id since the view doesn't expose it.
  const [{ data: skillSales }, { data: claudeSales }] = await Promise.all([
    sb
      .from("purchases")
      .select(
        "id, amount_usd, commission_usd, status, created_at, paid_at, skill_id, skills!inner(slug, name, author_user_id)"
      )
      .eq("subject_kind", "skill")
      .in("status", ["paid", "pending", "disputed", "refunded"])
      .eq("skills.author_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("purchases")
      .select(
        "id, amount_usd, commission_usd, status, created_at, paid_at, claude_md_id, claude_md_files!inner(slug, author_user_id, metadata)"
      )
      .eq("subject_kind", "claude_md")
      .in("status", ["paid", "pending", "disputed", "refunded"])
      .eq("claude_md_files.author_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const sales = [
    ...(skillSales || []).map((p) => ({
      id: p.id,
      kind: "skill",
      itemSlug: p.skills?.slug,
      itemDisplay: p.skills?.name || p.skills?.slug,
      amount: Number(p.amount_usd),
      commission: Number(p.commission_usd || 0),
      net: Number(p.amount_usd) - Number(p.commission_usd || 0),
      status: p.status,
      paidAt: p.paid_at || p.created_at,
    })),
    ...(claudeSales || []).map((p) => ({
      id: p.id,
      kind: "claude_md",
      itemSlug: p.claude_md_files?.slug,
      itemDisplay:
        p.claude_md_files?.metadata?.author && p.claude_md_files?.metadata?.repo
          ? `${p.claude_md_files.metadata.author}/${p.claude_md_files.metadata.repo}`
          : p.claude_md_files?.slug,
      amount: Number(p.amount_usd),
      commission: Number(p.commission_usd || 0),
      net: Number(p.amount_usd) - Number(p.commission_usd || 0),
      status: p.status,
      paidAt: p.paid_at || p.created_at,
    })),
  ].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  return sales;
}

async function loadDiagnostics(userId) {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;
  const [allPurchases, asBuyer, ownedSkills, ownedClaudeMds] = await Promise.all([
    sb.from("purchases").select("*", { count: "exact", head: true }),
    sb.from("purchases").select("*", { count: "exact", head: true }).eq("buyer_user_id", userId),
    sb.from("skills").select("slug,tier,price_usd,author_user_id").eq("author_user_id", userId).in("tier", ["premium", "featured"]),
    sb.from("claude_md_files").select("slug,tier,price_usd,author_user_id").eq("author_user_id", userId).in("tier", ["premium", "featured"]),
  ]);
  return {
    purchasesTotal: allPurchases.count || 0,
    purchasesAsBuyer: asBuyer.count || 0,
    premiumSkillsAuthored: ownedSkills.data || [],
    premiumClaudeMdsAuthored: ownedClaudeMds.data || [],
  };
}

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile/earnings");

  const profile = await getCurrentProfile(user);
  if (!profile.stripe_account_id) {
    redirect("/profile/settings");
  }

  const sales = await loadSellerPurchases(user.id);
  const diag = await loadDiagnostics(user.id);

  // Only paid sales count toward net revenue. Disputed are pending arbitration
  // (could go either way), refunded are cancelled.
  const paidSales = sales.filter((s) => s.status === "paid");
  const disputedSales = sales.filter((s) => s.status === "disputed");

  const totals = paidSales.reduce(
    (acc, s) => {
      acc.gross += s.amount;
      acc.fees += s.commission;
      acc.net += s.net;
      return acc;
    },
    { gross: 0, fees: 0, net: 0 }
  );

  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Number(new Date()) - monthMs);
  const last30 = paidSales
    .filter((s) => new Date(s.paidAt) > cutoff)
    .reduce((acc, s) => acc + s.net, 0);

  return (
    <div>
      <PageHero
        compact
        eyebrow="Earnings"
        title={
          <>
            Your <em style={{ color: "var(--accent)" }}>revenue</em>.
          </>
        }
        subtitle={`70% of every sale lands directly in your Stripe account. Versuz keeps the 30% commission. Total ${sales.length} sale${sales.length === 1 ? "" : "s"}.`}
      />

      {disputedSales.length > 0 && (
        <Section eyebrow="§ 00 — Disputes" markerColor="var(--crimson)" paddingY={48}>
          <div
            style={{
              padding: "24px 28px",
              border: "1px solid var(--crimson)",
              background: "rgba(178, 58, 58, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  letterSpacing: "-0.02em",
                  color: "var(--crimson)",
                  fontWeight: 400,
                }}
              >
                {disputedSales.length} active dispute
                {disputedSales.length > 1 ? "s" : ""}
              </h3>
              <form action={openStripeDisputes}>
                <button
                  type="submit"
                  style={{
                    padding: "10px 16px",
                    border: "1px solid var(--crimson)",
                    background: "var(--crimson)",
                    color: "var(--bg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Submit evidence on Stripe ↗
                </button>
              </form>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg)",
                letterSpacing: "0.04em",
                lineHeight: 1.6,
              }}
            >
              A buyer filed a chargeback. You have 7 days to submit evidence
              (proof of delivery, screenshots, communications) via your
              Stripe Express dashboard. If you don&apos;t respond, you lose
              automatically and the funds are pulled back. The button above
              opens the Stripe disputes view directly.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {disputedSales.map((s) => {
                // Per-dispute deadline countdown : 7 days from when the
                // dispute was created (we use paidAt as proxy until we add
                // a dedicated `disputed_at` column). Days < 2 → urgent red,
                // 2-4 → amber warning, 5+ → muted.
                const disputedAt = new Date(s.paidAt).getTime();
                const deadlineMs = disputedAt + 7 * 24 * 60 * 60 * 1000;
                const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)));
                const urgent = daysLeft <= 2;
                const warn = daysLeft <= 4 && daysLeft > 2;
                const tagColor = urgent ? "var(--crimson)" : warn ? "var(--amber)" : "var(--fg-muted)";
                const tagLabel = daysLeft === 0 ? "OVERDUE" : `${daysLeft}D LEFT`;
                return (
                  <li
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      border: `1px solid ${urgent ? "var(--crimson)" : "var(--rule)"}`,
                      background: urgent ? "rgba(178, 58, 58, 0.04)" : "var(--bg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg)",
                      letterSpacing: "0.04em",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 8px",
                        background: tagColor,
                        color: "var(--bg)",
                        letterSpacing: "0.18em",
                        fontSize: 9,
                        fontWeight: 600,
                        animation: urgent ? "vz-pulse-red 1.4s infinite" : "none",
                      }}
                    >
                      {tagLabel}
                    </span>
                    <span style={{ color: "var(--fg)" }}>{s.itemDisplay}</span>
                    <span style={{ color: "var(--fg-muted)" }}>· ${s.amount.toFixed(2)}</span>
                    <span style={{ color: "var(--fg-muted)" }}>
                      · disputed {new Date(s.paidAt).toUTCString().slice(5, 16)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <style>{`
              @keyframes vz-pulse-red {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.55; }
              }
            `}</style>
          </div>
        </Section>
      )}

      <Section eyebrow="§ 01 — Totals" markerColor="var(--accent)">
        <StatGrid
          stats={[
            {
              label: "Net (lifetime)",
              value: `$${totals.net.toFixed(2)}`,
              color: "var(--sage)",
            },
            {
              label: "Net (last 30d)",
              value: `$${last30.toFixed(2)}`,
            },
            { label: "Gross", value: `$${totals.gross.toFixed(2)}` },
            {
              label: "Versuz fee",
              value: `$${totals.fees.toFixed(2)}`,
              color: "var(--fg-muted)",
            },
          ]}
        />
        <p
          style={{
            marginTop: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          Payouts are managed by Stripe — typically a 7-day rolling schedule.{" "}
          <Link href="/profile/settings" className="vz-link">
            Open Stripe dashboard ↗
          </Link>{" "}
          to manage banking and view scheduled transfers.
        </p>
      </Section>

      <Section eyebrow="§ 02 — Recent sales" markerColor="var(--azure)" paddingY={48}>
        {sales.length === 0 ? (
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
            No sales yet. Share your premium items —{" "}
            <Link href="/profile" className="vz-link">
              your dashboard
            </Link>{" "}
            lists them.
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
            {sales.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: 16,
                  alignItems: "center",
                  padding: "16px 0",
                  borderBottom: "1px solid var(--rule)",
                }}
                className="vz-admin-row"
              >
                <Link
                  href={
                    s.kind === "skill"
                      ? `/skills/${s.itemSlug}`
                      : `/claude-md/generic/${s.itemSlug}`
                  }
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    color: "var(--fg)",
                    textDecoration: "none",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.itemDisplay}
                  <span
                    style={{
                      marginLeft: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {s.kind}
                  </span>
                </Link>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {new Date(s.paidAt).toUTCString().slice(5, 16)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  ${s.amount.toFixed(2)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    color: "var(--sage)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  +${s.net.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {diag && (
        <Section eyebrow="§ 03 — Diagnostic" markerColor="var(--azure)" paddingY={48}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              maxWidth: 760,
              marginBottom: 24,
            }}
          >
            Why is my earnings empty? This panel shows the data state — useful
            while debugging the buy → webhook → DB pipeline.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              borderTop: "1px solid var(--rule-strong)",
              borderBottom: "1px solid var(--rule)",
            }}
            className="vz-stat-grid"
          >
            <DiagCell label="Purchases in DB (all users)" value={diag.purchasesTotal} />
            <DiagCell label="Purchases as buyer (you)" value={diag.purchasesAsBuyer} />
            <DiagCell label="Premium skills you authored" value={diag.premiumSkillsAuthored.length} />
            <DiagCell label="Premium CLAUDE.md you authored" value={diag.premiumClaudeMdsAuthored.length} />
          </div>

          {diag.purchasesAsBuyer > 0 && sales.length === 0 && diag.premiumSkillsAuthored.length === 0 && (
            <p
              style={{
                marginTop: 24,
                padding: "14px 18px",
                border: "1px solid var(--amber)",
                background: "var(--surface)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg)",
                letterSpacing: "0.04em",
                lineHeight: 1.6,
              }}
            >
              ⚠ You have purchases as a buyer but no premium items where you&apos;re the seller. The seed-premium script likely didn&apos;t set <code>author_user_id</code> to your UUID. Run:
              <br />
              <code style={{ display: "block", marginTop: 8 }}>
                update skills set author_user_id = &apos;{user.id}&apos; where tier = &apos;premium&apos;;
              </code>
            </p>
          )}

          {diag.purchasesTotal === 0 && (
            <p
              style={{
                marginTop: 24,
                padding: "14px 18px",
                border: "1px solid var(--amber)",
                background: "var(--surface)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg)",
                letterSpacing: "0.04em",
                lineHeight: 1.6,
              }}
            >
              ⚠ Zero purchase rows in DB. The Stripe webhook didn&apos;t fire or didn&apos;t insert. Check that <code>stripe listen</code> is running and that <code>STRIPE_WEBHOOK_SECRET</code> matches the latest <code>whsec_</code> printed by the CLI.
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function DiagCell({ label, value }) {
  return (
    <div
      style={{
        padding: "24px 24px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
          fontSize: 32,
          fontWeight: 400,
          color: value > 0 ? "var(--fg)" : "var(--fg-muted)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
