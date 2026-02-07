import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { RouteDetail } from "@/components/routes/RouteDetail";

interface RouteDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RouteDetailPageProps) {
  const { slug } = await params;
  const [origin, dest] = slug.toUpperCase().split("-");
  return { title: `${origin} → ${dest}` };
}

export default async function RouteDetailPage({ params }: RouteDetailPageProps) {
  const { slug } = await params;
  const parts = slug.toUpperCase().split("-");
  if (parts.length !== 2) notFound();

  const [originCode, destCode] = parts;

  // Find the route
  const route = await db.route.findFirst({
    where: {
      originAirport: { code: originCode },
      destinationAirport: { code: destCode },
      isActive: true,
    },
    include: {
      originAirport: true,
      destinationAirport: true,
    },
  });

  if (!route) notFound();

  // Get all current prices for this route
  const prices = await db.dailyMileagePrice.findMany({
    where: { routeId: route.id },
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

  // Get price history for charting
  const history = await db.priceHistory.findMany({
    where: {
      routeId: route.id,
      date: { gte: new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { date: "asc" },
    include: {
      airline: { select: { name: true, code: true } },
    },
  });

  // Serialize dates for client
  const serializedPrices = prices.map((p) => ({
    id: p.id,
    airline: p.airline,
    cabinClass: p.cabinClass,
    mileageCost: p.mileageCost,
    amexPointsEquivalent: p.amexPointsEquivalent,
    capitalOnePointsEquivalent: p.capitalOnePointsEquivalent,
    cashCopay: p.cashCopay,
    availabilityCount: p.availabilityCount,
    isDirect: p.isDirect,
    travelDate: p.travelDate.toISOString(),
    scrapedAt: p.scrapedAt.toISOString(),
    bookingUrl: p.bookingUrl,
  }));

  const serializedHistory = history.map((h) => ({
    date: h.date.toISOString().split("T")[0],
    minPrice: h.minPrice,
    avgPrice: h.avgPrice,
    maxPrice: h.maxPrice,
    cabinClass: h.cabinClass,
    airlineCode: h.airline.code,
    airlineName: h.airline.name,
  }));

  return (
    <RouteDetail
      route={{
        id: route.id,
        origin: route.originAirport.code,
        originCity: route.originAirport.city,
        originCountry: route.originAirport.country,
        destination: route.destinationAirport.code,
        destinationCity: route.destinationAirport.city,
        destinationCountry: route.destinationAirport.country,
        region: route.destinationAirport.region,
      }}
      prices={serializedPrices}
      history={serializedHistory}
    />
  );
}
