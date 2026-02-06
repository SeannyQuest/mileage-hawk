import { Suspense } from "react";
import { db } from "@/lib/db";
import { AlertWizard } from "@/components/alerts/AlertWizard";
import { DEFAULT_THRESHOLDS } from "@/lib/constants";
import { LoadingState } from "@/components/shared/LoadingState";

export const metadata = { title: "Create Alert" };

export default async function NewAlertPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routes: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let airlines: any[] = [];

  try {
    routes = await db.route.findMany({
      where: { isActive: true },
      include: {
        originAirport: { select: { code: true, city: true } },
        destinationAirport: { select: { code: true, city: true, region: true } },
      },
      orderBy: { destinationAirport: { city: "asc" } },
    });

    airlines = await db.airline.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  } catch {
    // DB not connected
  }

  const serializedRoutes = routes.map((r: {
    id: string;
    originAirport: { code: string; city: string };
    destinationAirport: { code: string; city: string; region: string };
  }) => ({
    id: r.id,
    origin: r.originAirport.code,
    originCity: r.originAirport.city,
    destination: r.destinationAirport.code,
    destinationCity: r.destinationAirport.city,
    region: r.destinationAirport.region,
    label: `${r.originAirport.code} → ${r.destinationAirport.code} (${r.originAirport.city} to ${r.destinationAirport.city})`,
  }));

  return (
    <Suspense fallback={<LoadingState variant="cards" count={1} />}>
      <AlertWizard
        routes={serializedRoutes}
        airlines={airlines}
        thresholds={DEFAULT_THRESHOLDS}
      />
    </Suspense>
  );
}
