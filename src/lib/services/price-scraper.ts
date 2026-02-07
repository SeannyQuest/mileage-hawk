// ==========================================
// Price Scraping Orchestrator
// Runs daily via cron to fetch prices from Seats.aero
// Uses the /availability bulk endpoint per source,
// then filters results for our monitored routes.
// ==========================================

import { db } from "../db";
import { getSeatsAeroClient, parseAvailability, getRouteCodes } from "./seats-aero";
import { SEATS_AERO_SOURCE_MAP } from "../constants";
import { calculateAmexPoints, calculateCapitalOnePoints } from "../amex-partners";

interface ScrapeResult {
  source: string;
  routesTotal: number;
  routesSuccess: number;
  routesFailed: number;
  pricesFound: number;
  duration: number;
  errors: string[];
}

/**
 * Main scraping function — called by /api/cron/scrape-prices
 * Fetches bulk availability from all Seats.aero sources and stores matching routes in DB.
 */
export async function runDailyScrape(): Promise<ScrapeResult> {
  const startTime = Date.now();
  const result: ScrapeResult = {
    source: "seats_aero",
    routesTotal: 0,
    routesSuccess: 0,
    routesFailed: 0,
    pricesFound: 0,
    duration: 0,
    errors: [],
  };

  // Create scrape log entry
  const scrapeLog = await db.scrapeLog.create({
    data: {
      source: "seats_aero",
      status: "RUNNING",
      routesTotal: 0,
      routesSuccess: 0,
      routesFailed: 0,
      pricesFound: 0,
      duration: 0,
      startedAt: new Date(),
    },
  });

  try {
    const client = getSeatsAeroClient();

    // Preload airline and route data from DB
    const airlines = await db.airline.findMany({
      where: { isActive: true, seatsAeroCode: { not: null } },
    });
    const airlineMap = new Map(airlines.map((a) => [a.seatsAeroCode!, a]));

    const routes = await db.route.findMany({
      where: { isActive: true },
      include: { originAirport: true, destinationAirport: true },
    });

    // Build a lookup: "AUS-LHR" -> Route
    const routeLookup = new Map<string, typeof routes[number]>();
    for (const route of routes) {
      const key = `${route.originAirport.code}-${route.destinationAirport.code}`;
      routeLookup.set(key, route);
    }

    // Also build a set of our origin and destination codes for fast filtering
    const originCodes = new Set(routes.map((r) => r.originAirport.code));
    const destCodes = new Set(routes.map((r) => r.destinationAirport.code));

    console.log(`[Scrape] Monitoring ${routeLookup.size} routes across ${originCodes.size} origins and ${destCodes.size} destinations`);

    // Process each Seats.aero source using the BULK /availability endpoint
    const sources = Object.keys(SEATS_AERO_SOURCE_MAP);
    result.routesTotal = sources.length;

    for (const source of sources) {
      try {
        console.log(`[Scrape] Processing source: ${source}`);
        const airline = airlineMap.get(source);
        if (!airline) {
          console.warn(`[Scrape] No airline found for source: ${source}`);
          result.routesFailed++;
          continue;
        }

        let cursor: number | undefined;
        let pageCount = 0;
        let sourceMatches = 0;

        do {
          const response = await client.getBulkAvailability({
            source,
            cursor: cursor ? String(cursor) : undefined,
          });

          // Filter and process results
          for (const avail of response.data) {
            const { origin, destination } = getRouteCodes(avail);

            // Quick filter: only process if both origin and destination are in our monitored set
            if (!originCodes.has(origin) || !destCodes.has(destination)) continue;

            const routeKey = `${origin}-${destination}`;
            const route = routeLookup.get(routeKey);
            if (!route) continue;

            // Parse cabin class availability
            const cabinPrices = parseAvailability(avail);

            for (const price of cabinPrices) {
              const amexPoints = calculateAmexPoints(
                price.mileageCost,
                airline.amexTransferRatio
              );
              const capitalOnePoints = calculateCapitalOnePoints(price.mileageCost, airline.capitalOneTransferRatio);

              // Upsert price (deduplicate by route+airline+cabin+date+source)
              await db.dailyMileagePrice.upsert({
                where: {
                  routeId_airlineId_cabinClass_travelDate_source: {
                    routeId: route.id,
                    airlineId: airline.id,
                    cabinClass: price.cabinClass,
                    travelDate: new Date(avail.Date),
                    source: "seats_aero",
                  },
                },
                update: {
                  mileageCost: price.mileageCost,
                  amexPointsEquivalent: amexPoints,
                  capitalOnePointsEquivalent: capitalOnePoints,
                  availabilityCount: price.remainingSeats,
                  isDirect: price.isDirect,
                  scrapedAt: new Date(),
                  sourceId: avail.ID,
                },
                create: {
                  routeId: route.id,
                  airlineId: airline.id,
                  cabinClass: price.cabinClass,
                  mileageCost: price.mileageCost,
                  amexPointsEquivalent: amexPoints,
                  capitalOnePointsEquivalent: capitalOnePoints,
                  availabilityCount: price.remainingSeats,
                  isDirect: price.isDirect,
                  travelDate: new Date(avail.Date),
                  source: "seats_aero",
                  sourceId: avail.ID,
                },
              });

              result.pricesFound++;
              sourceMatches++;
            }
          }

          cursor = response.hasMore ? response.cursor : undefined;
          pageCount++;

          // Safety: max 20 pages per source (500 records each = 10K records max)
          if (pageCount >= 20) {
            console.log(`[Scrape] Hit page limit for ${source}, stopping pagination`);
            break;
          }
        } while (cursor);

        result.routesSuccess++;
        console.log(`[Scrape] Completed ${source}: ${sourceMatches} prices across ${pageCount} pages`);

        // Rate limit: brief pause between sources
        await sleep(500);
      } catch (sourceError) {
        result.routesFailed++;
        const msg = `Failed source ${source}: ${sourceError instanceof Error ? sourceError.message : String(sourceError)}`;
        console.error(`[Scrape] ${msg}`);
        result.errors.push(msg);
      }
    }

    result.duration = Date.now() - startTime;

    // Update scrape log
    await db.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: result.routesFailed === 0 ? "COMPLETED" : "PARTIAL",
        routesTotal: result.routesTotal,
        routesSuccess: result.routesSuccess,
        routesFailed: result.routesFailed,
        pricesFound: result.pricesFound,
        duration: result.duration,
        errorMessage: result.errors.length > 0 ? result.errors.join("; ") : null,
        completedAt: new Date(),
      },
    });

    console.log(
      `[Scrape] Complete: ${result.pricesFound} prices, ${result.routesSuccess}/${result.routesTotal} sources, ${result.duration}ms`
    );

    return result;
  } catch (error) {
    result.duration = Date.now() - startTime;

    await db.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: "FAILED",
        duration: result.duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
