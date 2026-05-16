"use client";

import posthog from "posthog-js";

/**
 * Thin wrapper around posthog.capture that no-ops if PostHog isn't
 * initialised (SSR, key missing, ad-blocker). All 10 audit events flow
 * through here so we have one place to evolve the schema if needed.
 *
 * Naming convention : <surface>_<verb_past>, lower_snake. Properties go
 * in the second arg, never mutated server-side.
 */
export function track(name, props = {}) {
  if (typeof window === "undefined") return;
  if (!posthog || !posthog.__loaded) return;
  try {
    posthog.capture(name, props);
  } catch {}
}
