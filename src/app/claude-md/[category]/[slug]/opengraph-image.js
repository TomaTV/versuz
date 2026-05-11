import { ImageResponse } from "next/og";
import { getClaudeMdBySlug } from "@/lib/queries/rankings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz CLAUDE.md";

export default async function Image({ params }) {
  const { slug } = await params;
  const file = await getClaudeMdBySlug(slug);

  const repoFull =
    file?.author && file?.repo ? `${file.author}/${file.repo}` : file?.slug || slug;
  const description = file?.description || "Project context file scraped on Versuz.";
  const category = file?.project_category || "claude.md";
  const wordCount = file?.word_count ?? 0;
  const stars = file?.stars ?? 0;
  const forks = file?.forks ?? 0;

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
          <div style={{ flex: 1.4, background: "#3f7d4f" }} />
          <div style={{ flex: 1, background: "#2a5fa8" }} />
          <div style={{ flex: 1, background: "#c2410c" }} />
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
          <span style={{ fontWeight: 600, color: "#14120e" }}>versuz · claude.md</span>
          <span>{category}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginTop: 80,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: repoFull.length > 28 ? 72 : 96,
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
              color: "#14120e",
              wordBreak: "break-word",
              fontFamily: "serif",
            }}
          >
            {repoFull}
          </div>

          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#14120e",
              maxWidth: 980,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
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
          <div style={{ display: "flex", gap: 32 }}>
            <span>★ {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}</span>
            <span>⑂ {forks >= 1000 ? `${(forks / 1000).toFixed(1)}k` : forks}</span>
            <span>~{Math.round(wordCount * 1.3).toLocaleString()} tokens</span>
          </div>
          <span style={{ color: "#c2410c", fontStyle: "italic", fontFamily: "serif", fontSize: 28 }}>
            versuz.dev
          </span>
        </div>
      </div>
    ),
    size
  );
}
