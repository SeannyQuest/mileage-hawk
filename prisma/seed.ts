import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { AIRLINES, AIRPORTS, ORIGIN_CODES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ==========================================
  // Seed Airlines
  // ==========================================
  console.log("Seeding airlines...");
  const airlineRecords: Record<string, string> = {};

  for (const airline of AIRLINES) {
    const record = await prisma.airline.upsert({
      where: { code: airline.code },
      update: {
        name: airline.name,
        loyaltyProgram: airline.loyaltyProgram,
        loyaltyCurrency: airline.loyaltyCurrency,
        amexTransferRatio: airline.amexTransferRatio,
        capitalOneTransferRatio: airline.capitalOneTransferRatio,
        alliance: airline.alliance,
        minimumTransfer: airline.minimumTransfer,
        hasTransferFee: airline.hasTransferFee,
        transferFeeDetail: airline.transferFeeDetail,
        logoUrl: airline.logoUrl,
        seatsAeroCode: airline.seatsAeroCode,
      },
      create: {
        name: airline.name,
        code: airline.code,
        loyaltyProgram: airline.loyaltyProgram,
        loyaltyCurrency: airline.loyaltyCurrency,
        amexTransferRatio: airline.amexTransferRatio,
        capitalOneTransferRatio: airline.capitalOneTransferRatio,
        alliance: airline.alliance,
        minimumTransfer: airline.minimumTransfer,
        hasTransferFee: airline.hasTransferFee,
        transferFeeDetail: airline.transferFeeDetail,
        logoUrl: airline.logoUrl,
        seatsAeroCode: airline.seatsAeroCode,
      },
    });
    airlineRecords[airline.code] = record.id;
  }
  console.log(`  Seeded ${Object.keys(airlineRecords).length} airlines`);

  // ==========================================
  // Seed Airports
  // ==========================================
  console.log("Seeding airports...");
  const airportRecords: Record<string, string> = {};

  for (const airport of AIRPORTS) {
    const record = await prisma.airport.upsert({
      where: { code: airport.code },
      update: {
        name: airport.name,
        city: airport.city,
        country: airport.country,
        region: airport.region,
        latitude: airport.latitude,
        longitude: airport.longitude,
        isOrigin: airport.isOrigin,
      },
      create: {
        code: airport.code,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        region: airport.region,
        latitude: airport.latitude,
        longitude: airport.longitude,
        isOrigin: airport.isOrigin,
      },
    });
    airportRecords[airport.code] = record.id;
  }
  console.log(`  Seeded ${Object.keys(airportRecords).length} airports`);

  // ==========================================
  // Seed Routes (Origin x Destination)
  // ==========================================
  console.log("Seeding routes...");
  let routeCount = 0;

  const destinationCodes = AIRPORTS.filter((a) => !a.isOrigin).map((a) => a.code);

  for (const originCode of ORIGIN_CODES) {
    const originId = airportRecords[originCode];
    if (!originId) {
      console.warn(`  Origin airport ${originCode} not found, skipping`);
      continue;
    }

    for (const destCode of destinationCodes) {
      const destId = airportRecords[destCode];
      if (!destId) {
        console.warn(`  Destination airport ${destCode} not found, skipping`);
        continue;
      }

      await prisma.route.upsert({
        where: {
          originAirportId_destinationAirportId: {
            originAirportId: originId,
            destinationAirportId: destId,
          },
        },
        update: {},
        create: {
          originAirportId: originId,
          destinationAirportId: destId,
          isActive: true,
        },
      });
      routeCount++;
    }
  }
  console.log(`  Seeded ${routeCount} routes`);

  // ==========================================
  // Summary
  // ==========================================
  const totalAirlines = await prisma.airline.count();
  const totalAirports = await prisma.airport.count();
  const totalRoutes = await prisma.route.count();

  console.log("\nSeed complete!");
  console.log(`  Airlines: ${totalAirlines}`);
  console.log(`  Airports: ${totalAirports}`);
  console.log(`  Routes:   ${totalRoutes}`);
  console.log(
    `  Expected: ${ORIGIN_CODES.length} origins x ${destinationCodes.length} destinations = ${ORIGIN_CODES.length * destinationCodes.length} routes`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
