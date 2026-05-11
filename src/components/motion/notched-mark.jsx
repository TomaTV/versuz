"use client";

import { motion } from "framer-motion";

const CLIP_BY_NOTCH = {
  "top-right": (n) =>
    `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, 0 100%)`,
  "top-left": (n) =>
    `polygon(${n}px 0, 100% 0, 100% 100%, 0 100%, 0 ${n}px)`,
  "bottom-right": (n) =>
    `polygon(0 0, 100% 0, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, 0 100%)`,
  "bottom-left": (n) =>
    `polygon(0 0, 100% 0, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`,
  "top-both": (n) =>
    `polygon(${n}px 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, 0 100%, 0 ${n}px)`,
};

/**
 * NotchedMark — a clipped-corner rectangle. Geometric and distinctive,
 * without softening the brand's square-corner principle.
 *
 * Use as a decorative block (filled), or as a frame (outlined via inner shadow trick).
 */
export function NotchedMark({
  notch = "top-right",
  size = 28,
  width = "100%",
  height = "100%",
  color = "var(--accent)",
  children,
  delay = 0,
  initial = "scale", // "scale" | "fade"
  className,
  style,
}) {
  const clipPath = CLIP_BY_NOTCH[notch](size);
  const initialVariant =
    initial === "scale"
      ? { scale: 0.92, opacity: 0 }
      : { opacity: 0, y: 16 };
  const animateVariant =
    initial === "scale"
      ? { scale: 1, opacity: 1 }
      : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initialVariant}
      animate={animateVariant}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        width,
        height,
        background: color,
        clipPath,
        WebkitClipPath: clipPath,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
