import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unstable_cache, CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache";

async function fetchRoutePricesData(id: string) {
  // Verify route exists
  const route = await db.route.findUnique({
    where: { id },
    include: {
      originAirport: true,
      destinationAirport: true,
    },
  });

  if (!route) {
    return null;
  }

  // Get the latest prices for this route across all airlines and cabins
  // Group by airline + cabin, taking the lowest price per group
  const prices = await db.dailyMileagePrice.findMany({
    where: { routeId: id },
    orderBy: [{ cabinClass: "asc" }, { amexPointsEquivalent: "asc" }],
    include: {
      airline: {
        select: {
          id: true,
          name: true,
          code: true,
          loyaltyProgram: true,
          loyaltyCurrency: true,
          amexTransferRatio: true,
          logoUrl: true,
        },
      },
    },
    distinct: ["airlineId", "cabinClass"],
  });

  return {
    route: {
      id: route.id,
      origin: route.originAirport.code,
      originCity: route.originAirport.city,
      destination: route.destinationAirport.code,
      destinationCity: route.destinationAirport.city,
      region: route.destinationAirport.region,
    },
    prices: prices.map((p) => ({
      id: p.id,
      airline: p.airline,
      cabinClass: p.cabinClass,
      mileageCost: p.mileageCost,
      amexPointsEquivalent: p.amexPointsEquivalent,
      cashCopay: p.cashCopay,
      availabilityCount: p.availabilityCount,
      isDirect: p.isDirect,
      travelDate: p.travelDate,
      scrapedAt: p.scrapedAt,
      bookingUrl: p.bookingUrl,
    })),
  };
}

const getCachedRoutePrices = unstable_cache(
  fetchRoutePricesData,
  ["api-route-prices"],
  { revalidate: CACHE_DURATIONS.PRICES, tags: [CACHE_TAGS.PRICES] }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getCachedRoutePrices(id);

    if (!data) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[API] Route prices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch route prices" },
      { status: 500 }
    );
  }
}
