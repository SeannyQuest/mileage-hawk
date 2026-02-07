import { NextResponse } from "next/server";
import { aggregateDailyPrices } from "@/lib/services/price-aggregator";
import { revalidatePriceData } from "@/lib/cache";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await aggregateDailyPrices();

    // Invalidate all price-related caches so next request fetches fresh data
    revalidatePriceData();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Cron] Aggregate prices failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
