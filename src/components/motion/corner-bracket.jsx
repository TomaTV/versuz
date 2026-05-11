"use client";

import { motion } from "framer-motion";

const POSITIONS = {
  "top-left": { top: 24, left: 24, rotate: 0 },
  "top-right": { top: 24, right: 24, rotate: 90 },
  "bottom-right": { bottom: 24, right: 24, rotate: 180 },
  "bottom-left": { bottom: 24, left: 24, rotate: 270 },
};

/**
 * Animated L-bracket at a section corner. Draws stroke on mount.
 */
export function CornerBracket({
  position = "top-left",
  color = "var(--accent)",
  size = 64,
  delay = 0,
}) {
  const p = POSITIONS[position];
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={{
        position: "absolute",
        pointerEvents: "none",
        top: p.top,
        left: p.left,
        right: p.right,
        bottom: p.bottom,
        transform: `rotate(${p.rotate}deg)`,
        zIndex: 2,
      }}
    >
      <motion.path
        d="M 2 32 L 2 2 L 32 2"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="square"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.3, delay },
        }}
      />
      <motion.circle
        cx="2"
        cy="2"
        r="3"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.svg>
  );
}
