import { Reveal } from "@/components/motion/reveal";

/**
 * Section — wrapper with a top border, eyebrow tag with a colored marker.
 * Used across pages for consistent rhythm.
 */
export function Section({
  id,
  eyebrow,
  markerColor = "var(--accent)",
  children,
  paddingY = 120,
  noBorder = false,
}) {
  // Responsive padding via clamp() — scales horizontal from 16px (320px viewport)
  // up to 64px (>1500px), vertical scales from 60% of paddingY up to 100%.
  const padX = "clamp(16px, 4.5vw, 64px)";
  const padYResponsive = `clamp(${Math.round(paddingY * 0.5)}px, ${(paddingY / 12).toFixed(2)}vw, ${paddingY}px)`;
  return (
    <section
      id={id}
      style={{
        position: "relative",
        maxWidth: 1440,
        margin: "0 auto",
        padding: `${padYResponsive} ${padX}`,
        borderTop: noBorder ? "none" : "1px solid var(--rule)",
      }}
    >
      {eyebrow && (
        <Reveal>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span aria-hidden style={{ width: 12, height: 12, background: markerColor }} />
            <span>{eyebrow}</span>
          </div>
        </Reveal>
      )}
      {children}
    </section>
  );
}

/**
 * SectionHeader — h2 + optional subtitle.
 */
export function SectionHeader({ title, subtitle, titleSize = "clamp(40px, 5vw, 80px)" }) {
  return (
    <>
      <Reveal delay={0.05}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: titleSize,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: "var(--fg)",
            maxWidth: 1100,
          }}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.15}>
          <p
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              color: "var(--fg-muted)",
              maxWidth: 720,
            }}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </>
  );
}

/**
 * PageHero — bigger eyebrow + headline + subtitle for top of pages.
 */
export function PageHero({ eyebrow, title, subtitle, decoration, compact = false }) {
  // `compact` halves vertical padding + drops title to clamp(40, 5, 72) for
  // utility pages (profile, settings, earnings, manage) where the editorial
  // 144px headline is overkill and pushes content below the fold.
  return (
    <section
      style={{
        position: "relative",
        maxWidth: 1440,
        margin: "0 auto",
        padding: compact
          ? "clamp(28px, 4vw, 48px) clamp(16px, 4.5vw, 64px) clamp(20px, 3vw, 36px)"
          : "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 80px)",
        overflow: "hidden",
      }}
    >
      {decoration}
      <div style={{ position: "relative", zIndex: 1 }}>
        {eyebrow && (
          <Reveal delay={0.05}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                marginBottom: compact ? 16 : 32,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-muted)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span
                aria-hidden
                style={{ width: 12, height: 12, background: "var(--accent)" }}
              />
              <span>{eyebrow}</span>
            </div>
          </Reveal>
        )}
        <Reveal delay={0.1}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: compact ? "clamp(36px, 4.5vw, 64px)" : "clamp(56px, 8vw, 144px)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "var(--fg)",
              maxWidth: 1280,
            }}
          >
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.2}>
            <p
              style={{
                margin: compact ? "12px 0 0" : "32px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: compact ? 16 : 22,
                fontWeight: 400,
                lineHeight: 1.45,
                letterSpacing: "-0.01em",
                color: "var(--fg-muted)",
                maxWidth: 760,
              }}
            >
              {subtitle}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
