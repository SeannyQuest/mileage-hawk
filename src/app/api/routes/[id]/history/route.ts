import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PriceHistorySchema } from "@/lib/validators/search";
import { getPriceHistory } from "@/lib/services/price-aggregator";
import { unstable_cache, CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache";

async function fetchPriceHistoryData(
  id: string,
  airline?: string,
  cabinClass?: string,
  days: number = 30
) {
  // Verify route exists
  const route = await db.route.findUnique({ where: { id } });
  if (!route) {
    return null;
  }

  return getPriceHistory({
    routeId: id,
    airlineId: airline,
    cabinClass,
    days,
  });
}

const getCachedPriceHistory = unstable_cache(
  fetchPriceHistoryData,
  ["api-price-history"],
  { revalidate: CACHE_DURATIONS.HISTORY, tags: [CACHE_TAGS.PRICE_HISTORY] }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const queryParams = PriceHistorySchema.safeParse(Object.fromEntries(searchParams));

    if (!queryParams.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: queryParams.error.flatten() },
        { status: 400 }
      );
    }

    const data = await getCachedPriceHistory(
      id,
      queryParams.data.airline,
      queryParams.data.cabinClass,
      queryParams.data.days
    );

    if (data === null) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[API] Route history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
