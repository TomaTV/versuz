"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Pattern : /skills/[slug] et /claude-md/[category]/[slug] rendent la
 * version "anonymous" en SSR (pas de cookies = ISR-cacheable). Ces
 * Client Components hydratent ensuite avec l'état user-conditional réel
 * en fetchant /api/v1/me/skill-context après mount.
 *
 * Trade-off : sur connexion lente, un utilisateur connecté peut voir
 * brièvement la version anonymous (Buy CTA) avant le swap (Owned). C'est
 * accepté pour gagner ~25min CPU / 12h (Vercel observability mai 2026,
 * /skills/[slug] = 58K invocations dont 95% bots qui ne sont pas auth).
 *
 * Cache module-level : tous les Client Components du même slug partagent
 * la même promise, donc 1 seul fetch /api/v1/me/skill-context par page
 * même avec 4 gates (primary action, boost, install, promote).
 */

const cache = new Map();
const pending = new Map();

function fetchSkillContext({ slug, kind = "skill" }) {
  const key = `${kind}:${slug}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);
  const p = fetch(
    `/api/v1/me/skill-context?slug=${encodeURIComponent(slug)}&kind=${kind}`,
    { credentials: "include" }
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      cache.set(key, data);
      pending.delete(key);
      return data;
    })
    .catch(() => {
      pending.delete(key);
      return null;
    });
  pending.set(key, p);
  return p;
}

export function useSkillContext({ slug, kind = "skill" }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchSkillContext({ slug, kind }).then((data) => {
      if (!cancelled && data) setState(data);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, kind]);
  return state;
}

const btnBase = {
  padding: "16px 24px",
  textDecoration: "none",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
};

/* ────────────────────────────────────────────────────────────────────
 * <SkillPrimaryAction>
 * Affiche Free→View / Premium→Buy en SSR-anonymous. Si user owned ou
 * authored, swap en "✓ Owned" ou "◆ Yours" après mount.
 * ──────────────────────────────────────────────────────────────────── */
export function SkillPrimaryAction({ slug, kind = "skill", detail }) {
  const ctx = useSkillContext({ slug, kind });
  const isOwned = ctx?.isOwned ?? false;
  const isAuthored = ctx?.isAuthored ?? false;
  const ghHref = detail.github ? `https://${detail.github}` : "#";

  // Free tier : toujours "View on GitHub", peu importe le user.
  if (detail.tier === "free") {
    return (
      <a
        href={ghHref}
        target="_blank"
        rel="noreferrer"
        className="vz-btn-primary"
        style={{ ...btnBase, background: "var(--fg)", color: "var(--bg)" }}
      >
        View on GitHub <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </a>
    );
  }

  // Premium/Featured : Buy CTA par défaut, swap si owned/authored après hydratation.
  if (isOwned || isAuthored) {
    const label = isAuthored
      ? "◆ Yours · Open on GitHub"
      : "✓ Owned · Open on GitHub";
    const bg = isAuthored ? "var(--azure)" : "var(--sage)";
    return (
      <a
        href={ghHref}
        target="_blank"
        rel="noreferrer"
        className="vz-btn-primary"
        style={{ ...btnBase, background: bg, color: "var(--bg)" }}
      >
        {label} <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </a>
    );
  }

  const buyKind = kind === "claude_md" ? "claude-md" : "skill";
  return (
    <Link
      href={`/buy/${buyKind}/${detail.slug}`}
      className="vz-btn-primary"
      style={{ ...btnBase, background: "var(--accent)", color: "var(--bg)" }}
    >
      Buy · ${detail.priceUsd}{" "}
      <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * <SkillBoostButton>
 * Visible uniquement si user a authored ce skill. Invisible en SSR.
 * ──────────────────────────────────────────────────────────────────── */
export function SkillBoostButton({ slug, kind = "skill", detail }) {
  const ctx = useSkillContext({ slug, kind });
  if (!ctx?.isAuthored) return null;
  const promoteKind = kind === "claude_md" ? "claude-md" : "skill";
  return (
    <Link
      href={`/promote/${promoteKind}/${detail.slug}`}
      style={{
        ...btnBase,
        color: "var(--bg)",
        background: "var(--amber)",
        border: "1px solid var(--amber)",
      }}
      title="Pay to feature this item at the top of /marketplace for 30 days"
    >
      {detail.isBoosted ? "Extend boost" : "◆ Boost this skill"}{" "}
      <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * <SkillInstallGate>
 * Wrap les install commands : si user owned/authored, render avec full
 * commands. Sinon (anonymous SSR + paying user not yet hydrated), render
 * une version "buy first" pour les premium.
 *
 * Props :
 *   - detail : skill object
 *   - kind : "skill" | "claude_md"
 *   - render(ctx) : function qui prend { isOwned, isAuthored } et render
 * ──────────────────────────────────────────────────────────────────── */
export function SkillInstallGate({ slug, kind = "skill", render }) {
  const ctx = useSkillContext({ slug, kind });
  return render({
    isOwned: ctx?.isOwned ?? false,
    isAuthored: ctx?.isAuthored ?? false,
    hydrated: ctx !== null,
  });
}

/* ────────────────────────────────────────────────────────────────────
 * <SkillPremiumDownload>
 * Lien de download signed URL. Invisible en SSR / si user pas owned.
 * ──────────────────────────────────────────────────────────────────── */
export function SkillPremiumDownload({ slug, kind = "skill", children }) {
  const ctx = useSkillContext({ slug, kind });
  if (!ctx?.premiumDownloadUrl) return null;
  return typeof children === "function"
    ? children({
        downloadUrl: ctx.premiumDownloadUrl,
        isAuthored: ctx.isAuthored,
      })
    : null;
}

/* ────────────────────────────────────────────────────────────────────
 * <SkillPromoteSlotGate>
 * Wrap le PromoteSkillSlot : passe isAuthored au render-prop.
 * ──────────────────────────────────────────────────────────────────── */
export function SkillPromoteSlotGate({ slug, kind = "skill", render }) {
  const ctx = useSkillContext({ slug, kind });
  return render({ isAuthored: ctx?.isAuthored ?? false });
}
