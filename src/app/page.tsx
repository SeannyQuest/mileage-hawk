import { db } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { AIRLINES } from "@/lib/constants";

export default async function DashboardPage() {
  // Fetch dashboard data server-side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stats: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentDeals: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routes: any[] = [];

  try {
    const [routeCount, airlineCount, latestScrape, alertCount] = await Promise.all([
      db.route.count({ where: { isActive: true } }),
      db.airline.count({ where: { isActive: true } }),
      db.scrapeLog.findFirst({ orderBy: { startedAt: "desc" } }),
      db.userAlert.count({ where: { isActive: true } }),
    ]);

    stats = {
      totalRoutes: routeCount,
      totalAirlines: airlineCount,
      totalAlerts: alertCount,
      lastScrapedAt: latestScrape?.startedAt?.toISOString() ?? null,
      scrapeStatus: latestScrape?.status ?? null,
    };

    // Get recent best prices
    recentDeals = await db.dailyMileagePrice.findMany({
      orderBy: { amexPointsEquivalent: "asc" },
      take: 12,
      include: {
        route: {
          include: {
            originAirport: { select: { code: true, city: true } },
            destinationAirport: { select: { code: true, city: true, region: true } },
          },
        },
        airline: { select: { name: true, code: true, loyaltyProgram: true, logoUrl: true } },
      },
    });

    // Get routes for QuickSearch
    const rawRoutes = await db.route.findMany({
      where: { isActive: true },
      include: {
        originAirport: { select: { code: true, city: true } },
        destinationAirport: { select: { code: true, city: true, region: true } },
      },
      orderBy: { destinationAirport: { city: "asc" } },
    });

    routes = rawRoutes.map((r) => ({
      id: r.id,
      slug: `${r.originAirport.code.toLowerCase()}-${r.destinationAirport.code.toLowerCase()}`,
      origin: r.originAirport.code,
      originCity: r.originAirport.city,
      destination: r.destinationAirport.code,
      destinationCity: r.destinationAirport.city,
      region: r.destinationAirport.region,
    }));
  } catch {
    // Database may not be set up yet
    stats = null;
    recentDeals = [];
    routes = [];
  }

  return (
    <DashboardClient
      stats={stats}
      recentDeals={recentDeals}
      airlines={AIRLINES}
      routes={routes}
    />
  );
}
