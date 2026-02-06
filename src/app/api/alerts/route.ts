import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CreateAlertSchema } from "@/lib/validators/alert";
import { getCurrentUserId } from "@/lib/auth";
import { rateLimit, getRateLimitKey, API_RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await db.userAlert.findMany({
      where: { userId },
      include: {
        route: {
          include: {
            originAirport: {
              select: { code: true, city: true },
            },
            destinationAirport: {
              select: { code: true, city: true },
            },
          },
        },
        airline: {
          select: { name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: alerts.map((a) => ({
        id: a.id,
        routeId: a.routeId,
        originCode: a.route.originAirport.code,
        originCity: a.route.originAirport.city,
        destinationCode: a.route.destinationAirport.code,
        destinationCity: a.route.destinationAirport.city,
        cabinClass: a.cabinClass,
        airlineId: a.airlineId,
        airlineName: a.airline?.name ?? null,
        thresholdPoints: a.thresholdPoints,
        alertChannels: a.alertChannels,
        isActive: a.isActive,
        lastTriggeredAt: a.lastTriggeredAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[API] Alerts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit alert creation
    const rlKey = getRateLimitKey(request, "alert-create");
    const rl = rateLimit(rlKey, API_RATE_LIMITS.alertCreate);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests", message: "Rate limit exceeded for alert creation" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { routeId, cabinClass, airlineId, thresholdPoints, alertChannels } = parsed.data;

    // Verify route exists
    const route = await db.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Verify airline exists if specified
    if (airlineId) {
      const airline = await db.airline.findUnique({ where: { id: airlineId } });
      if (!airline) {
        return NextResponse.json({ error: "Airline not found" }, { status: 404 });
      }
    }

    const alert = await db.userAlert.create({
      data: {
        userId,
        routeId,
        cabinClass,
        airlineId: airlineId ?? null,
        thresholdPoints,
        alertChannels,
      },
    });

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (error) {
    console.error("[API] Alerts POST error:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
