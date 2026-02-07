import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RouteFilterSchema } from "@/lib/validators/search";
import { unstable_cache, CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache";
import type { CabinClass, Region } from "@prisma/client";

async function fetchRoutesData(
  origin?: string,
  region?: string,
  cabinClass?: string
) {
  const routes = await db.route.findMany({
    where: {
      isActive: true,
      ...(origin && {
        originAirport: { code: origin },
      }),
      ...(region && {
        destinationAirport: { region: region as Region },
      }),
    },
    include: {
      originAirport: {
        select: { code: true, city: true, country: true },
      },
      destinationAirport: {
        select: { code: true, city: true, country: true, region: true },
      },
    },
    orderBy: {
      destinationAirport: { city: "asc" },
    },
  });

  // Batch-fetch best prices for all routes in a single query using Prisma raw
  // instead of N+1 individual findFirst calls per route.
  const routeIds = routes.map((r) => r.id);
  const bestPriceMap = new Map<string, {
    amexPointsEquivalent: number;
    mileageCost: number;
    cabinClass: string;
    travelDate: Date;
    airline: { name: string; code: string };
  }>();

  if (routeIds.length > 0) {
    // Get the lowest-priced entry per route via a single findMany with distinct
    const allBestPrices = await db.dailyMileagePrice.findMany({
      where: {
        routeId: { in: routeIds },
        ...(cabinClass && { cabinClass: cabinClass as CabinClass }),
      },
      orderBy: { amexPointsEquivalent: "asc" },
      include: {
        airline: {
          select: { name: true, code: true },
        },
      },
      distinct: ["routeId"],
    });

    for (const price of allBestPrices) {
      bestPriceMap.set(price.routeId, {
        amexPointsEquivalent: price.amexPointsEquivalent,
        mileageCost: price.mileageCost,
        cabinClass: price.cabinClass,
        travelDate: price.travelDate,
        airline: price.airline,
      });
    }
  }

  return routes.map((route) => {
    const bestPrice = bestPriceMap.get(route.id) ?? null;

    return {
      id: route.id,
      origin: route.originAirport.code,
      originCity: route.originAirport.city,
      destination: route.destinationAirport.code,
      destinationCity: route.destinationAirport.city,
      destinationCountry: route.destinationAirport.country,
      region: route.destinationAirport.region,
      bestPrice: bestPrice
        ? {
            amexPoints: bestPrice.amexPointsEquivalent,
            mileageCost: bestPrice.mileageCost,
            airline: bestPrice.airline.name,
            airlineCode: bestPrice.airline.code,
            cabinClass: bestPrice.cabinClass,
            travelDate: bestPrice.travelDate,
          }
        : null,
    };
  });
}

const getCachedRoutes = unstable_cache(
  fetchRoutesData,
  ["api-routes"],
  { revalidate: CACHE_DURATIONS.PRICES, tags: [CACHE_TAGS.ROUTES, CACHE_TAGS.PRICES] }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = RouteFilterSchema.safeParse(Object.fromEntries(searchParams));

    if (!params.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: params.error.flatten() },
        { status: 400 }
      );
    }

    const { origin, region, cabinClass } = params.data;
    const data = await getCachedRoutes(origin, region, cabinClass);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[API] Routes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch routes" },
      { status: 500 }
    );
  }
}
