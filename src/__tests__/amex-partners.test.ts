import { describe, it, expect } from "vitest";
import {
  calculateAmexPoints,
  calculateCapitalOnePoints,
  formatTransferRatio,
  formatPoints,
  formatPointsShort,
  findBestAmexDeal,
} from "@/lib/amex-partners";

describe("calculateAmexPoints", () => {
  it("returns the same points for a 1:1 transfer ratio", () => {
    expect(calculateAmexPoints(50000, 1.0)).toBe(50000);
  });

  it("calculates correctly for 5:4 ratio (0.8)", () => {
    // 40,000 miles at 0.8 ratio → 40000/0.8 = 50,000 AMEX points
    expect(calculateAmexPoints(40000, 0.8)).toBe(50000);
  });

  it("calculates correctly for 1:1.6 bonus ratio", () => {
    // 80,000 miles at 1.6 ratio → 80000/1.6 = 50,000 AMEX points
    expect(calculateAmexPoints(80000, 1.6)).toBe(50000);
  });

  it("rounds up to the nearest whole point", () => {
    // 50001 miles at 1.0 ratio → 50001 (no rounding needed)
    expect(calculateAmexPoints(50001, 1.0)).toBe(50001);
    // 10001 miles at 0.8 ratio → 10001/0.8 = 12501.25 → ceil → 12502
    expect(calculateAmexPoints(10001, 0.8)).toBe(12502);
  });

  it("handles zero miles", () => {
    expect(calculateAmexPoints(0, 1.0)).toBe(0);
  });
});

describe("calculateCapitalOnePoints", () => {
  it("returns null for non-C1 partner", () => {
    expect(calculateCapitalOnePoints(50000, null)).toBeNull();
  });

  it("returns same points for 1:1 C1 partner", () => {
    expect(calculateCapitalOnePoints(50000, 1.0)).toBe(50000);
  });

  it("calculates correctly for 2:1.5 ratio (0.75)", () => {
    // 75,000 miles at 0.75 ratio → 75000/0.75 = 100,000 C1 points
    expect(calculateCapitalOnePoints(75000, 0.75)).toBe(100000);
  });

  it("calculates correctly for 5:3 ratio (0.6)", () => {
    // 30,000 miles at 0.6 ratio → 30000/0.6 = 50,000 C1 points
    expect(calculateCapitalOnePoints(30000, 0.6)).toBe(50000);
  });

  it("rounds up to nearest whole point", () => {
    expect(calculateCapitalOnePoints(10001, 0.75)).toBe(13335);
  });
});

describe("formatTransferRatio", () => {
  it("formats 1:1 ratio", () => {
    expect(formatTransferRatio(1.0)).toBe("1:1");
  });

  it("formats 5:4 ratio", () => {
    expect(formatTransferRatio(0.8)).toBe("5:4");
  });

  it("formats 1:1.6 bonus ratio", () => {
    expect(formatTransferRatio(1.6)).toBe("1:1.6");
  });

  it("formats 2:1.5 Capital One ratio", () => {
    expect(formatTransferRatio(0.75)).toBe("2:1.5");
  });

  it("formats 5:3 Capital One ratio", () => {
    expect(formatTransferRatio(0.6)).toBe("5:3");
  });
});

describe("formatPoints", () => {
  it("formats with commas", () => {
    expect(formatPoints(50000)).toBe("50,000");
    expect(formatPoints(1234567)).toBe("1,234,567");
  });

  it("handles zero", () => {
    expect(formatPoints(0)).toBe("0");
  });
});

describe("formatPointsShort", () => {
  it("formats thousands as K", () => {
    expect(formatPointsShort(50000)).toBe("50K");
    expect(formatPointsShort(55000)).toBe("55K");
  });

  it("formats with decimal for non-round thousands", () => {
    expect(formatPointsShort(72500)).toBe("72.5K");
  });

  it("handles small numbers", () => {
    expect(formatPointsShort(500)).toBe("500");
  });
});

describe("findBestAmexDeal", () => {
  it("returns the deal with the lowest AMEX points", () => {
    // All 1:1 partners, so the lowest mileage cost wins
    const prices = [
      { airlineCode: "AC", mileageCost: 55000 }, // 1:1 → 55K AMEX
      { airlineCode: "DL", mileageCost: 45000 }, // 1:1 → 45K AMEX
      { airlineCode: "AF", mileageCost: 60000 }, // 1:1 → 60K AMEX
    ];
    const best = findBestAmexDeal(prices);
    expect(best?.airlineCode).toBe("DL");
    expect(best?.amexPoints).toBe(45000);
  });

  it("accounts for transfer ratio when finding best deal", () => {
    const prices = [
      { airlineCode: "DL", mileageCost: 50000 }, // 1:1 → 50K AMEX
      { airlineCode: "AM", mileageCost: 80000 }, // 1:1.6 → 50K AMEX (same!)
    ];
    const best = findBestAmexDeal(prices);
    // Both are 50K AMEX, first one wins
    expect(best?.amexPoints).toBe(50000);
  });

  it("prefers bonus-ratio airline when mileage is proportionally lower", () => {
    const prices = [
      { airlineCode: "DL", mileageCost: 50000 }, // 1:1 → 50K AMEX
      { airlineCode: "AM", mileageCost: 70000 }, // 1:1.6 → 43,750 AMEX (better!)
    ];
    const best = findBestAmexDeal(prices);
    expect(best?.airlineCode).toBe("AM");
    expect(best?.amexPoints).toBe(43750);
  });

  it("returns null for empty array", () => {
    expect(findBestAmexDeal([])).toBeNull();
  });
});
