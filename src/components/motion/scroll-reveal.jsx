"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/**
 * ScrollReveal — framer-motion `whileInView` wrapper.
 *
 * Animation fades + slides un élément quand il entre dans le viewport.
 * Une seule fois (viewport.once), ne se rejoue pas au re-scroll.
 *
 * Pourquoi pas le whileInView "natif" : on garde le composant pour
 * normaliser les paramètres (direction / distance / delay), de sorte que
 * tous les reveals de la landing partagent les mêmes timing et easing.
 *
 * Props :
 *   - direction : "up" (default) · "left" · "right" · "scale"
 *   - distance  : px du déplacement (default 24)
 *   - delay     : ms (default 0) — converti en s pour framer
 *   - duration  : ms (default 700) — converti en s pour framer
 *   - threshold : 0-1, fraction visible avant trigger (default 0.15)
 */
export function ScrollReveal({
  children,
  delay = 0,
  duration = 700,
  direction = "up",
  distance = 24,
  threshold = 0.15,
  className,
  style,
}) {
  const initial = (() => {
    if (direction === "left") return { opacity: 0, x: -distance };
    if (direction === "right") return { opacity: 0, x: distance };
    if (direction === "scale") return { opacity: 0, scale: 0.94 };
    return { opacity: 0, y: distance };
  })();
  const animate = { opacity: 1, x: 0, y: 0, scale: 1 };

  return (
    <motion.div
      className={className}
      style={style}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: threshold, margin: "0px 0px -15% 0px" }}
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScrollRevealStagger — children apparaissent en cascade quand le container
 * entre dans le viewport. Utilise les variants framer pour la chorégraphie
 * (cleaner que des delays per-child).
 */
export function ScrollRevealStagger({
  children,
  stagger = 60,       // ms entre items
  delay = 0,          // ms global avant le 1er item
  duration = 500,     // ms par item
  direction = "up",
  distance = 16,
  threshold = 0.1,
  className,
  style,
}) {
  const container = {
    hidden: {},
    show: {
      transition: {
        delayChildren: delay / 1000,
        staggerChildren: stagger / 1000,
      },
    },
  };

  const item = {
    hidden: (() => {
      if (direction === "left") return { opacity: 0, x: -distance };
      if (direction === "right") return { opacity: 0, x: distance };
      if (direction === "scale") return { opacity: 0, scale: 0.92 };
      return { opacity: 0, y: distance };
    })(),
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: duration / 1000, ease: EASE },
    },
  };

  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: threshold, margin: "0px 0px -15% 0px" }}
      variants={container}
    >
      {items.map((child, i) => (
        <motion.div key={child?.key ?? i} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
