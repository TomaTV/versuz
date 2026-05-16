import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz blog post";

/**
 * Dynamic OG card for blog posts. Each post gets its own 1200×630 PNG
 * with brand stripe + title + date + tags + versuz.dev wordmark.
 * Cached 24h at the edge, 7d SWR — posts don't change after publish.
 *
 * Matches the visual language of src/app/skills/[slug]/opengraph-image.js
 * (same brand stripe ratio, same palette, same wordmark treatment) so
 * the social timeline reads coherently when multiple Versuz cards appear
 * side-by-side.
 */
export default async function Image({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    // Fallback — generic Versuz blog card.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#f2eee6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
          }}
        >
          <div
            style={{
              fontSize: 96,
              color: "#14120e",
              fontStyle: "italic",
              letterSpacing: "-0.03em",
            }}
          >
            versuz · blog
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const dateLabel = post.dateISO
    ? new Date(post.dateISO).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const titleFontSize = post.title.length > 70 ? 64 : post.title.length > 40 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f2eee6",
          padding: 80,
          color: "#14120e",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            display: "flex",
          }}
        >
          <div style={{ flex: 1.4, background: "#c2410c" }} />
          <div style={{ flex: 1, background: "#2a5fa8" }} />
          <div style={{ flex: 1, background: "#3f7d4f" }} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6b6557",
          }}
        >
          <span style={{ fontWeight: 600, color: "#14120e" }}>versuz · blog</span>
          <span>{dateLabel}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 72,
            flex: 1,
          }}
        >
          {(post.tags || []).length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#c2410c",
                fontWeight: 600,
              }}
            >
              {(post.tags || []).slice(0, 3).map((t, i) => (
                <span
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {i > 0 && <span style={{ color: "#6b6557" }}>·</span>}
                  <span>{t}</span>
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#14120e",
              wordBreak: "break-word",
              fontFamily: "serif",
              fontStyle: "italic",
            }}
          >
            {post.title}
          </div>

          {post.excerpt && (
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                color: "#6b6557",
                maxWidth: 980,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.excerpt}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid rgba(20,18,14,0.24)",
            fontSize: 22,
            color: "#6b6557",
            letterSpacing: "0.06em",
          }}
        >
          <span>{post.author ? `by ${post.author}` : ""}</span>
          <span
            style={{
              color: "#c2410c",
              fontStyle: "italic",
              fontFamily: "serif",
              fontSize: 28,
            }}
          >
            versuz.dev
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
