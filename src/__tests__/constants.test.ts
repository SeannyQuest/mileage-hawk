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

  it("has correct AMEX transfer ratios for known partners", () => {
    const delta = AIRLINES.find((a) => a.code === "DL");
    expect(delta?.amexTransferRatio).toBe(1.0);

    const cathay = AIRLINES.find((a) => a.code === "CX");
    expect(cathay?.amexTransferRatio).toBe(0.8);

    const aeromexico = AIRLINES.find((a) => a.code === "AM");
    expect(aeromexico?.amexTransferRatio).toBe(1.6);
  });

  it("has correct Capital One transfer ratios", () => {
    const airCanada = AIRLINES.find((a) => a.code === "AC");
    expect(airCanada?.capitalOneTransferRatio).toBe(1.0);

    const cathay = AIRLINES.find((a) => a.code === "CX");
    expect(cathay?.capitalOneTransferRatio).toBe(1.0); // C1 is 1:1, better than AMEX 5:4

    const emirates = AIRLINES.find((a) => a.code === "EK");
    expect(emirates?.capitalOneTransferRatio).toBe(0.75); // C1 2:1.5

    const jetblue = AIRLINES.find((a) => a.code === "B6");
    expect(jetblue?.capitalOneTransferRatio).toBe(0.6); // C1 5:3
  });

  it("has null Capital One ratio for AMEX-only partners", () => {
    const delta = AIRLINES.find((a) => a.code === "DL");
    expect(delta?.capitalOneTransferRatio).toBeNull();

    const ana = AIRLINES.find((a) => a.code === "NH");
    expect(ana?.capitalOneTransferRatio).toBeNull();

    const aerLingus = AIRLINES.find((a) => a.code === "EI");
    expect(aerLingus?.capitalOneTransferRatio).toBeNull();
  });

  it("has 12 Capital One partners", () => {
    const c1Partners = AIRLINES.filter((a) => a.capitalOneTransferRatio !== null);
    expect(c1Partners).toHaveLength(12);
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

  it("has 54 destination airports", () => {
    const destinations = AIRPORTS.filter((a) => !a.isOrigin);
    expect(destinations).toHaveLength(54);
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
