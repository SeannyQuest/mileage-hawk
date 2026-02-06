import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BestDealsSchema } from "@/lib/validators/search";
import { calculateDealScoreFromThresholds } from "@/lib/services/deal-scorer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = BestDealsSchema.safeParse(Object.fromEntries(searchParams));

    if (!params.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: params.error.flatten() },
        { status: 400 }
      );
    }

    const { region, cabinClass, limit, offset } = params.data;

    // Get recent prices with route and airline data
    const prices = await db.dailyMileagePrice.findMany({
      where: {
        ...(cabinClass && { cabinClass }),
        ...(region && {
          route: {
            destinationAirport: { region },
          },
        }),
      },
      orderBy: { amexPointsEquivalent: "asc" },
      take: limit,
      skip: offset,
      include: {
        route: {
          include: {
            originAirport: {
              select: { code: true, city: true },
            },
            destinationAirport: {
              select: { code: true, city: true, region: true },
            },
          },
        },
        airline: {
          select: {
            name: true,
            code: true,
            loyaltyProgram: true,
            logoUrl: true,
          },
        },
      },
    });

    // Score each deal
    const deals = prices.map((price) => {
      const destRegion = price.route.destinationAirport.region;
      const score = calculateDealScoreFromThresholds(
        price.amexPointsEquivalent,
        price.cabinClass,
        destRegion
      );

      return {
        id: price.id,
        origin: price.route.originAirport.code,
        originCity: price.route.originAirport.city,
        destination: price.route.destinationAirport.code,
        destinationCity: price.route.destinationAirport.city,
        region: destRegion,
        cabinClass: price.cabinClass,
        airline: price.airline,
        mileageCost: price.mileageCost,
        amexPointsEquivalent: price.amexPointsEquivalent,
        cashCopay: price.cashCopay,
        isDirect: price.isDirect,
        travelDate: price.travelDate,
        bookingUrl: price.bookingUrl,
        dealScore: score.score,
        dealTier: score.tier,
        savingsPercent: score.savingsPercent,
        thirtyDayAvg: score.thirtyDayAvg,
      };
    });

    // Sort by deal score (best deals first)
    deals.sort((a, b) => b.dealScore - a.dealScore);

    return NextResponse.json({ data: deals });
  } catch (error) {
    console.error("[API] Best deals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch best deals" },
      { status: 500 }
    );
  }
}
