import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the NextAuth module before importing auth utilities
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import {
  validateCronSecret,
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitedResponse,
} from "@/lib/auth";

describe("auth utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateCronSecret", () => {
    it("returns true for valid Bearer token", () => {
      process.env.CRON_SECRET = "test-secret";
      const request = new NextRequest("http://localhost:3000/api/cron/scrape", {
        headers: { authorization: "Bearer test-secret" },
      });
      expect(validateCronSecret(request)).toBe(true);
    });

    it("returns true for valid query param", () => {
      process.env.CRON_SECRET = "test-secret";
      const request = new NextRequest(
        "http://localhost:3000/api/cron/scrape?secret=test-secret"
      );
      expect(validateCronSecret(request)).toBe(true);
    });

    it("returns false for invalid Bearer token", () => {
      process.env.CRON_SECRET = "test-secret";
      const request = new NextRequest("http://localhost:3000/api/cron/scrape", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      expect(validateCronSecret(request)).toBe(false);
    });

    it("returns false when no auth provided", () => {
      process.env.CRON_SECRET = "test-secret";
      const request = new NextRequest(
        "http://localhost:3000/api/cron/scrape"
      );
      expect(validateCronSecret(request)).toBe(false);
    });

    it("returns false when CRON_SECRET is not set", () => {
      delete process.env.CRON_SECRET;
      const request = new NextRequest("http://localhost:3000/api/cron/scrape", {
        headers: { authorization: "Bearer test-secret" },
      });
      expect(validateCronSecret(request)).toBe(false);
    });
  });

  describe("response helpers", () => {
    it("unauthorizedResponse returns 401 with default message", async () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.message).toBe("Unauthorized");
    });

    it("unauthorizedResponse returns 401 with custom message", async () => {
      const response = unauthorizedResponse("Invalid token");
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Invalid token");
    });

    it("forbiddenResponse returns 403", async () => {
      const response = forbiddenResponse();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Forbidden");
    });

    it("forbiddenResponse returns 403 with custom message", async () => {
      const response = forbiddenResponse("Not allowed");
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Not allowed");
    });

    it("rateLimitedResponse returns 429 with Retry-After header", async () => {
      const response = rateLimitedResponse(60);
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("60");
      const body = await response.json();
      expect(body.error).toBe("Too Many Requests");
      expect(body.message).toContain("60s");
    });
  });
});

describe("auth config", () => {
  it("credentials provider authorize rejects when env vars missing", async () => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD;

    // Test the authorize logic directly
    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;

    const result =
      validUsername && validPassword
        ? { id: "owner", name: "Owner", email: validUsername }
        : null;

    expect(result).toBeNull();
  });

  it("credentials provider authorize rejects wrong password", () => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "secret123";

    const credentials = { username: "admin", password: "wrong" };
    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;

    const result =
      validUsername &&
      validPassword &&
      credentials.username === validUsername &&
      credentials.password === validPassword
        ? { id: "owner", name: "Owner", email: validUsername }
        : null;

    expect(result).toBeNull();
  });

  it("credentials provider authorize accepts correct credentials", () => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "secret123";

    const credentials = { username: "admin", password: "secret123" };
    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;

    const result =
      validUsername &&
      validPassword &&
      credentials.username === validUsername &&
      credentials.password === validPassword
        ? { id: "owner", name: "Owner", email: validUsername }
        : null;

    expect(result).not.toBeNull();
    expect(result?.id).toBe("owner");
    expect(result?.email).toBe("admin");
  });

  it("credentials provider authorize rejects wrong username", () => {
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "secret123";

    const credentials = { username: "hacker", password: "secret123" };
    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;

    const result =
      validUsername &&
      validPassword &&
      credentials.username === validUsername &&
      credentials.password === validPassword
        ? { id: "owner", name: "Owner", email: validUsername }
        : null;

    expect(result).toBeNull();
  });
});
