import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted — cannot reference outer variables.
// Use vi.fn() inline and access the mock via the imported module.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
}));

import { revalidateTag } from "next/cache";
import {
  CACHE_DURATIONS,
  CACHE_TAGS,
  revalidatePriceData,
  revalidateAirlineData,
} from "@/lib/cache";

const mockRevalidateTag = vi.mocked(revalidateTag);

describe("cache module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CACHE_DURATIONS", () => {
    it("defines PRICES duration as 5 minutes (300 seconds)", () => {
      expect(CACHE_DURATIONS.PRICES).toBe(300);
    });

    it("defines AIRLINES duration as 1 hour (3600 seconds)", () => {
      expect(CACHE_DURATIONS.AIRLINES).toBe(3600);
    });

    it("defines HISTORY duration as 10 minutes (600 seconds)", () => {
      expect(CACHE_DURATIONS.HISTORY).toBe(600);
    });

    it("has longer cache for airlines than prices (rarely changes)", () => {
      expect(CACHE_DURATIONS.AIRLINES).toBeGreaterThan(CACHE_DURATIONS.PRICES);
    });

    it("has longer cache for history than prices", () => {
      expect(CACHE_DURATIONS.HISTORY).toBeGreaterThan(CACHE_DURATIONS.PRICES);
    });
  });

  describe("CACHE_TAGS", () => {
    it("defines all required tag constants", () => {
      expect(CACHE_TAGS.ROUTES).toBe("routes");
      expect(CACHE_TAGS.PRICES).toBe("prices");
      expect(CACHE_TAGS.DEALS).toBe("deals");
      expect(CACHE_TAGS.AIRLINES).toBe("airlines");
      expect(CACHE_TAGS.PRICE_HISTORY).toBe("price-history");
    });

    it("has 5 distinct cache tags", () => {
      const tags = Object.values(CACHE_TAGS);
      expect(tags).toHaveLength(5);
      expect(new Set(tags).size).toBe(5);
    });
  });

  describe("revalidatePriceData", () => {
    it("invalidates all price-related cache tags", () => {
      revalidatePriceData();

      expect(mockRevalidateTag).toHaveBeenCalledTimes(4);
      expect(mockRevalidateTag).toHaveBeenCalledWith("prices");
      expect(mockRevalidateTag).toHaveBeenCalledWith("deals");
      expect(mockRevalidateTag).toHaveBeenCalledWith("routes");
      expect(mockRevalidateTag).toHaveBeenCalledWith("price-history");
    });

    it("does not invalidate airlines tag", () => {
      revalidatePriceData();

      expect(mockRevalidateTag).not.toHaveBeenCalledWith("airlines");
    });
  });

  describe("revalidateAirlineData", () => {
    it("invalidates only the airlines cache tag", () => {
      revalidateAirlineData();

      expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
      expect(mockRevalidateTag).toHaveBeenCalledWith("airlines");
    });

    it("does not invalidate price-related tags", () => {
      revalidateAirlineData();

      expect(mockRevalidateTag).not.toHaveBeenCalledWith("prices");
      expect(mockRevalidateTag).not.toHaveBeenCalledWith("deals");
      expect(mockRevalidateTag).not.toHaveBeenCalledWith("routes");
      expect(mockRevalidateTag).not.toHaveBeenCalledWith("price-history");
    });
  });
});
