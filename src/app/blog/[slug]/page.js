import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { getPostBySlug, getPostSlugs, getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      type: "article",
      publishedTime: post.dateISO,
      authors: [post.author || "Toma"],
      tags: post.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

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

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const Body = post.Body;
  const allPosts = getAllPosts();
  const siblings = allPosts.filter((p) => p.slug !== slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.dateISO,
    author: { "@type": "Person", name: post.author || "Toma" },
    publisher: {
      "@type": "Organization",
      name: "Versuz",
      url: "https://versuz.dev",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://versuz.dev/blog/${slug}`,
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow={`${formatDate(post.dateISO)}${post.tags?.length ? " · " + post.tags.join(" · ") : ""}`}
        title={post.title}
        subtitle={post.excerpt}
      />

      <Section eyebrow="§ The piece" markerColor="var(--accent)" paddingY={64}>
        <article
          style={{
            maxWidth: 720,
            margin: "0 auto",
            fontFamily: "var(--font-geist)",
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--fg)",
          }}
          className="vz-blog-body"
        >
          <Body />
        </article>
      </Section>

      {siblings.length > 0 && (
        <Section eyebrow="§ More" markerColor="var(--azure)" paddingY={64}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {siblings.map((sib) => (
              <Reveal key={sib.slug}>
                <Link
                  href={`/blog/${sib.slug}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "22px 24px",
                    border: "1px solid var(--rule)",
                    textDecoration: "none",
                    color: "var(--fg)",
                    height: "100%",
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
                    {formatDate(sib.dateISO)}
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                      color: "var(--fg)",
                    }}
                  >
                    {sib.title}
                  </h3>
                  {sib.excerpt && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--fg-muted)",
                      }}
                    >
                      {sib.excerpt}
                    </p>
                  )}
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
