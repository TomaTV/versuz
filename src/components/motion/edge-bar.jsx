"use client";

import { motion } from "framer-motion";

/**
 * Animated colored edge bar — scales in from a chosen origin.
 */
export function EdgeBar({
  side = "left",
  offset = 80,
  length = 180,
  thickness = 3,
  color = "var(--accent)",
  delay = 0,
  duration = 1.0,
  origin = "start", // "start" | "end" — which end the bar grows from
}) {
  const isVertical = side === "left" || side === "right";
  const transformOrigin = isVertical
    ? origin === "start"
      ? "center top"
      : "center bottom"
    : origin === "start"
      ? "left center"
      : "right center";

  const style = {
    position: "absolute",
    background: color,
    pointerEvents: "none",
    zIndex: 1,
    transformOrigin,
    [side]: 0,
    ...(isVertical
      ? { top: offset, width: thickness, height: length }
      : { left: offset, height: thickness, width: length }),
  };

  return (
    <motion.span
      aria-hidden
      style={style}
      initial={isVertical ? { scaleY: 0 } : { scaleX: 0 }}
      animate={isVertical ? { scaleY: 1 } : { scaleX: 1 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
