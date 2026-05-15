import Link from "next/link";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { HeroHeadline } from "@/components/motion/hero-headline";
import { HeroShapes } from "@/components/hero-shapes";
import { CliDemo } from "@/components/cli-demo";
import { HeroSearch } from "@/components/hero-search";
import { UtcClock } from "@/components/utc-clock";
import { JUDGES } from "@/lib/judges";

/**
 * LandingHero — top section of `/` extracted from page.js (mai 2026).
 *
 * Hiérarchie d'info (audit mobile) :
 *   1. Eyebrow + UTC clock (desktop) — context discret
 *   2. H1 slogan énorme (clamp 72-200px)
 *   3. Sous-titre clair (value prop pour visiteur non-tech)
 *   4. Search input (CTA primaire)
 *   5. Liens secondaires (Browse / How / What)
 *   6. Preuve sociale 3 juges en bas, séparée par border-top
 *
 * Mobile :
 *   - CLI demo masqué (terminal noir = "outil dev" pour non-tech)
 *   - UtcClock masqué (bruit)
 *   - Padding latéral 20px min
 */
export function LandingHero({ counts }) {
  return (
    <section
      style={{
        position: "relative",
        padding: "clamp(32px, 5.5vw, 80px) clamp(20px, 4.5vw, 64px) clamp(56px, 10vw, 128px)",
        overflow: "hidden",
      }}
    >
      <HeroShapes />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <Reveal delay={0.1} duration={0.6}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 48,
            }}
          >
            <Eyebrow>An open arena for AI agent skills</Eyebrow>
            <span className="vz-hide-mobile">
              <UtcClock />
            </span>
          </div>
        </Reveal>

        <div style={{ maxWidth: 1280 }}>
          <HeroHeadline />
        </div>

        <div
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 64,
            alignItems: "flex-end",
          }}
          className="vz-hero-foot"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 640 }}>
            <Reveal delay={0.2} duration={0.5}>
              <p
                className="vz-hero-lede"
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(20px, 3vw, 26px)",
                  fontWeight: 400,
                  lineHeight: 1.4,
                  letterSpacing: "-0.01em",
                  color: "var(--fg)",
                }}
              >
                <strong style={{ fontWeight: 500 }}>
                  The public leaderboard for AI agent skills.
                </strong>{" "}
                Thousands of skills (the files that teach Claude, Cursor and Codex
                how to do specific tasks). We test them all daily, three AI judges
                score them, you see which one actually works.{" "}
                <span style={{ color: "var(--accent)" }}>Free. Open. Updated every 24h.</span>
              </p>
            </Reveal>

            <Reveal delay={0.3} duration={0.5}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <HeroSearch totalItems={counts.skills + counts.claudeMds} />
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: "var(--fg-muted)",
                    alignItems: "center",
                  }}
                >
                  <Link
                    href="/marketplace"
                    style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
                  >
                    Browse all →
                  </Link>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <Link
                    href="/methodology"
                    style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
                  >
                    How rankings work
                  </Link>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <Link
                    href="#how"
                    style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 4 }}
                  >
                    What is Versuz
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.4} duration={0.5}>
              <div
                className="vz-hero-judges"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 18,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  flexWrap: "wrap",
                  paddingTop: 18,
                  borderTop: "1px solid var(--rule)",
                }}
              >
                <span style={{ opacity: 0.7 }}>Judged by</span>
                {JUDGES.map((j) => (
                  <span
                    key={j.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span aria-hidden style={{ width: 6, height: 6, background: j.color }} />
                    {j.shortLabel}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* CliDemo : masqué <900px via globals.css. Pas de Reveal wrapper
              car CliDemo gère son propre stagger animation (cli-demo.jsx +
              globals.css). */}
          <div
            className="vz-hero-cli-demo"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-end",
            }}
          >
            <CliDemo />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "flex-end",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-muted)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    background: "var(--accent)",
                    boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)",
                  }}
                />
                scrape running · v0.1 beta
              </span>
              <span style={{ color: "var(--fg)", letterSpacing: "0.04em" }}>
                free · open · no signup
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
