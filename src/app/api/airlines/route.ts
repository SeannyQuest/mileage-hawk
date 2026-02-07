import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unstable_cache, CACHE_DURATIONS, CACHE_TAGS } from "@/lib/cache";

async function fetchAirlinesData() {
  return db.airline.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      loyaltyProgram: true,
      loyaltyCurrency: true,
      amexTransferRatio: true,
      alliance: true,
      minimumTransfer: true,
      hasTransferFee: true,
      transferFeeDetail: true,
      logoUrl: true,
      seatsAeroCode: true,
    },
  });
}

const getCachedAirlines = unstable_cache(
  fetchAirlinesData,
  ["api-airlines"],
  { revalidate: CACHE_DURATIONS.AIRLINES, tags: [CACHE_TAGS.AIRLINES] }
);

export async function GET() {
  try {
    const airlines = await getCachedAirlines();
    return NextResponse.json({ data: airlines });
  } catch (error) {
    console.error("[API] Airlines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch airlines" },
      { status: 500 }
    );
  }
}
