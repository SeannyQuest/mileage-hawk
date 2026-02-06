import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const config = { limit: 3, windowSec: 60 };
    const key = `test-allow-${Date.now()}`;

    const r1 = rateLimit(key, config);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, config);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, config);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const config = { limit: 2, windowSec: 60 };
    const key = `test-block-${Date.now()}`;

    rateLimit(key, config);
    rateLimit(key, config);

    const r3 = rateLimit(key, config);
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("uses separate windows for different keys", () => {
    const config = { limit: 1, windowSec: 60 };
    const key1 = `test-sep-a-${Date.now()}`;
    const key2 = `test-sep-b-${Date.now()}`;

    const r1 = rateLimit(key1, config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit(key2, config);
    expect(r2.success).toBe(true);

    const r3 = rateLimit(key1, config);
    expect(r3.success).toBe(false);
  });

  it("provides a resetAt timestamp in the future", () => {
    const config = { limit: 5, windowSec: 120 };
    const key = `test-reset-${Date.now()}`;

    const r = rateLimit(key, config);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });
});
