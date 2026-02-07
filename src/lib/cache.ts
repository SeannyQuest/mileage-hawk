import { unstable_cache, revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// Cache duration constants (seconds)
// ---------------------------------------------------------------------------

export const CACHE_DURATIONS = {
  /** Routes and price listings — 5 minutes */
  PRICES: 300,
  /** Airlines list — 1 hour (data rarely changes) */
  AIRLINES: 3600,
  /** Price history aggregates — 10 minutes */
  HISTORY: 600,
} as const;

// ---------------------------------------------------------------------------
// Cache tag constants for targeted invalidation
// ---------------------------------------------------------------------------

export const CACHE_TAGS = {
  ROUTES: "routes",
  PRICES: "prices",
  DEALS: "deals",
  AIRLINES: "airlines",
  PRICE_HISTORY: "price-history",
} as const;

// ---------------------------------------------------------------------------
// Revalidation helpers — call after data mutations
// ---------------------------------------------------------------------------

/**
 * Invalidate all price-related caches.
 * Call after a scrape or price aggregation completes.
 */
export function revalidatePriceData() {
  revalidateTag(CACHE_TAGS.PRICES, "max");
  revalidateTag(CACHE_TAGS.DEALS, "max");
  revalidateTag(CACHE_TAGS.ROUTES, "max");
  revalidateTag(CACHE_TAGS.PRICE_HISTORY, "max");
}

/**
 * Invalidate airline cache.
 * Call after airline data changes.
 */
export function revalidateAirlineData() {
  revalidateTag(CACHE_TAGS.AIRLINES, "max");
}

// Re-export for convenience
export { unstable_cache, revalidateTag };
