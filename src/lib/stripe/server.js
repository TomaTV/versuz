import "server-only";
import Stripe from "stripe";

let _stripe = null;

/**
 * Lazy Stripe singleton. Throws if STRIPE_SECRET_KEY is missing — callers
 * should guard with `isStripeConfigured()` for graceful fallback in V0.
 */
export function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("[stripe] STRIPE_SECRET_KEY missing in env");
  _stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
  return _stripe;
}

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Versuz commission, in basis points. Default 30% = 3000 bps.
 * Override with STRIPE_PLATFORM_FEE_BPS=2500 for a 25% take.
 */
export const PLATFORM_FEE_BPS = parseInt(
  process.env.STRIPE_PLATFORM_FEE_BPS || "3000",
  10
);

export function platformFeeCents(priceUsd) {
  const cents = Math.round(Number(priceUsd) * 100);
  return Math.round((cents * PLATFORM_FEE_BPS) / 10000);
}

export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  // Normalize: strip trailing slash, prepend protocol if user forgot.
  let normalized = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  // Validate.
  try {
    new URL(normalized);
  } catch {
    throw new Error(
      `[stripe] siteUrl invalid: ${JSON.stringify(raw)}. Set NEXT_PUBLIC_SITE_URL to a full URL like "http://localhost:3000" or "https://versuz.dev".`
    );
  }
  return normalized;
}
