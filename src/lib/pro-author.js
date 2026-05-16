/**
 * Pro Author tier — feature detection + helpers.
 *
 * The tier is env-gated. Until you create a Stripe Product + Price for
 * "Versuz Pro Author $9/mo" and set STRIPE_PRO_AUTHOR_PRICE_ID, the
 * /pricing page keeps showing the waitlist form. As soon as the env var
 * is set, the same card flips to a "Subscribe →" CTA that opens a
 * Stripe Checkout Session in subscription mode.
 *
 * Why this gate : recurring revenue infra is real ops work (Stripe
 * Product, tax config, webhook event subscription, Customer Portal
 * setup). We ship the code first so the moment you decide to go live,
 * the only steps are :
 *   1. Create the Product + Price in Stripe Dashboard
 *   2. Add STRIPE_PRO_AUTHOR_PRICE_ID=price_xxx to .env.local + Vercel
 *   3. Subscribe customer.subscription.* events in your webhook endpoint
 */

import "server-only";

export function isProAuthorAvailable() {
  return Boolean(process.env.STRIPE_PRO_AUTHOR_PRICE_ID);
}

export function getProAuthorPriceId() {
  return process.env.STRIPE_PRO_AUTHOR_PRICE_ID || null;
}

/**
 * Apply (or not) the first-50-signups promo. The waitlist landing copy
 * promises 3 months at $4.50 (50% off) for the first 50. We can wire a
 * Stripe Coupon for this when it ships ; the env var
 * STRIPE_PRO_AUTHOR_INTRO_COUPON should be the coupon id (or unset to
 * skip the promo).
 */
export function getProAuthorIntroCoupon() {
  return process.env.STRIPE_PRO_AUTHOR_INTRO_COUPON || null;
}
