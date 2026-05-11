"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mount on a server-rendered admin page to refresh its server-side data on
 * a fixed interval without a full page reload. Cheap : router.refresh() only
 * re-fetches the RSC payload, no flash, no scroll reset.
 */
export function AutoRefresh({ intervalMs = 15000 }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
