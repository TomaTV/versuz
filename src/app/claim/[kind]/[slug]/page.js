import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section, SectionHeader } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { getCurrentUser } from "@/lib/auth/server";
import { ghLogin } from "@/lib/auth/admin";
import { getSkillBySlug, getClaudeMdBySlug } from "@/lib/queries/rankings";
import { claimSubject } from "@/lib/claim/actions";

export const metadata = {
  title: "Claim — Versuz",
  robots: { index: false, follow: false },
};

export default async function ClaimPage({ params }) {
  const { kind: kindRaw, slug } = await params;
  const kind = kindRaw === "claude-md" ? "claude_md" : "skill";
  const detailHref =
    kind === "claude_md" ? `/claude-md` : `/skills/${slug}`;

  const item =
    kind === "claude_md" ? await getClaudeMdBySlug(slug) : await getSkillBySlug(slug);
  if (!item) notFound();

  const user = await getCurrentUser();
  const login = ghLogin(user);
  const meta = item.metadata || {};
  const owner = meta.owner;
  const repo = meta.repo;
  const repoFull = owner && repo ? `${owner}/${repo}` : owner || null;

  const alreadyClaimedByOther =
    item.author_user_id && user && item.author_user_id !== user.id;
  const alreadyClaimedByMe = user && item.author_user_id === user.id;
  const matchesLogin = login && owner && login.toLowerCase() === owner.toLowerCase();

  return (
    <div>
      <PageHero
        compact
        eyebrow={`Claim · ${kind === "claude_md" ? "CLAUDE.md" : "Skill"}`}
        title={
          <>
            Claim <em style={{ color: "var(--accent)" }}>{kind === "claude_md" ? (repoFull || slug) : item.name}</em>.
          </>
        }
        subtitle="Linking this item to your GitHub account marks it as verified. You can update its tier, mark it premium, and accept commission once we ship Stripe Connect."
      />

      <Section eyebrow="Status" markerColor="var(--accent)" paddingY={48}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
          className="vz-history-grid"
        >
          <Field label="Repo" value={repoFull ? `github.com/${repoFull}` : "—"} />
          <Field label="Current verification" value={<VerificationBadge level={item.verificationLevel} showLabel />} />
          <Field label="Tier" value={<TierBadge tier={item.tier} priceUsd={item.priceUsd} size="sm" />} />
          <Field
            label="Already claimed?"
            value={
              alreadyClaimedByMe
                ? "Yes — by you"
                : alreadyClaimedByOther
                  ? "Yes — by another account"
                  : "No"
            }
          />
        </div>

        <div style={{ marginTop: 40 }}>
          {!user ? (
            <Pane tone="amber">
              You need to sign in with GitHub before claiming.{" "}
              <Link href={`/login?next=${encodeURIComponent(`/claim/${kindRaw}/${slug}`)}`} className="vz-link">
                Sign in
              </Link>
              .
            </Pane>
          ) : !login ? (
            <Pane tone="danger">
              Your account isn&apos;t linked to GitHub OAuth. Other providers can&apos;t prove
              repo ownership. Sign out and sign back in with GitHub.
            </Pane>
          ) : alreadyClaimedByMe ? (
            <Pane tone="sage">
              You&apos;ve already claimed this item.{" "}
              <Link href={detailHref} className="vz-link">
                Back to detail
              </Link>
              .
            </Pane>
          ) : alreadyClaimedByOther ? (
            <Pane tone="danger">
              Another GitHub account claimed this item already. If that was a mistake,
              email <a href="mailto:hello@versuz.dev" className="vz-link">hello@versuz.dev</a>.
            </Pane>
          ) : !matchesLogin ? (
            <Pane tone="amber">
              You&apos;re signed in as <code>@{login}</code>, but the repo owner is{" "}
              <code>{owner || "unknown"}</code>. Sign in with the GitHub account that owns
              the repo (or that&apos;s a public member of the org).
            </Pane>
          ) : (
            <form action={claimSubject}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="kind" value={kind} />
              <button
                type="submit"
                style={{
                  padding: "16px 24px",
                  background: "var(--fg)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                Claim as @{login} <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
              </button>
              <p
                style={{
                  marginTop: 16,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                We&apos;ll re-check via api.github.com that you really own{" "}
                <code>{repoFull}</code> (defends against username renames). On success
                the item gets <code>verification_level=1</code>.
              </p>
            </form>
          )}
        </div>
      </Section>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          fontSize: 22,
          color: "var(--fg)",
          letterSpacing: "-0.01em",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Pane({ tone = "fg", children }) {
  const color =
    tone === "amber"
      ? "var(--amber)"
      : tone === "danger"
        ? "var(--danger)"
        : tone === "sage"
          ? "var(--sage)"
          : "var(--fg)";
  return (
    <div
      style={{
        padding: "16px 20px",
        border: "1px solid var(--rule-strong)",
        borderLeft: `3px solid ${color}`,
        background: "var(--surface)",
        fontFamily: "var(--font-display)",
        fontSize: 18,
        lineHeight: 1.5,
        color: "var(--fg)",
      }}
    >
      {children}
    </div>
  );
}
