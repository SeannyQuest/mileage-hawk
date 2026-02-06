import { describe, it, expect, vi } from "vitest";
import {
  getCurrentHourInTimezone,
  isHourInQuietRange,
  isInQuietHours,
} from "@/lib/services/quiet-hours";

describe("getCurrentHourInTimezone", () => {
  it("returns a valid hour (0-23) for a valid timezone", () => {
    const hour = getCurrentHourInTimezone("America/New_York");
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it("falls back to UTC and warns on invalid timezone", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hour = getCurrentHourInTimezone("Invalid/Timezone");
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timezone")
    );
    warnSpy.mockRestore();
  });
});

describe("isHourInQuietRange", () => {
  it("returns false when start === end (disabled)", () => {
    expect(isHourInQuietRange(12, 7, 7)).toBe(false);
  });

  // Midnight-wrapping range: 22→7
  it("returns true for hour inside midnight-wrap range (23)", () => {
    expect(isHourInQuietRange(23, 22, 7)).toBe(true);
  });

  it("returns true for hour inside midnight-wrap range (3)", () => {
    expect(isHourInQuietRange(3, 22, 7)).toBe(true);
  });

  it("returns false for hour outside midnight-wrap range (14)", () => {
    expect(isHourInQuietRange(14, 22, 7)).toBe(false);
  });

  it("returns true at start boundary of midnight-wrap range (22)", () => {
    expect(isHourInQuietRange(22, 22, 7)).toBe(true);
  });

  it("returns false at end boundary of midnight-wrap range (7)", () => {
    expect(isHourInQuietRange(7, 22, 7)).toBe(false);
  });

  // Normal range: 1→6
  it("returns true for hour inside normal range (3)", () => {
    expect(isHourInQuietRange(3, 1, 6)).toBe(true);
  });

  it("returns false for hour outside normal range (14)", () => {
    expect(isHourInQuietRange(14, 1, 6)).toBe(false);
  });

  it("returns true at start boundary of normal range (1)", () => {
    expect(isHourInQuietRange(1, 1, 6)).toBe(true);
  });

  it("returns false at end boundary of normal range (6)", () => {
    expect(isHourInQuietRange(6, 1, 6)).toBe(false);
  });
});

describe("isInQuietHours", () => {
  it("returns false when timezone is null", () => {
    expect(isInQuietHours(null, 22, 7)).toBe(false);
  });

  it("returns false when quietHoursStart is null", () => {
    expect(isInQuietHours("America/Chicago", null, 7)).toBe(false);
  });

  it("returns false when quietHoursEnd is null", () => {
    expect(isInQuietHours("America/Chicago", 22, null)).toBe(false);
  });

  it("returns false when all fields are undefined", () => {
    expect(isInQuietHours(undefined, undefined, undefined)).toBe(false);
  });
});
