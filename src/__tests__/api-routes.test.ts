import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before imports
// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    route: {
      findMany: vi.fn(),
    },
    dailyMileagePrice: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/routes/route";
import { db } from "@/lib/db";

// Cast mocked imports for type safety
const mockDb = vi.mocked(db);

function makeRoute(overrides: Record<string, any> = {}) {
  return {
    id: "route-1",
    isActive: true,
    originAirport: { code: "AUS", city: "Austin", country: "United States" },
    destinationAirport: {
      code: "LHR",
      city: "London",
      country: "United Kingdom",
      region: "EUROPE",
    },
    ...overrides,
  };
}

function makePrice(overrides: Record<string, any> = {}) {
  return {
    id: "price-1",
    routeId: "route-1",
    airlineId: "airline-1",
    cabinClass: "BUSINESS",
    mileageCost: 50000,
    amexPointsEquivalent: 50000,
    travelDate: new Date("2026-04-15"),
    airline: {
      name: "British Airways",
      code: "BA",
    },
    ...overrides,
  };
}

describe("GET /api/routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("returns 400 for invalid cabin class", async () => {
      const request = new Request(
        "http://localhost/api/routes?cabinClass=INVALID"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
      expect(json.details).toBeDefined();
    });

    it("returns 400 for invalid region", async () => {
      const request = new Request(
        "http://localhost/api/routes?region=INVALID_REGION"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid airport code (not 3 letters)", async () => {
      const request = new Request(
        "http://localhost/api/routes?origin=INVALID"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });
  });

  describe("successful queries with no filters", () => {
    it("returns all active routes", async () => {
      const route1 = makeRoute({ id: "route-1" });
      const route2 = makeRoute({
        id: "route-2",
        originAirport: { code: "DFW", city: "Dallas", country: "United States" },
        destinationAirport: {
          code: "CDG",
          city: "Paris",
          country: "France",
          region: "EUROPE",
        },
      });

      mockDb.route.findMany.mockResolvedValue([route1, route2] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ routeId: "route-1" }),
        makePrice({ routeId: "route-2" }),
      ] as any);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toHaveLength(2);
      expect(json.data[0].origin).toBe("AUS");
      expect(json.data[1].origin).toBe("DFW");
    });

    it("returns empty array when no routes exist", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toEqual([]);
    });

    it("only queries active routes", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/routes");
      await GET(request);

      expect(mockDb.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe("filtering by params", () => {
    it("filters by origin airport", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/routes?origin=AUS"
      );
      await GET(request);

      expect(mockDb.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            originAirport: { code: "AUS" },
          }),
        })
      );
    });

    it("filters by region", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/routes?region=ASIA"
      );
      await GET(request);

      expect(mockDb.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            destinationAirport: { region: "ASIA" },
          }),
        })
      );
    });

    it("filters by cabin class (applies to price query, not route query)", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ cabinClass: "FIRST" }),
      ] as any);

      const request = new Request(
        "http://localhost/api/routes?cabinClass=FIRST"
      );
      await GET(request);

      // Cabin class should filter the price query, not the route query
      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cabinClass: "FIRST",
          }),
        })
      );
    });

    it("combines origin and region filters", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/routes?origin=AUS&region=EUROPE"
      );
      await GET(request);

      expect(mockDb.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            originAirport: { code: "AUS" },
            destinationAirport: { region: "EUROPE" },
          }),
        })
      );
    });
  });

  describe("best price lookup", () => {
    it("finds best price for each route", async () => {
      const route1 = makeRoute({ id: "route-1" });
      const route2 = makeRoute({
        id: "route-2",
        originAirport: { code: "DFW", city: "Dallas", country: "United States" },
      });

      mockDb.route.findMany.mockResolvedValue([route1, route2] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ routeId: "route-1" }),
        makePrice({ routeId: "route-2" }),
      ] as any);

      const request = new Request("http://localhost/api/routes");
      await GET(request);

      // Should query for best prices in a single batch call
      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledTimes(1);
      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeId: { in: ["route-1", "route-2"] },
          }),
        })
      );
    });

    it("sorts prices by lowest amex points", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice(),
      ] as any);

      const request = new Request("http://localhost/api/routes");
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amexPointsEquivalent: "asc" },
        })
      );
    });

    it("handles routes with no prices", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].bestPrice).toBeNull();
    });

    it("filters price query by cabin class when provided", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ cabinClass: "BUSINESS" }),
      ] as any);

      const request = new Request(
        "http://localhost/api/routes?cabinClass=BUSINESS"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeId: { in: ["route-1"] },
            cabinClass: "BUSINESS",
          }),
        })
      );
    });

    it("does not filter price by cabin class when not provided", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([makePrice()] as any);

      const request = new Request("http://localhost/api/routes");
      await GET(request);

      // Should not have cabinClass filter in price query
      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            cabinClass: expect.anything(),
          }),
        })
      );
    });
  });

  describe("response format", () => {
    it("includes all required route fields", async () => {
      const route = makeRoute({
        originAirport: { code: "SFO", city: "San Francisco", country: "United States" },
        destinationAirport: {
          code: "NRT",
          city: "Tokyo",
          country: "Japan",
          region: "ASIA",
        },
      });
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0]).toMatchObject({
        id: "route-1",
        origin: "SFO",
        originCity: "San Francisco",
        destination: "NRT",
        destinationCity: "Tokyo",
        destinationCountry: "Japan",
        region: "ASIA",
        bestPrice: null,
      });
    });

    it("includes best price details when available", async () => {
      const route = makeRoute();
      const price = makePrice({
        amexPointsEquivalent: 75000,
        mileageCost: 60000,
        cabinClass: "FIRST",
        travelDate: new Date("2026-05-01"),
      });

      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([price] as any);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].bestPrice).toMatchObject({
        amexPoints: 75000,
        mileageCost: 60000,
        airline: "British Airways",
        airlineCode: "BA",
        cabinClass: "FIRST",
        travelDate: expect.any(String),
      });
    });

    it("includes airline info in best price", async () => {
      const route = makeRoute();
      const price = makePrice({
        airline: {
          name: "All Nippon Airways",
          code: "NH",
        },
      });

      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([price] as any);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].bestPrice.airline).toBe("All Nippon Airways");
      expect(json.data[0].bestPrice.airlineCode).toBe("NH");
    });
  });

  describe("sorting", () => {
    it("sorts routes by destination city ascending", async () => {
      mockDb.route.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/routes");
      await GET(request);

      expect(mockDb.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            destinationAirport: { city: "asc" },
          },
        })
      );
    });
  });

  describe("error handling", () => {
    it("returns 500 when route query fails", async () => {
      mockDb.route.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to fetch routes");
    });

    it("returns 500 when price query fails", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockRejectedValue(
        new Error("Price lookup error")
      );

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to fetch routes");
    });
  });

  describe("multiple routes with different prices", () => {
    it("handles multiple routes with varying prices", async () => {
      const route1 = makeRoute({ id: "route-1" });
      const route2 = makeRoute({
        id: "route-2",
        destinationAirport: {
          code: "CDG",
          city: "Paris",
          country: "France",
          region: "EUROPE",
        },
      });
      const route3 = makeRoute({
        id: "route-3",
        destinationAirport: {
          code: "NRT",
          city: "Tokyo",
          country: "Japan",
          region: "ASIA",
        },
      });

      mockDb.route.findMany.mockResolvedValue(
        [route1, route2, route3] as any
      );

      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ routeId: "route-1", amexPointsEquivalent: 50000 }),
        makePrice({ routeId: "route-2", amexPointsEquivalent: 75000 }),
      ] as any);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data).toHaveLength(3);
      expect(json.data[0].bestPrice.amexPoints).toBe(50000);
      expect(json.data[1].bestPrice.amexPoints).toBe(75000);
      expect(json.data[2].bestPrice).toBeNull();
    });

    it("queries all routes for best prices in a single batch call", async () => {
      const routes = [
        makeRoute({ id: "route-1" }),
        makeRoute({ id: "route-2" }),
        makeRoute({ id: "route-3" }),
      ];

      mockDb.route.findMany.mockResolvedValue(routes as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice({ routeId: "route-1" }),
        makePrice({ routeId: "route-2" }),
        makePrice({ routeId: "route-3" }),
      ] as any);

      const request = new Request("http://localhost/api/routes");
      const response = await GET(request);
      const json = (await response.json()) as any;

      // Should return all routes with prices in a single findMany call
      expect(json.data).toHaveLength(3);
      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("different cabin classes", () => {
    it("returns best price in specified cabin class", async () => {
      const route = makeRoute();
      const price = makePrice({ cabinClass: "ECONOMY_PLUS" });

      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([price] as any);

      const request = new Request(
        "http://localhost/api/routes?cabinClass=ECONOMY_PLUS"
      );
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].bestPrice.cabinClass).toBe("ECONOMY_PLUS");
    });

    it("returns no price if no routes in specified cabin class", async () => {
      const route = makeRoute();
      mockDb.route.findMany.mockResolvedValue([route] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/routes?cabinClass=FIRST"
      );
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].bestPrice).toBeNull();
    });
  });

  describe("different regions", () => {
    it("returns routes for specified region", async () => {
      const asiaRoute = makeRoute({
        destinationAirport: {
          code: "NRT",
          city: "Tokyo",
          country: "Japan",
          region: "ASIA",
        },
      });

      mockDb.route.findMany.mockResolvedValue([asiaRoute] as any);
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([
        makePrice(),
      ] as any);

      const request = new Request(
        "http://localhost/api/routes?region=ASIA"
      );
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].region).toBe("ASIA");
      expect(json.data[0].destination).toBe("NRT");
    });
  });
});
