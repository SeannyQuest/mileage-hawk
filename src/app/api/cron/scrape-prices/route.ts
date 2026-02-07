import { NextResponse } from "next/server";
import { runDailyScrape } from "@/lib/services/price-scraper";
import { revalidatePriceData } from "@/lib/cache";

export const maxDuration = 300; // 5 minutes max for Vercel

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyScrape();

    // Invalidate all price-related caches so next request fetches fresh data
    revalidatePriceData();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Cron] Scrape prices failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
