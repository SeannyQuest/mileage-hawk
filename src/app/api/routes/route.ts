import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RouteFilterSchema } from "@/lib/validators/search";

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

    const routes = await db.route.findMany({
      where: {
        isActive: true,
        ...(origin && {
          originAirport: { code: origin },
        }),
        ...(region && {
          destinationAirport: { region },
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

    // For each route, get the current best price (optionally filtered by cabin)
    const routesWithPrices = await Promise.all(
      routes.map(async (route) => {
        const bestPrice = await db.dailyMileagePrice.findFirst({
          where: {
            routeId: route.id,
            ...(cabinClass && { cabinClass }),
          },
          orderBy: { amexPointsEquivalent: "asc" },
          include: {
            airline: {
              select: { name: true, code: true },
            },
          },
        });

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
      })
    );

    return NextResponse.json({ data: routesWithPrices });
  } catch (error) {
    console.error("[API] Routes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch routes" },
      { status: 500 }
    );
  }
}
