import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/section";
import { getRegistryByRepo, getAllRanksBySlug } from "@/lib/queries/rankings";
import { BackButton } from "@/components/site/back-button";
import { RepoSkillCard } from "@/components/repo/repo-skill-card";

// ISR 10min. Repo bundle pages — listing rarement updated entre 2 cycles
// de scrape (daily). Cible massive de bots crawlers GitHub-pattern.
export const revalidate = 600;

export async function generateMetadata({ params }) {
  const { owner, repo } = await params;
  const o = decodeURIComponent(owner || "");
  const r = decodeURIComponent(repo || "");
  return {
    title: `${o}/${r} — Versuz registry`,
    description: `All SKILL.md and CLAUDE.md entries indexed from ${o}/${r} on Versuz.`,
  };
}

export default async function RepoBundlePage({ params }) {
  const { owner: ownerSeg, repo: repoSeg } = await params;
  const owner = decodeURIComponent(ownerSeg || "");
  const repo = decodeURIComponent(repoSeg || "");
  if (!owner || !repo) notFound();

  const [bundle, ranks] = await Promise.all([
    getRegistryByRepo(ownerSeg, repoSeg),
    getAllRanksBySlug(),
  ]);

  const total = bundle.skills.length + bundle.claudeMds.length;
  if (total === 0) notFound();

  function stamp(item, k) {
    const key = `${k}:${item.slug}`;
    const hit = ranks[key];
    return hit ? { ...item, rank: hit.rank, avgScore: hit.avg_score } : item;
  }

  const ghHref = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  return (
    <div>
      <PageHero
        eyebrow="Repository bundle"
        title={
          <>
            <span style={{ color: "var(--fg-muted)" }}>{owner}</span>
            <span style={{ color: "var(--rule-strong)" }}>/</span>
            <em style={{ color: "var(--accent)" }}>{repo}</em>
          </>
        }
        subtitle={`${bundle.skills.length} skill${bundle.skills.length !== 1 ? "s" : ""} · ${bundle.claudeMds.length} CLAUDE.md · same GitHub repo on Versuz.`}
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <BackButton fallbackHref="/marketplace" label="← Marketplace" />
          <Link
            href={ghHref}
            target="_blank"
            rel="noreferrer"
            style={{
              marginLeft: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--accent)",
              textDecoration: "none",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            Open on GitHub ↗
          </Link>
        </div>

        {bundle.skills.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 400,
                marginBottom: 16,
                letterSpacing: "-0.02em",
              }}
            >
              SKILL.md in this repo
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderTop: "1px solid var(--rule-strong)",
              }}
            >
              {bundle.skills.filter((s) => s && s.slug).map((s) => {
                const it = stamp(s, "skill");
                return (
                  <li
                    key={s.slug}
                    style={{
                      borderBottom: "1px solid var(--rule)",
                      padding: "16px 0",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/skills/${s.slug}`}
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            color: "var(--fg)",
                            textDecoration: "none",
                            borderBottom: "1px solid transparent",
                          }}
                        >
                          {s.name}
                        </Link>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.category}
                          {it.rank != null && (
                            <>
                              {" "}
                              · #{it.rank}
                            </>
                          )}
                        </span>
                      </div>
                      <RepoSkillCard item={s} rank={it.rank} kind="skill" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {bundle.claudeMds.length > 0 && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 400,
                marginBottom: 16,
                letterSpacing: "-0.02em",
              }}
            >
              CLAUDE.md in this repo
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderTop: "1px solid var(--rule-strong)",
              }}
            >
              {bundle.claudeMds.filter((c) => c && c.slug).map((c) => {
                const it = stamp(c, "claude_md");
                const cat = c.project_category || "generic";
                return (
                  <li
                    key={c.slug}
                    style={{
                      borderBottom: "1px solid var(--rule)",
                      padding: "16px 0",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/claude-md/${cat}/${c.slug}`}
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            color: "var(--fg)",
                            textDecoration: "none",
                            borderBottom: "1px solid transparent",
                          }}
                        >
                          {c.slug}
                        </Link>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {cat}
                          {it.rank != null && (
                            <>
                              {" "}
                              · #{it.rank}
                            </>
                          )}
                        </span>
                      </div>
                      <RepoSkillCard item={c} kind="claude_md" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
