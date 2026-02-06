import { db } from "@/lib/db";
import { RouteBrowser } from "@/components/routes/RouteBrowser";

export const metadata = { title: "Routes" };

export default async function RoutesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routes: any[] = [];
  try {
    routes = await db.route.findMany({
      where: { isActive: true },
      include: {
        originAirport: { select: { code: true, city: true } },
        destinationAirport: { select: { code: true, city: true, country: true, region: true } },
      },
      orderBy: { destinationAirport: { city: "asc" } },
    });
  } catch {
    routes = [];
  }

  const serialized = routes.map((r) => ({
    id: r.id,
    origin: r.originAirport.code,
    originCity: r.originAirport.city,
    destination: r.destinationAirport.code,
    destinationCity: r.destinationAirport.city,
    destinationCountry: r.destinationAirport.country,
    region: r.destinationAirport.region,
  }));

  return <RouteBrowser routes={serialized} />;
}
