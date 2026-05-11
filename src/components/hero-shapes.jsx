/**
 * Hero shapes — disciplined geometric accents framing the headline.
 * Animated via CSS for instant SSR visibility (was framer-motion).
 */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function HeroShapes() {
  return (
    <div
      aria-hidden
      className="vz-hero-decoration"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Azure circle — bottom-left corner only, plus reculé pour ne pas
          overlap les CTAs (Browse / How it works). */}
      <div
        className="vz-shape-round"
        style={{
          position: "absolute",
          left: -260,
          bottom: -240,
          width: 380,
          height: 380,
          background: "var(--azure)",
          animation: `vz-shape-slide-x-from-left 1.2s ${EASE} 0.5s both`,
        }}
      />

      {/* Sage ring — right edge, only the curved arc visible */}
      <div
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -240,
          top: 220,
          width: 480,
          height: 480,
          background: "var(--sage)",
          animation: `vz-shape-slide-x-from-right 1.2s ${EASE} 0.65s both`,
        }}
      />
      <div
        className="vz-shape-round"
        style={{
          position: "absolute",
          right: -140,
          top: 320,
          width: 280,
          height: 280,
          background: "var(--bg)",
          animation: `vz-shape-slide-x-from-right 1.2s ${EASE} 0.78s both`,
        }}
      />

      {/* Amber triangle — small accent, top */}
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          right: "32%",
          top: 80,
          animation: `vz-shape-rise 1s ${EASE} 0.9s both`,
        }}
      >
        <path d="M 50 6 L 94 94 L 6 94 Z" fill="var(--amber)" />
      </svg>

      {/* Ember vertical bar — left margin signature */}
      <span
        style={{
          position: "absolute",
          left: 32,
          top: 200,
          width: 4,
          height: 180,
          background: "var(--accent)",
          transformOrigin: "center top",
          animation: `vz-shape-grow-y 0.9s ${EASE} 0.3s both`,
        }}
      />

      {/* Small ember square — top-left accent above the bar */}
      <span
        style={{
          position: "absolute",
          left: 24,
          top: 160,
          width: 16,
          height: 16,
          background: "var(--accent)",
          animation: `vz-shape-pop 0.7s ${EASE} 1.1s both`,
        }}
      />
    </div>
  );
}
