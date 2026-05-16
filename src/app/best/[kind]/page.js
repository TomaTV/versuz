import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/section";
import { RevealStagger, RevealItem } from "@/components/motion/reveal";
import {
  getRankableCategories,
  getProjectCategories,
} from "@/lib/queries/rankings";

export const revalidate = 3600;

const KINDS = new Set(["skill", "claude-md"]);

function kindLabel(kind) {
  return kind === "skill" ? "Claude Code skill" : "CLAUDE.md project context";
}

export async function generateStaticParams() {
  return [{ kind: "skill" }, { kind: "claude-md" }];
}

export async function generateMetadata({ params }) {
  const { kind } = await params;
  if (!KINDS.has(kind)) return {};
  const niceKind = kindLabel(kind);
  const title = `Best ${niceKind}s by category`;
  return {
    title,
    description: `Browse the top-ranked ${niceKind}s across every category. Daily benchmark, three frontier LLM judges, no stars.`,
    alternates: { canonical: `/best/${kind}` },
    openGraph: { title, url: `/best/${kind}`, type: "website" },
  };
}

export default async function BestKindIndex({ params }) {
  const { kind } = await params;
  if (!KINDS.has(kind)) notFound();

  const cats =
    kind === "skill" ? await getRankableCategories() : await getProjectCategories();
  const visible = (cats || []).filter(
    (c) => c.id && c.id !== "all" && c.id !== "other"
  );
  const niceKind = kindLabel(kind);
  const otherKind = kind === "skill" ? "claude-md" : "skill";

  return (
    <div>
      <PageHero
        eyebrow={`Best · ${kind === "skill" ? "skills" : "CLAUDE.md"}`}
        title={
          <>
            Best <em style={{ color: "var(--accent)" }}>{niceKind}s</em> by category.
          </>
        }
        subtitle="Pick a category to see its top 10, ranked daily by three frontier LLM judges. No stars, no hype — just measured performance on a held-out task suite."
      />

      <Section
        eyebrow={`§ ${visible.length} categories`}
        markerColor="var(--accent)"
        paddingY={48}
      >
        <RevealStagger
          stagger={0.03}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {visible.map((c) => (
            <RevealItem key={c.id}>
              <Link
                href={`/best/${kind}/${c.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  padding: "16px 18px",
                  border: "1px solid var(--rule)",
                  textDecoration: "none",
                  color: "var(--fg)",
                  background: "var(--surface)",
                  transition:
                    "border-color .15s ease, background .15s ease",
                }}
                className="vz-best-cat-card"
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {c.label || c.id}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.count ?? 0}
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealStagger>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            href={`/best/${otherKind}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              background: "var(--fg)",
              color: "var(--bg)",
              fontFamily: "var(--font-display)",
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            See best {otherKind === "claude-md" ? "CLAUDE.md" : "skills"}
            <span>→</span>
          </Link>
          <Link
            href="/leaderboard"
            style={{
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Full leaderboard ↗
          </Link>
        </div>
      </Section>
    </div>
  );
}
