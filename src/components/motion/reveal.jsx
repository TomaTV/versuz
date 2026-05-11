/**
 * Reveal — CSS-only fade-up animation.
 *
 * Was using framer-motion `whileInView`, which initialised every wrapped
 * element to opacity:0 in SSR. In Next dev, the JS bundle takes 5-20s to
 * hydrate (Turbopack cold compile), and during that window every Reveal'd
 * piece of text was invisible — only static absolute shapes rendered. UX
 * disaster.
 *
 * Now: pure CSS keyframe with `animation-fill-mode: both`. The element is
 * laid out invisible at frame 0, animated in over `duration` seconds, then
 * stays at the resolved state. Runs the moment the element is parsed by
 * the browser — no JS, no hydration dependency.
 *
 * Trade-off: we lose the "animate only when scrolled into view" trigger.
 * Acceptable here because most Reveal'd content lives near the top of its
 * section and is visible on initial paint anyway. For heavier intersect-
 * based reveals we'd reach for an IntersectionObserver explicitly.
 */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Reveal({
  children,
  delay = 0,
  duration = 0.7,
  className,
  style,
}) {
  return (
    <div
      className={className}
      style={{
        ...style,
        animation: `vz-reveal-in ${duration}s ${EASE} ${delay}s both`,
      }}
    >
      {children}
    </div>
  );
}

export function RevealStagger({
  children,
  stagger = 0.08,
  delayChildren = 0,
  className,
  style,
}) {
  // Children that render via RevealItem inherit a per-index delay through
  // CSS variables — no JS context needed.
  return (
    <div
      className={className}
      style={{
        ...style,
        ["--vz-stagger"]: `${stagger}s`,
        ["--vz-stagger-base"]: `${delayChildren}s`,
      }}
    >
      {children}
    </div>
  );
}

export function RevealItem({ children, className, style }) {
  // The browser doesn't auto-derive child index for CSS, so each item
  // animates with the base delay. Inside a RevealStagger container the
  // CSS rule `vz-stagger-children` (in globals.css) computes per-child
  // delays via :nth-child().
  return (
    <div
      className={`vz-stagger-child${className ? ` ${className}` : ""}`}
      style={{
        ...style,
        animation: `vz-reveal-in 0.7s ${EASE} both`,
      }}
    >
      {children}
    </div>
  );
}
