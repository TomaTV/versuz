import Link from "next/link";
import { PageHero, Section } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

export const metadata = {
  title: "Blog — building Versuz in public",
  description:
    "Notes from building Versuz, the open public benchmark for AI agent skills. Solo dev, indexing 100k+ items, anti-spam, CLI design.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Versuz · Blog",
    description:
      "Notes from building Versuz — solo, in public. Indexing 100k+ skills, anti-spam, CLI design, more.",
    url: "/blog",
    type: "website",
  },
};

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Building Versuz <em style={{ color: "var(--accent)" }}>in public</em>.
          </>
        }
        subtitle="Notes on indexing 100k+ AI agent skills, designing a CLI nobody asked for, fighting spam as a solo dev, and the cost of a 3-judge benchmark engine."
      />

      <Section eyebrow={`§ ${posts.length} posts`} markerColor="var(--accent)" paddingY={64}>
        {posts.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
            }}
          >
            No posts yet.
          </p>
        ) : (
          <RevealStagger
            stagger={0.06}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {posts.map((post) => (
              <RevealItem key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 24,
                    padding: "28px 0",
                    borderTop: "1px solid var(--rule)",
                    textDecoration: "none",
                    color: "var(--fg)",
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-muted)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                      }}
                    >
                      {formatDate(post.dateISO)}
                      {post.tags?.length ? ` · ${post.tags.join(" · ")}` : ""}
                    </span>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(28px, 4vw, 42px)",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                        color: "var(--fg)",
                      }}
                    >
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-geist)",
                          fontSize: 16,
                          lineHeight: 1.6,
                          color: "var(--fg-muted)",
                          maxWidth: 720,
                        }}
                      >
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--accent)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Read →
                  </span>
                </Link>
              </RevealItem>
            ))}
          </RevealStagger>
        )}
      </Section>
    </div>
  );
}
