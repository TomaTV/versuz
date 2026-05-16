"use client";

import { track } from "@/lib/track";

/**
 * Wraps a children block in a span that fires a PostHog event on bubbling
 * click. Use to instrument server-rendered <Link> or <button> trees from
 * the parent without converting the leaf to a client component.
 *
 * Usage :
 *   <TrackClick event="cta_submit_click" props={{ placement: "header" }}>
 *     <Link href="/submit">Submit a skill</Link>
 *   </TrackClick>
 */
export function TrackClick({ event, props = {}, children, as: As = "span", style }) {
  return (
    <As
      onClick={() => track(event, props)}
      style={{ display: "contents", ...style }}
    >
      {children}
    </As>
  );
}
