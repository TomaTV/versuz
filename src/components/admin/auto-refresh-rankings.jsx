"use client";

import { useEffect, useTransition } from "react";
import { refreshRankings } from "@/lib/admin/actions";

/**
 * Fire refresh_rankings RPC periodically while viewing the admin page.
 * Local dev (no Vercel cron) gets the same effect. In prod the Vercel cron
 * runs every 5 min, so this client poll just adds extra coverage when admin
 * is actively monitoring a running cycle.
 *
 * Server action call is debounced via useTransition so concurrent fires don't
 * stack. Errors swallowed (best-effort).
 */
export function AutoRefreshRankings({ intervalMs = 30000 }) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    const fire = () => {
      startTransition(async () => {
        try {
          await refreshRankings();
        } catch {
          // best-effort, ignore
        }
      });
    };
    // First fire after a small delay (don't pile on with the initial page render)
    const initialTimer = setTimeout(fire, 5000);
    const interval = setInterval(fire, intervalMs);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [intervalMs]);
  return null;
}
