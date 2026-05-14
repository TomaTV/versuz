"use client";

import { useEffect, useState } from "react";

// Bench cycles run daily at 06:00 UTC (see CONTEXT.md + GitHub Actions
// schedule). Countdown is computed client-side to avoid SSR/CSR drift —
// the server renders the placeholder "—:—:—" and we hydrate to live values.

const NEXT_CYCLE_HOUR_UTC = 6;

function pad(n) {
  return String(n).padStart(2, "0");
}

function getRemaining(now = new Date()) {
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(NEXT_CYCLE_HOUR_UTC);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const ms = next - now;
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function NextCycleCountdown({ variant = "long" }) {
  const [t, setT] = useState(null);

  useEffect(() => {
    function tick() {
      setT(getRemaining());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!t) {
    return (
      <span suppressHydrationWarning>
        {variant === "long" ? "NEXT CYCLE · —:—:—" : "NEXT · —:—"}
      </span>
    );
  }

  if (variant === "short") {
    return (
      <span suppressHydrationWarning>
        NEXT · {pad(t.h)}:{pad(t.m)}
      </span>
    );
  }

  return (
    <span suppressHydrationWarning>
      NEXT CYCLE IN {pad(t.h)}:{pad(t.m)}:{pad(t.s)} UTC
    </span>
  );
}
