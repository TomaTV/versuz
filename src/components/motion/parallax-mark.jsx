"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * ParallaxVsMark — the giant italic "vs" focal element in the hero.
 * Translates and rotates slightly as the user scrolls.
 */
export function ParallaxVsMark() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.6, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, -2]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        right: 64,
        top: 120,
        fontFamily: "var(--font-display)",
        fontSize: "clamp(220px, 26vw, 440px)",
        fontStyle: "italic",
        fontWeight: 400,
        color: "var(--accent)",
        opacity,
        y,
        rotate,
        lineHeight: 0.85,
        letterSpacing: "-0.06em",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
      }}
    >
      vs
    </motion.div>
  );
}

/**
 * ParallaxStripes — the multi-color editorial stripes block, parallax-locked.
 */
export function ParallaxStripes() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-40, 80]);

  return (
    <motion.svg
      ref={ref}
      aria-hidden
      width="200"
      height="240"
      viewBox="0 0 200 240"
      style={{
        position: "absolute",
        right: 32,
        top: 140,
        pointerEvents: "none",
        y,
        zIndex: 0,
      }}
    >
      <rect x="0" y="0" width="200" height="14" fill="var(--fg)" />
      <rect x="40" y="22" width="160" height="14" fill="var(--accent)" />
      <rect x="0" y="44" width="120" height="14" fill="var(--azure)" />
      <rect x="60" y="66" width="140" height="14" fill="var(--sage)" />
      <rect x="20" y="88" width="100" height="14" fill="var(--amber)" />
      <rect x="80" y="110" width="120" height="14" fill="var(--fg)" opacity="0.4" />
      <rect x="0" y="132" width="80" height="14" fill="var(--accent)" opacity="0.5" />
    </motion.svg>
  );
}
