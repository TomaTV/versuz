import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  updateOwnSubjectListing,
  deleteOwnSubject,
} from "@/lib/submit/actions";
import { Section, PageHero } from "@/components/section";
import { TierBadge } from "@/components/marketplace/tier-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { ListingForm } from "@/components/profile/listing-form";

export const metadata = { title: "Manage item — Versuz" };

async function loadOwnItem({ kind, slug, userId }) {
  const sb = createSupabaseAdminClient();
  if (!sb) return null;
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const sel =
    kind === "claude_md"
      ? "id, slug, project_category, description, tier, price_usd, verification_level, author_user_id, github_url, github_stars, metadata, promoted_until, private_storage_path"
      : "id, slug, name, category, description, tier, price_usd, verification_level, author_user_id, github_url, github_stars, metadata, promoted_until, private_storage_path";
  const { data } = await sb
    .from(table)
    .select(sel)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if (data.author_user_id !== userId) return null;
  return data;
}

export default async function ManageItemPage({ params }) {
  const { kind: kindRaw, slug } = await params;
  const kind = kindRaw === "claude-md" ? "claude_md" : kindRaw;
  if (!["skill", "claude_md"].includes(kind)) redirect("/profile");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/profile/items/${kindRaw}/${slug}`)}`);

  const item = await loadOwnItem({ kind, slug, userId: user.id });
  if (!item) notFound();

  const displayName =
    kind === "skill"
      ? item.name || item.slug
      : item.metadata?.author && item.metadata?.repo
        ? `${item.metadata.author}/${item.metadata.repo}`
        : item.slug;

  const detailHref =
    kind === "skill"
      ? `/skills/${slug}`
      : `/claude-md/${item.project_category || "generic"}/${slug}`;
  const promoteHref = `/promote/${kindRaw}/${slug}`;
  const isBoosted = item.promoted_until && new Date(item.promoted_until) > new Date();
  const remainingDays = isBoosted
    ? Math.ceil((new Date(item.promoted_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div>
      <PageHero
        compact
        eyebrow="Manage item"
        title={
          <>
            <em style={{ color: "var(--accent)" }}>{displayName}</em>
          </>
        }
        subtitle="Tweak your listing — change tier, set a price, boost it. Identity (name, slug, category) is immutable in V1; re-submit to migrate to a different category."
      />

      <Section eyebrow="§ 01 — At a glance" markerColor="var(--accent)">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <TierBadge tier={item.tier} priceUsd={item.price_usd} size="md" />
          <VerificationBadge level={item.verification_level} showLabel />
          {isBoosted && (
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
              Boosted · {remainingDays}d left
            </span>
          )}
        </div>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--fg-muted)",
            lineHeight: 1.6,
            maxWidth: 720,
          }}
        >
          {item.description || "No description set."}
        </p>

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={detailHref}
            style={{
              padding: "12px 18px",
              border: "1px solid var(--rule-strong)",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            View public page →
          </Link>
          <Link
            href={promoteHref}
            style={{
              padding: "12px 18px",
              border: "1px solid var(--amber)",
              background: "var(--amber)",
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            ◆ {isBoosted ? "Extend boost" : "Boost this item"} →
          </Link>
        </div>
      </Section>

      <Section eyebrow="§ 02 — Locked identity" markerColor="var(--fg-muted)" paddingY={48}>
        <p
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
          }}
        >
          These fields are immutable in V1. To migrate to a different category or rename,
          delete and re-submit.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "10px 24px",
            padding: "20px 24px",
            border: "1px solid var(--rule)",
            background: "var(--surface)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            maxWidth: 720,
          }}
        >
          <LockedRow label="Slug" value={item.slug} />
          {kind === "skill" && <LockedRow label="Name" value={item.name || "—"} />}
          <LockedRow
            label="Category"
            value={kind === "skill" ? item.category : item.project_category}
          />
          <LockedRow
            label="Source"
            value={item.github_url || "—"}
            isLink={!!item.github_url}
          />
        </div>
      </Section>

      <Section eyebrow="§ 03 — Listing tier, price & description" markerColor="var(--azure)" paddingY={64}>
        <ListingForm
          item={item}
          kind={kind}
          updateAction={updateOwnSubjectListing}
        />
      </Section>

      <Section eyebrow="§ 04 — Danger zone" markerColor="var(--crimson)" paddingY={48}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            maxWidth: 640,
            marginBottom: 16,
          }}
        >
          Deleting removes the listing from /marketplace and /leaderboard
          permanently. Existing purchases keep their `purchases` row (with
          `skill_id` going NULL via FK ON DELETE SET NULL) so buyers can
          still see the receipt in /profile/earnings — but the item itself
          is gone.
        </p>
        <form action={deleteOwnSubject}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            style={{
              padding: "12px 18px",
              border: "1px solid var(--crimson)",
              background: "transparent",
              color: "var(--crimson)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Delete this item permanently
          </button>
        </form>
      </Section>
    </div>
  );
}

function LockedRow({ label, value, isLink = false }) {
  return (
    <>
      <span style={{ color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
        🔒 {label}
      </span>
      <span style={{ color: "var(--fg)", wordBreak: "break-all" }}>
        {isLink ? (
          <a href={value} target="_blank" rel="noreferrer" style={{ color: "var(--fg)", borderBottom: "1px solid var(--rule-strong)", textDecoration: "none" }}>
            {value}
          </a>
        ) : value}
      </span>
    </>
  );
}
