import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getOwnedSlugs, getAuthoredSlugs } from "@/lib/purchases/server";
import { signPremiumDownloadUrl } from "@/lib/premium/storage";
import { getSkillBySlug, getClaudeMdBySlug } from "@/lib/queries/rankings";

/**
 * État user-conditional d'un item (skill ou claude_md) pour le visiteur
 * courant : isOwned, isAuthored, premiumDownloadUrl signed (7d TTL,
 * gated server-side).
 *
 * Consommé par <SkillUserGate> sur /skills/[slug] et
 * /claude-md/[category]/[slug] APRÈS hydratation. Permet à la page
 * principale de rester anonymous-SSR (ISR-cacheable) — le top-level ne
 * lit plus cookies, donc Next 16 ne force plus le rendu dynamic à chaque
 * request.
 *
 * Vercel observability mai 2026 : /skills/[slug] = 58K invocations /
 * 12h, 25min CPU (#1 CPU sink). Avec ce refactor, le shell de la page
 * est cached ISR, seul ce endpoint est dynamic — coût marginal car
 * utilisateurs connectés uniquement (les bots n'envoient pas de cookies).
 *
 * GET /api/v1/me/skill-context?slug=<slug>&kind=skill|claude_md
 */
export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const kindRaw = url.searchParams.get("kind") || "skill";
  const kind =
    kindRaw === "claude_md" || kindRaw === "claude-md" ? "claude_md" : "skill";

  if (!slug) {
    return NextResponse.json(
      { error: "missing slug" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    // Visiteur anonyme : pas besoin de fetch DB.
    return NextResponse.json(
      {
        user: null,
        isOwned: false,
        isAuthored: false,
        premiumDownloadUrl: null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const [owned, authored, item] = await Promise.all([
    getOwnedSlugs(user.id),
    getAuthoredSlugs(user.id),
    kind === "claude_md" ? getClaudeMdBySlug(slug) : getSkillBySlug(slug),
  ]);

  const ownedSet = kind === "claude_md" ? owned.claudeMds : owned.skills;
  const authoredSet = kind === "claude_md" ? authored.claudeMds : authored.skills;
  const isOwned = ownedSet.has(slug);
  const isAuthored = authoredSet.has(slug);

  let premiumDownloadUrl = null;
  if (item && (isOwned || isAuthored) && item.privateStoragePath) {
    const signed = await signPremiumDownloadUrl(item.privateStoragePath);
    if (signed.url) premiumDownloadUrl = signed.url;
  }

  return NextResponse.json(
    {
      user: { id: user.id },
      isOwned,
      isAuthored,
      premiumDownloadUrl,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
