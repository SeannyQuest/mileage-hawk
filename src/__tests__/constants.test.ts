import { describe, it, expect } from "vitest";
import { AIRLINES, AIRPORTS, DEFAULT_THRESHOLDS, ORIGIN_CODES, getDealTier, getDealTierInfo } from "@/lib/constants";

describe("AIRLINES", () => {
  it("has 17 AMEX transfer partners", () => {
    expect(AIRLINES).toHaveLength(17);
  });

  it("all airlines have required fields", () => {
    for (const airline of AIRLINES) {
      expect(airline.name).toBeTruthy();
      expect(airline.code).toBeTruthy();
      expect(airline.loyaltyProgram).toBeTruthy();
      expect(airline.amexTransferRatio).toBeGreaterThan(0);
    }
  });

  it("has correct transfer ratios for known partners", () => {
    const delta = AIRLINES.find((a) => a.code === "DL");
    expect(delta?.amexTransferRatio).toBe(1.0);

    const cathay = AIRLINES.find((a) => a.code === "CX");
    expect(cathay?.amexTransferRatio).toBe(0.8);

    const aeromexico = AIRLINES.find((a) => a.code === "AM");
    expect(aeromexico?.amexTransferRatio).toBe(1.6);
  });

  it("all airline codes are unique", () => {
    const codes = AIRLINES.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("AIRPORTS", () => {
  it("has 3 origin airports", () => {
    const origins = AIRPORTS.filter((a) => a.isOrigin);
    expect(origins).toHaveLength(3);
    const codes = origins.map((a) => a.code).sort();
    expect(codes).toEqual(["AUS", "DAL", "DFW"]);
  });

  it("has 43 destination airports", () => {
    const destinations = AIRPORTS.filter((a) => !a.isOrigin);
    expect(destinations).toHaveLength(43);
  });

  it("all airport codes are unique", () => {
    const codes = AIRPORTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("all airports have coordinates", () => {
    for (const airport of AIRPORTS) {
      expect(airport.latitude).toBeDefined();
      expect(airport.longitude).toBeDefined();
      expect(airport.latitude).toBeGreaterThanOrEqual(-90);
      expect(airport.latitude).toBeLessThanOrEqual(90);
      expect(airport.longitude).toBeGreaterThanOrEqual(-180);
      expect(airport.longitude).toBeLessThanOrEqual(180);
    }
  });
});

describe("ORIGIN_CODES", () => {
  it("has AUS, DFW, DAL", () => {
    expect(ORIGIN_CODES).toContain("AUS");
    expect(ORIGIN_CODES).toContain("DFW");
    expect(ORIGIN_CODES).toContain("DAL");
    expect(ORIGIN_CODES).toHaveLength(3);
  });
});

describe("DEFAULT_THRESHOLDS", () => {
  it("covers 7 regions", () => {
    expect(DEFAULT_THRESHOLDS).toHaveLength(7);
  });

  it("has valid threshold ranges (good < typical low)", () => {
    for (const region of DEFAULT_THRESHOLDS) {
      expect(region.business.goodDeal).toBeLessThanOrEqual(region.business.typicalRange[0]);
      expect(region.business.exceptionalDeal).toBeLessThan(region.business.goodDeal);
    }
  });
});

describe("getDealTier", () => {
  it("returns unicorn for high scores", () => {
    expect(getDealTier(55)).toBe("unicorn");
  });

  it("returns amazing for 35-50", () => {
    expect(getDealTier(40)).toBe("amazing");
  });

  it("returns great for 20-35", () => {
    expect(getDealTier(25)).toBe("great");
  });

  it("returns good for 10-20", () => {
    expect(getDealTier(15)).toBe("good");
  });

  it("returns fair for low scores", () => {
    expect(getDealTier(5)).toBe("fair");
    expect(getDealTier(0)).toBe("fair");
  });
});

describe("getDealTierInfo", () => {
  it("returns the correct tier info", () => {
    const info = getDealTierInfo("unicorn");
    expect(info.label).toBe("Unicorn");
    expect(info.color).toContain("amber");
  });
});
