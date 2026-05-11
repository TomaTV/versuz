"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Smart back button : uses browser history if available, otherwise falls
 * back to the explicit `fallbackHref`. Renders as a Link for SSR-friendly
 * behaviour (no flash of unstyled content) but hijacks the click.
 *
 * Usage :
 *   <BackButton fallbackHref="/marketplace" label="← Marketplace" />
 *
 * If the user landed on this page directly (no history), they'll go to
 * `fallbackHref`. If they came from another Versuz page, history.back()
 * fires.
 */
export function BackButton({ fallbackHref, label, className, style }) {
  const router = useRouter();

  function onClick(e) {
    // history.length > 1 covers "user navigated here from somewhere"
    // (the initial entry counts as 1, any subsequent push = 2+).
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
    // else: let the Link follow fallbackHref normally.
  }

  return (
    <Link href={fallbackHref} onClick={onClick} className={className} style={style}>
      {label}
    </Link>
  );
}
