import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Check database connectivity
    const airlineCount = await db.airline.count();
    const routeCount = await db.route.count();

    // Get latest scrape info
    const latestScrape = await db.scrapeLog.findFirst({
      orderBy: { startedAt: "desc" },
    });

    // Get latest price timestamp
    const latestPrice = await db.dailyMileagePrice.findFirst({
      orderBy: { scrapedAt: "desc" },
      select: { scrapedAt: true },
    });

    const now = new Date();
    const dataAgeHours = latestPrice
      ? (now.getTime() - latestPrice.scrapedAt.getTime()) / (1000 * 60 * 60)
      : null;

    return NextResponse.json({
      status: "healthy",
      database: {
        connected: true,
        airlines: airlineCount,
        routes: routeCount,
      },
      scraping: {
        lastRun: latestScrape?.startedAt ?? null,
        lastStatus: latestScrape?.status ?? null,
        pricesFound: latestScrape?.pricesFound ?? 0,
      },
      dataFreshness: {
        lastPriceAt: latestPrice?.scrapedAt ?? null,
        ageHours: dataAgeHours ? Math.round(dataAgeHours * 10) / 10 : null,
        isStale: dataAgeHours ? dataAgeHours > 24 : true,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
