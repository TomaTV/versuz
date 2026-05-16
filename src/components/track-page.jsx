"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * Fires a named PostHog event on mount with the given properties. Used
 * to instrument server-component pages : drop `<TrackPage event="..." />`
 * inside the page tree and the event fires client-side once the page
 * hydrates. Idempotent across pure remounts but obviously re-fires on
 * route change (which is the intent).
 */
export function TrackPage({ event, props = {} }) {
  useEffect(() => {
    track(event, props);
  }, [event, JSON.stringify(props)]);
  return null;
}
