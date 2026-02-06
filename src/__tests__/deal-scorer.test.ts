import { describe, it, expect } from "vitest";
import { calculateDealScoreFromThresholds } from "@/lib/services/deal-scorer";

describe("calculateDealScoreFromThresholds", () => {
  it("scores a fair deal (above typical range)", () => {
    // Europe Business typical range: 55K-80K, so 75K should be fair
    // args: (amexPoints, cabinClass, region)
    const result = calculateDealScoreFromThresholds(75000, "BUSINESS", "EUROPE" as any);
    expect(result.tier).toBe("fair");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(10);
  });

  it("scores a good deal (below typical range)", () => {
    // Europe Business good deal: 50K
    const result = calculateDealScoreFromThresholds(50000, "BUSINESS", "EUROPE" as any);
    expect(["good", "great"]).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it("scores a great deal", () => {
    // Europe Business: price at good deal threshold (50K) or below
    const result = calculateDealScoreFromThresholds(42000, "BUSINESS", "EUROPE" as any);
    expect(["great", "amazing", "unicorn"]).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it("scores an exceptional deal as amazing", () => {
    // Europe Business exceptional: 35K → a price of 30K should be amazing
    const result = calculateDealScoreFromThresholds(30000, "BUSINESS", "EUROPE" as any);
    expect(["amazing", "unicorn"]).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(35);
  });

  it("returns fair for unknown region", () => {
    const result = calculateDealScoreFromThresholds(50000, "BUSINESS", "UNKNOWN" as any);
    expect(result.tier).toBe("fair");
    expect(result.score).toBe(0);
  });

  it("handles Mexico region (lower thresholds)", () => {
    // Mexico Economy Plus good deal: 10K, typical midpoint ~16K
    const result = calculateDealScoreFromThresholds(10000, "ECONOMY_PLUS", "LATIN_AMERICA_MEXICO" as any);
    expect(["good", "great", "amazing", "unicorn"]).toContain(result.tier);
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it("returns savings information for good deals", () => {
    const result = calculateDealScoreFromThresholds(40000, "BUSINESS", "EUROPE" as any);
    expect(result.savings).toBeGreaterThan(0);
    expect(result.savingsPercent).toBeGreaterThan(0);
    expect(result.thirtyDayAvg).toBeGreaterThan(0);
  });

  it("returns null savings for overpriced flights", () => {
    // Price at 85K, well above Europe Business typical range midpoint (67.5K)
    const result = calculateDealScoreFromThresholds(85000, "BUSINESS", "EUROPE" as any);
    expect(result.savings).toBeNull();
    expect(result.savingsPercent).toBeNull();
  });
});
