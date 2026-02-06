import { describe, it, expect } from "vitest";
import { CreateAlertSchema, UpdateAlertSchema } from "@/lib/validators/alert";
import { PriceSearchSchema, BestDealsSchema } from "@/lib/validators/search";

describe("CreateAlertSchema", () => {
  it("accepts valid input", () => {
    const result = CreateAlertSchema.safeParse({
      routeId: "some-uuid-123",
      cabinClass: "BUSINESS",
      thresholdPoints: 50000,
      alertChannels: ["EMAIL"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional airlineId", () => {
    const result = CreateAlertSchema.safeParse({
      routeId: "some-uuid-123",
      cabinClass: "FIRST",
      airlineId: "airline-uuid",
      thresholdPoints: 75000,
      alertChannels: ["EMAIL", "SMS"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid cabin class", () => {
    const result = CreateAlertSchema.safeParse({
      routeId: "some-uuid-123",
      cabinClass: "PREMIUM_ECONOMY",
      thresholdPoints: 50000,
      alertChannels: ["EMAIL"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty alertChannels", () => {
    const result = CreateAlertSchema.safeParse({
      routeId: "some-uuid-123",
      cabinClass: "BUSINESS",
      thresholdPoints: 50000,
      alertChannels: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative threshold", () => {
    const result = CreateAlertSchema.safeParse({
      routeId: "some-uuid-123",
      cabinClass: "BUSINESS",
      thresholdPoints: -1000,
      alertChannels: ["EMAIL"],
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateAlertSchema", () => {
  it("accepts partial updates", () => {
    const result = UpdateAlertSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("accepts threshold update", () => {
    const result = UpdateAlertSchema.safeParse({ thresholdPoints: 60000 });
    expect(result.success).toBe(true);
  });
});

describe("PriceSearchSchema", () => {
  it("accepts valid search params", () => {
    const result = PriceSearchSchema.safeParse({
      origin: "AUS",
      destination: "LHR",
      cabinClass: "BUSINESS",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty (all optional)", () => {
    const result = PriceSearchSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("BestDealsSchema", () => {
  it("accepts region filter", () => {
    const result = BestDealsSchema.safeParse({
      region: "EUROPE",
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts cabin class filter", () => {
    const result = BestDealsSchema.safeParse({
      cabinClass: "FIRST",
    });
    expect(result.success).toBe(true);
  });
});
