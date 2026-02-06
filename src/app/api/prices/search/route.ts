import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PriceSearchSchema } from "@/lib/validators/search";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = PriceSearchSchema.safeParse(Object.fromEntries(searchParams));

    if (!params.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: params.error.flatten() },
        { status: 400 }
      );
    }

    const {
      origin,
      destination,
      region,
      cabinClass,
      airline,
      dateFrom,
      dateTo,
      maxPoints,
      directOnly,
      sort,
      order,
      limit,
      offset,
    } = params.data;

    // Build where clause
    const where: Prisma.DailyMileagePriceWhereInput = {};

    if (cabinClass) where.cabinClass = cabinClass;
    if (maxPoints) where.amexPointsEquivalent = { lte: maxPoints };
    if (directOnly) where.isDirect = true;
    if (airline) where.airline = { code: airline };

    if (origin || destination || region) {
      const routeWhere: Prisma.RouteWhereInput = {};
      if (origin) routeWhere.originAirport = { code: origin };

      const destFilter: Prisma.AirportWhereInput = {};
      if (destination) destFilter.code = destination;
      if (region) destFilter.region = region;
      if (destination || region) routeWhere.destinationAirport = destFilter;

      where.route = routeWhere;
    }

    if (dateFrom || dateTo) {
      where.travelDate = {};
      if (dateFrom) where.travelDate.gte = new Date(dateFrom);
      if (dateTo) where.travelDate.lte = new Date(dateTo);
    }

    // Build orderBy
    type OrderByType = Prisma.DailyMileagePriceOrderByWithRelationInput;
    let orderBy: OrderByType;
    switch (sort) {
      case "price":
        orderBy = { amexPointsEquivalent: order };
        break;
      case "date":
        orderBy = { travelDate: order };
        break;
      case "airline":
        orderBy = { airline: { name: order } };
        break;
      default:
        orderBy = { amexPointsEquivalent: "asc" };
    }

    const [prices, total] = await Promise.all([
      db.dailyMileagePrice.findMany({
        where,
        orderBy,
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
              loyaltyCurrency: true,
              amexTransferRatio: true,
              logoUrl: true,
            },
          },
        },
      }),
      db.dailyMileagePrice.count({ where }),
    ]);

    return NextResponse.json({
      data: prices.map((p) => ({
        id: p.id,
        origin: p.route.originAirport.code,
        originCity: p.route.originAirport.city,
        destination: p.route.destinationAirport.code,
        destinationCity: p.route.destinationAirport.city,
        region: p.route.destinationAirport.region,
        cabinClass: p.cabinClass,
        airline: p.airline,
        mileageCost: p.mileageCost,
        amexPointsEquivalent: p.amexPointsEquivalent,
        cashCopay: p.cashCopay,
        availabilityCount: p.availabilityCount,
        isDirect: p.isDirect,
        travelDate: p.travelDate,
        bookingUrl: p.bookingUrl,
      })),
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[API] Price search error:", error);
    return NextResponse.json(
      { error: "Failed to search prices" },
      { status: 500 }
    );
  }
}
