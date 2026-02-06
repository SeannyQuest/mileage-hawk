// ==========================================
// Simple in-memory rate limiter
// For production, use Redis-backed rate limiting (e.g., @upstash/ratelimit)
// ==========================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

interface RateLimitConfig {
  /** Max number of requests in the window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * Returns { success: true } if under limit, { success: false } if exceeded.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// ── Preset configs ──

export const API_RATE_LIMITS = {
  /** General API routes: 60 requests per minute */
  api: { limit: 60, windowSec: 60 } satisfies RateLimitConfig,
  /** Alert creation: 10 per minute */
  alertCreate: { limit: 10, windowSec: 60 } satisfies RateLimitConfig,
  /** Search: 30 per minute */
  search: { limit: 30, windowSec: 60 } satisfies RateLimitConfig,
  /** Cron endpoints: 5 per hour (from Vercel) */
  cron: { limit: 5, windowSec: 3600 } satisfies RateLimitConfig,
};

/**
 * Get a rate limit key from a Request object.
 * Uses X-Forwarded-For header (Vercel) or falls back to a static key.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}
