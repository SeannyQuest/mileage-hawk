import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PriceHistorySchema } from "@/lib/validators/search";
import { getPriceHistory } from "@/lib/services/price-aggregator";

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

    // Verify route exists
    const route = await db.route.findUnique({ where: { id } });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const history = await getPriceHistory({
      routeId: id,
      airlineId: queryParams.data.airline,
      cabinClass: queryParams.data.cabinClass,
      days: queryParams.data.days,
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    console.error("[API] Route history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
