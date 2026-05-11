"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

/**
 * CountUp — animates a number from 0 to `value` when scrolled into view.
 */
export function CountUp({ value, duration = 1.6, format = (v) => Math.round(v).toString() }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => format(v));
  const [text, setText] = useState(format(0));

  useEffect(() => {
    return display.on("change", (v) => setText(v));
  }, [display]);

  useEffect(() => {
    if (inView) {
      const controls = animate(motionValue, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return () => controls.stop();
    }
  }, [inView, motionValue, value, duration]);

  return <motion.span ref={ref}>{text}</motion.span>;
}
