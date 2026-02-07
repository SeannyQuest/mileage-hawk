import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before imports
// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    dailyMileagePrice: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/prices/search/route";
import { db } from "@/lib/db";

// Cast mocked imports for type safety
const mockDb = vi.mocked(db);

function makePrice(overrides: Record<string, any> = {}) {
  return {
    id: "price-1",
    routeId: "route-1",
    airlineId: "airline-1",
    cabinClass: "BUSINESS",
    mileageCost: 50000,
    amexPointsEquivalent: 50000,
    cashCopay: 50,
    availabilityCount: 5,
    isDirect: true,
    travelDate: new Date("2026-04-15"),
    bookingUrl: "https://example.com/book",
    route: {
      id: "route-1",
      originAirport: { code: "AUS", city: "Austin" },
      destinationAirport: { code: "LHR", city: "London", region: "EUROPE" },
    },
    airline: {
      name: "British Airways",
      code: "BA",
      loyaltyProgram: "Executive Club",
      loyaltyCurrency: "Avios",
      amexTransferRatio: 1,
      logoUrl: "https://example.com/ba-logo.png",
    },
    ...overrides,
  };
}

describe("GET /api/prices/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("returns 400 for invalid cabin class", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?cabinClass=INVALID"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
      expect(json.details).toBeDefined();
    });

    it("returns 400 for invalid airport code (not 3 letters)", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?origin=AB"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid region", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?region=INVALID_REGION"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid date format", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?dateFrom=2026/04/15"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid limit (too high)", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?limit=101"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid sort option", async () => {
      const request = new Request(
        "http://localhost/api/prices/search?sort=invalid"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });
  });

  describe("successful queries with defaults", () => {
    it("returns prices with default pagination and sorting", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockDb.dailyMileagePrice.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/prices/search");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("price-1");
      expect(json.data[0].origin).toBe("AUS");
      expect(json.data[0].destination).toBe("LHR");
      expect(json.meta.total).toBe(1);
      expect(json.meta.limit).toBe(20);
      expect(json.meta.offset).toBe(0);
    });

    it("uses default sort=price when not specified", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request("http://localhost/api/prices/search");
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amexPointsEquivalent: "asc" },
        })
      );
    });
  });

  describe("filtering by params", () => {
    it("filters by origin airport", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?origin=AUS"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            route: expect.objectContaining({
              originAirport: { code: "AUS" },
            }),
          }),
        })
      );
    });

    it("filters by destination airport", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?destination=LHR"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            route: expect.objectContaining({
              destinationAirport: { code: "LHR" },
            }),
          }),
        })
      );
    });

    it("filters by region", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?region=EUROPE"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            route: expect.objectContaining({
              destinationAirport: { region: "EUROPE" },
            }),
          }),
        })
      );
    });

    it("filters by cabin class", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?cabinClass=FIRST"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cabinClass: "FIRST",
          }),
        })
      );
    });

    it("filters by max points", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?maxPoints=60000"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            amexPointsEquivalent: { lte: 60000 },
          }),
        })
      );
    });

    it("filters by direct only", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?directOnly=true"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDirect: true,
          }),
        })
      );
    });

    it("filters by date range", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?dateFrom=2026-04-01&dateTo=2026-04-30"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            travelDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it("filters by airline code", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?airline=BA"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            airline: { code: "BA" },
          }),
        })
      );
    });
  });

  describe("sorting and pagination", () => {
    it("sorts by price ascending", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?sort=price&order=asc"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amexPointsEquivalent: "asc" },
        })
      );
    });

    it("sorts by price descending", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?sort=price&order=desc"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amexPointsEquivalent: "desc" },
        })
      );
    });

    it("sorts by date", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?sort=date&order=asc"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { travelDate: "asc" },
        })
      );
    });

    it("sorts by airline", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?sort=airline&order=asc"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { airline: { name: "asc" } },
        })
      );
    });

    it("respects custom limit and offset", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?limit=50&offset=100"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      );
    });
  });

  describe("response format", () => {
    it("includes all required fields in response", async () => {
      const mockPrice = makePrice({
        cashCopay: 75,
        availabilityCount: 3,
      });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockDb.dailyMileagePrice.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/prices/search");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0]).toMatchObject({
        id: "price-1",
        origin: "AUS",
        originCity: "Austin",
        destination: "LHR",
        destinationCity: "London",
        region: "EUROPE",
        cabinClass: "BUSINESS",
        mileageCost: 50000,
        amexPointsEquivalent: 50000,
        cashCopay: 75,
        availabilityCount: 3,
        isDirect: true,
        travelDate: expect.any(String),
        bookingUrl: "https://example.com/book",
      });
    });

    it("includes airline details in response", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockDb.dailyMileagePrice.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/prices/search");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0].airline).toMatchObject({
        name: "British Airways",
        code: "BA",
        loyaltyProgram: "Executive Club",
      });
    });
  });

  describe("error handling", () => {
    it("returns 500 when database query fails", async () => {
      mockDb.dailyMileagePrice.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/prices/search");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to search prices");
    });

    it("returns 500 when count query fails", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockRejectedValue(
        new Error("Count error")
      );

      const request = new Request("http://localhost/api/prices/search");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to search prices");
    });
  });

  describe("complex filtering combinations", () => {
    it("combines origin and region filters", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?origin=AUS&region=EUROPE"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            route: expect.objectContaining({
              originAirport: { code: "AUS" },
              destinationAirport: { region: "EUROPE" },
            }),
          }),
        })
      );
    });

    it("combines cabin class, date range, and max points filters", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockDb.dailyMileagePrice.count.mockResolvedValue(0);

      const request = new Request(
        "http://localhost/api/prices/search?cabinClass=BUSINESS&dateFrom=2026-04-01&dateTo=2026-04-30&maxPoints=70000"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cabinClass: "BUSINESS",
            amexPointsEquivalent: { lte: 70000 },
            travelDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });
});
