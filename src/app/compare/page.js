import Link from "next/link";
import { PageHero } from "@/components/section";
import { getSkillBySlug, getClaudeMdBySlug, getJudgeDisagreement } from "@/lib/queries/rankings";
import CompareClientWrapper from "./compare-client";

export const metadata = {
  title: "Compare — Versuz",
  description:
    "Side-by-side comparison of two SKILL.md or CLAUDE.md from the Versuz registry.",
};

/**
 * Load a subject by slug. If `kind` is explicit, try that first; otherwise
 * try skill, then fall back to claude_md. Returns the loaded item along
 * with the kind that hit, so the caller knows which type the URL resolved to.
 */
async function loadSubjectAuto(kind, slug) {
  if (!slug) return { item: null, kind: null };
  if (kind === "claude-md") {
    const item = await getClaudeMdBySlug(slug);
    return { item, kind: item ? "claude-md" : null };
  }
  if (kind === "skill") {
    const item = await getSkillBySlug(slug);
    if (item) return { item, kind: "skill" };
    // Auto-fallback : maybe the user typed the wrong kind in the URL.
    const cm = await getClaudeMdBySlug(slug);
    return { item: cm, kind: cm ? "claude-md" : null };
  }
  return { item: null, kind: null };
}

export default async function ComparePage({ searchParams }) {
  const params = (await searchParams) || {};
  const requestedKind = params.kind === "claude-md" ? "claude-md" : "skill";
  const slugA = params.a || null;
  const slugB = params.b || null;

  const [resA, resB] = await Promise.all([
    loadSubjectAuto(requestedKind, slugA),
    loadSubjectAuto(requestedKind, slugB),
  ]);
  const a = resA.item;
  const b = resB.item;
  // Resolve effective kind : both items must agree, else mismatch.
  const kind = resA.kind || resB.kind || requestedKind;
  const kindMismatch = a && b && resA.kind !== resB.kind;

  // Load judge disagreement data for both items (same data the detail pages use)
  const effectiveKind = kind === "claude-md" ? "claude_md" : kind;
  const [disagreementA, disagreementB] = await Promise.all([
    a ? getJudgeDisagreement({ kind: effectiveKind, subjectId: a.id }) : null,
    b ? getJudgeDisagreement({ kind: effectiveKind, subjectId: b.id }) : null,
  ]);

  if (!slugA || !slugB || !a || !b || kindMismatch) {
    return (
      <div>
        <PageHero
          eyebrow="Compare"
          title={
            <>
              Pick <em style={{ color: "var(--accent)" }}>two</em>.
            </>
          }
          subtitle="Pick 2 items from the marketplace using the checkbox on each card, then click 'Compare' in the bottom bar."
        />
        <section
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {!slugA || !slugB ? (
            <p>
              Missing one or both slugs. Browse the{" "}
              <Link href="/marketplace" className="vz-link">
                marketplace
              </Link>{" "}
              and tick 2 checkboxes.
            </p>
          ) : kindMismatch ? (
            <p>
              Can&apos;t compare a skill with a CLAUDE.md — they&apos;re different
              entity types. Pick two of the same kind from{" "}
              <Link href="/marketplace" className="vz-link">marketplace</Link>.
            </p>
          ) : (
            <p>
              {!a && <>&ldquo;{slugA}&rdquo; not found. </>}
              {!b && <>&ldquo;{slugB}&rdquo; not found. </>}
              Browse the{" "}
              <Link href="/marketplace" className="vz-link">
                marketplace
              </Link>{" "}
              to find slugs.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <CompareClientWrapper
      a={a}
      b={b}
      kind={kind}
      isSkill={kind === "skill"}
      disagreementA={disagreementA}
      disagreementB={disagreementB}
    />
  );
}
