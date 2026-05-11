import { ImageResponse } from "next/og";
import { getSkillBySlug } from "@/lib/queries/rankings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Versuz skill";

export default async function Image({ params }) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);

  const name = skill?.name || slug;
  const description = skill?.description || "Public AI agent skill on Versuz.";
  const category = skill?.category || "skill";
  const stars = skill?.stars ?? 0;
  const forks = skill?.forks ?? 0;
  const author = skill?.author || "";
  const tier = skill?.tier || "free";
  const tierLabel = tier === "free" ? "FREE" : tier === "premium" ? "PREMIUM" : "FEATURED";
  const tierColor = tier === "free" ? "#6b6557" : tier === "premium" ? "#c2410c" : "#3f7d4f";

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
          <span style={{ fontWeight: 600, color: "#14120e" }}>versuz</span>
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
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6b6557",
            }}
          >
            <span
              style={{
                padding: "6px 14px",
                background: tierColor,
                color: "#f2eee6",
                fontWeight: 600,
                letterSpacing: "0.12em",
              }}
            >
              {tierLabel}
            </span>
            {author && <span>by {author}</span>}
          </div>

          <div
            style={{
              fontSize: name.length > 24 ? 96 : 128,
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#14120e",
              wordBreak: "break-word",
              fontFamily: "serif",
            }}
          >
            {name}
          </div>

          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: "#14120e",
              maxWidth: 980,
              display: "-webkit-box",
              WebkitLineClamp: 3,
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
