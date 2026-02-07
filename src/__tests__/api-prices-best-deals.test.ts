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
    },
  },
}));

vi.mock("@/lib/services/deal-scorer", () => ({
  calculateDealScoreFromThresholds: vi.fn(),
}));

import { GET } from "@/app/api/prices/best-deals/route";
import { db } from "@/lib/db";
import { calculateDealScoreFromThresholds } from "@/lib/services/deal-scorer";

// Cast mocked imports for type safety
const mockDb = vi.mocked(db);
const mockCalculateScore = vi.mocked(calculateDealScoreFromThresholds);

function makePrice(overrides: Record<string, any> = {}) {
  return {
    id: "price-1",
    routeId: "route-1",
    airlineId: "airline-1",
    cabinClass: "BUSINESS",
    mileageCost: 50000,
    amexPointsEquivalent: 50000,
    cashCopay: 50,
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
      logoUrl: "https://example.com/ba-logo.png",
    },
    ...overrides,
  };
}

function makeScoreResult(overrides: Record<string, any> = {}) {
  return {
    score: 85,
    tier: "EXCELLENT_DEAL",
    savingsPercent: 25,
    thirtyDayAvg: 60000,
    ...overrides,
  };
}

describe("GET /api/prices/best-deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateScore.mockReturnValue(makeScoreResult());
  });

  describe("validation", () => {
    it("returns 400 for invalid cabin class", async () => {
      const request = new Request(
        "http://localhost/api/prices/best-deals?cabinClass=INVALID"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
      expect(json.details).toBeDefined();
    });

    it("returns 400 for invalid region", async () => {
      const request = new Request(
        "http://localhost/api/prices/best-deals?region=INVALID_REGION"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for invalid limit (too high)", async () => {
      const request = new Request(
        "http://localhost/api/prices/best-deals?limit=101"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });

    it("returns 400 for negative offset", async () => {
      const request = new Request(
        "http://localhost/api/prices/best-deals?offset=-1"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Invalid parameters");
    });
  });

  describe("successful queries with defaults", () => {
    it("returns deals with default pagination", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("price-1");
    });

    it("uses default limit of 20 when not specified", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });

    it("returns empty array when no deals found", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = (await response.json()) as any;
      expect(json.data).toEqual([]);
    });
  });

  describe("filtering by params", () => {
    it("filters by region", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request(
        "http://localhost/api/prices/best-deals?region=ASIA"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            route: {
              destinationAirport: { region: "ASIA" },
            },
          }),
        })
      );
    });

    it("filters by cabin class", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request(
        "http://localhost/api/prices/best-deals?cabinClass=FIRST"
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

    it("filters by both region and cabin class", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request(
        "http://localhost/api/prices/best-deals?region=EUROPE&cabinClass=BUSINESS"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cabinClass: "BUSINESS",
            route: {
              destinationAirport: { region: "EUROPE" },
            },
          }),
        })
      );
    });
  });

  describe("pagination", () => {
    it("respects custom limit and offset", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request(
        "http://localhost/api/prices/best-deals?limit=50&offset=100"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      );
    });

    it("accepts minimum limit of 1", async () => {
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([]);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request(
        "http://localhost/api/prices/best-deals?limit=1"
      );
      await GET(request);

      expect(mockDb.dailyMileagePrice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        })
      );
    });
  });

  describe("deal scoring", () => {
    it("calculates deal score for each price", async () => {
      const price1 = makePrice({
        id: "price-1",
        amexPointsEquivalent: 50000,
        cabinClass: "BUSINESS",
      });
      const price2 = makePrice({
        id: "price-2",
        amexPointsEquivalent: 60000,
        cabinClass: "BUSINESS",
      });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue(
        [price1, price2] as any
      );
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
      await GET(request);

      expect(mockCalculateScore).toHaveBeenCalledTimes(2);
      expect(mockCalculateScore).toHaveBeenCalledWith(50000, "BUSINESS", "EUROPE");
      expect(mockCalculateScore).toHaveBeenCalledWith(60000, "BUSINESS", "EUROPE");
    });

    it("includes score details in response", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockCalculateScore.mockReturnValue(
        makeScoreResult({
          score: 90,
          tier: "EXCELLENT_DEAL",
          savingsPercent: 30,
          thirtyDayAvg: 65000,
        })
      );

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data[0]).toMatchObject({
        dealScore: 90,
        dealTier: "EXCELLENT_DEAL",
        savingsPercent: 30,
        thirtyDayAvg: 65000,
      });
    });
  });

  describe("sorting by deal score", () => {
    it("sorts deals by score in descending order", async () => {
      const price1 = makePrice({ id: "price-1" });
      const price2 = makePrice({ id: "price-2" });
      const price3 = makePrice({ id: "price-3" });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue(
        [price1, price2, price3] as any
      );

      mockCalculateScore.mockImplementation((points) => {
        if (points === 50000) return makeScoreResult({ score: 85 });
        if (points === 50000) return makeScoreResult({ score: 75 });
        return makeScoreResult({ score: 95 });
      });

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);
      const json = (await response.json()) as any;

      // All should be sorted by score descending
      for (let i = 0; i < json.data.length - 1; i++) {
        expect(json.data[i].dealScore).toBeGreaterThanOrEqual(
          json.data[i + 1].dealScore
        );
      }
    });
  });

  describe("response format", () => {
    it("includes all required fields in response", async () => {
      const mockPrice = makePrice({
        cashCopay: 75,
      });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
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
        isDirect: true,
        travelDate: expect.any(String),
        bookingUrl: "https://example.com/book",
        dealScore: expect.any(Number),
        dealTier: expect.any(String),
        savingsPercent: expect.any(Number),
        thirtyDayAvg: expect.any(Number),
      });
    });

    it("includes airline details in response", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
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

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to fetch best deals");
    });

    it("returns 500 when deal scoring fails", async () => {
      const mockPrice = makePrice();
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([mockPrice] as any);
      mockCalculateScore.mockImplementation(() => {
        throw new Error("Scoring error");
      });

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = (await response.json()) as any;
      expect(json.error).toBe("Failed to fetch best deals");
    });
  });

  describe("multiple deals", () => {
    it("processes multiple deals with different scores", async () => {
      const price1 = makePrice({ id: "price-1", amexPointsEquivalent: 50000 });
      const price2 = makePrice({ id: "price-2", amexPointsEquivalent: 45000 });
      const price3 = makePrice({ id: "price-3", amexPointsEquivalent: 55000 });

      mockDb.dailyMileagePrice.findMany.mockResolvedValue(
        [price1, price2, price3] as any
      );

      mockCalculateScore
        .mockReturnValueOnce(makeScoreResult({ score: 85 }))
        .mockReturnValueOnce(makeScoreResult({ score: 95 }))
        .mockReturnValueOnce(makeScoreResult({ score: 75 }));

      const request = new Request("http://localhost/api/prices/best-deals");
      const response = await GET(request);
      const json = (await response.json()) as any;

      expect(json.data).toHaveLength(3);
      // First deal should have highest score (95) due to sorting
      expect(json.data[0].dealScore).toBe(95);
      expect(json.data[0].id).toBe("price-2");
      // Second deal score 85
      expect(json.data[1].dealScore).toBe(85);
      expect(json.data[1].id).toBe("price-1");
      // Third deal score 75
      expect(json.data[2].dealScore).toBe(75);
      expect(json.data[2].id).toBe("price-3");
    });
  });

  describe("with different regions", () => {
    it("calculates scores with correct region parameter", async () => {
      const asiaPrice = makePrice({
        route: {
          originAirport: { code: "SFO", city: "San Francisco" },
          destinationAirport: { code: "NRT", city: "Tokyo", region: "ASIA" },
        },
      });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue([asiaPrice] as any);
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
      await GET(request);

      expect(mockCalculateScore).toHaveBeenCalledWith(50000, "BUSINESS", "ASIA");
    });

    it("handles different cabin classes", async () => {
      const firstClassPrice = makePrice({
        cabinClass: "FIRST",
        amexPointsEquivalent: 100000,
      });
      mockDb.dailyMileagePrice.findMany.mockResolvedValue(
        [firstClassPrice] as any
      );
      mockCalculateScore.mockReturnValue(makeScoreResult());

      const request = new Request("http://localhost/api/prices/best-deals");
      await GET(request);

      expect(mockCalculateScore).toHaveBeenCalledWith(
        100000,
        "FIRST",
        "EUROPE"
      );
    });
  });
});
