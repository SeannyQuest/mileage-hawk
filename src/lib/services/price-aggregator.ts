// ==========================================
// Price Aggregation Service
// Computes daily min/avg/max per route-airline-cabin
// ==========================================

import { db } from "../db";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

/**
 * Aggregate today's prices into PriceHistory records.
 * Called by /api/cron/aggregate-prices after scraping completes.
 */
export async function aggregateDailyPrices(): Promise<{
  aggregated: number;
  errors: string[];
}> {
  const result = { aggregated: 0, errors: [] as string[] };
  const today = new Date();
  const todayDate = format(today, "yyyy-MM-dd");

  console.log(`[Aggregate] Starting aggregation for ${todayDate}`);

  try {
    // Get all unique route-airline-cabin combinations that have prices scraped today
    const combinations = await db.dailyMileagePrice.groupBy({
      by: ["routeId", "airlineId", "cabinClass"],
      where: {
        scrapedAt: {
          gte: startOfDay(today),
          lt: endOfDay(today),
        },
      },
      _min: { amexPointsEquivalent: true },
      _avg: { amexPointsEquivalent: true },
      _max: { amexPointsEquivalent: true },
      _count: { id: true },
    });

    console.log(`[Aggregate] Found ${combinations.length} route-airline-cabin combinations`);

    for (const combo of combinations) {
      try {
        await db.priceHistory.upsert({
          where: {
            routeId_airlineId_cabinClass_date: {
              routeId: combo.routeId,
              airlineId: combo.airlineId,
              cabinClass: combo.cabinClass,
              date: new Date(todayDate),
            },
          },
          update: {
            minPrice: combo._min.amexPointsEquivalent ?? 0,
            avgPrice: Math.round(combo._avg.amexPointsEquivalent ?? 0),
            maxPrice: combo._max.amexPointsEquivalent ?? 0,
            sampleSize: combo._count.id,
          },
          create: {
            routeId: combo.routeId,
            airlineId: combo.airlineId,
            cabinClass: combo.cabinClass,
            date: new Date(todayDate),
            minPrice: combo._min.amexPointsEquivalent ?? 0,
            avgPrice: Math.round(combo._avg.amexPointsEquivalent ?? 0),
            maxPrice: combo._max.amexPointsEquivalent ?? 0,
            sampleSize: combo._count.id,
          },
        });

        result.aggregated++;
      } catch (error) {
        const msg = `Failed to aggregate ${combo.routeId}/${combo.airlineId}/${combo.cabinClass}: ${error}`;
        result.errors.push(msg);
      }
    }

    console.log(`[Aggregate] Complete: ${result.aggregated} records aggregated`);
    return result;
  } catch (error) {
    console.error("[Aggregate] Fatal error:", error);
    throw error;
  }
}

/**
 * Get the 30-day average price for a route-airline-cabin combination.
 * Used for deal scoring.
 */
export async function getThirtyDayAverage(
  routeId: string,
  airlineId: string,
  cabinClass: string
): Promise<number | null> {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const result = await db.priceHistory.aggregate({
    where: {
      routeId,
      airlineId,
      cabinClass: cabinClass as "ECONOMY_PLUS" | "BUSINESS" | "FIRST",
      date: { gte: thirtyDaysAgo },
    },
    _avg: { avgPrice: true },
  });

  return result._avg.avgPrice ? Math.round(result._avg.avgPrice) : null;
}

/**
 * Get price history for charting.
 */
export async function getPriceHistory(params: {
  routeId: string;
  airlineId?: string;
  cabinClass?: string;
  days: number;
}): Promise<
  {
    date: string;
    minPrice: number;
    avgPrice: number;
    maxPrice: number;
    airlineId: string;
    cabinClass: string;
  }[]
> {
  const startDate = subDays(new Date(), params.days);

  const history = await db.priceHistory.findMany({
    where: {
      routeId: params.routeId,
      ...(params.airlineId && { airlineId: params.airlineId }),
      ...(params.cabinClass && {
        cabinClass: params.cabinClass as "ECONOMY_PLUS" | "BUSINESS" | "FIRST",
      }),
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
  });

  return history.map((h) => ({
    date: format(h.date, "yyyy-MM-dd"),
    minPrice: h.minPrice,
    avgPrice: h.avgPrice,
    maxPrice: h.maxPrice,
    airlineId: h.airlineId,
    cabinClass: h.cabinClass,
  }));
}
