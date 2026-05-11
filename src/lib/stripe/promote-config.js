/**
 * Pricing for the boost. Single tier for V1 — flat $4.99 buys 30 days
 * of "promoted" placement. Override via env so we can A/B later.
 *
 *   PROMOTE_PRICE_USD=9.99 PROMOTE_DAYS=90
 *
 * Versuz keeps 100% of the promote fee. No Stripe Connect destination_charge —
 * this is a platform-side ad placement, not a creator transaction.
 */
export const PROMOTE_PRICE_USD = Number(process.env.PROMOTE_PRICE_USD || "4.99");
export const PROMOTE_DAYS = parseInt(process.env.PROMOTE_DAYS || "30", 10);

/**
 * Max active boost window per item. Stacks beyond this are refused at
 * checkout and clamped at webhook insert if Stripe still slips one through.
 * 365 days = "buy a year of placement" upper bound.
 */
export const PROMOTE_MAX_ACTIVE_DAYS = parseInt(
  process.env.PROMOTE_MAX_ACTIVE_DAYS || "365",
  10
);

/**
 * Rate limit per item per buyer — prevents double-click panic from buying
 * 60 days at once. Server side check on createPromoteCheckoutAction.
 */
export const PROMOTE_RATE_LIMIT_HOURS = parseInt(
  process.env.PROMOTE_RATE_LIMIT_HOURS || "24",
  10
);

/**
 * How many boosted items get the top-of-grid pinned slot in /marketplace.
 * Items #N+1 keep their BOOSTED pill but fall back to normal sort. Avoids
 * making the marketplace home a 50-row ad farm.
 */
export const PROMOTE_VISIBLE_SLOTS = parseInt(
  process.env.PROMOTE_VISIBLE_SLOTS || "6",
  10
);
