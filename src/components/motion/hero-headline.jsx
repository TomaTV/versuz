/**
 * HeroHeadline — word-by-word reveal via CSS only.
 *
 * Was using framer-motion. Same problem as Reveal — initial state was
 * opacity:0 and visible only after JS hydration, leaving the hero blank in
 * Next dev for 5-20s while Turbopack compiled. Switched to a CSS keyframe
 * with per-word delay; visible from frame one.
 */

import { Fragment } from "react";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function HeroHeadline() {
  const lineOne = ["Skills", "go", "in."];

  return (
    <h1
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(48px, 11vw, 168px)",
        fontWeight: 400,
        letterSpacing: "-0.045em",
        lineHeight: 0.92,
        margin: 0,
        color: "var(--fg)",
        wordBreak: "break-word",
      }}
    >
      <span style={{ display: "block" }}>
        {lineOne.map((word, i) => (
          <Fragment key={`a-${i}`}>
            <Word delay={i * 0.08}>{word}</Word>
            {i < lineOne.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
      <span style={{ display: "block" }}>
        <Word delay={0.32}>Only</Word>{" "}
        <em
          style={{
            fontStyle: "italic",
            display: "inline-block",
            color: "var(--accent)",
            animation: `vz-headline-pop 1s ${EASE} 0.55s both`,
          }}
        >
          one
        </em>{" "}
        <Word delay={0.85}>wins.</Word>
      </span>
    </h1>
  );
}

function Word({ children, delay = 0 }) {
  return (
    <span
      style={{
        display: "inline-block",
        animation: `vz-headline-rise 0.9s ${EASE} ${delay}s both`,
      }}
    >
      {children}
    </span>
  );
}
