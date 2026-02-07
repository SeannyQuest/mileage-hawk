// ==========================================
// Auth Utilities
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Get the current user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Validate that a request carries the correct CRON_SECRET.
 * Used to protect /api/cron/* endpoints.
 */
export function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[Auth] CRON_SECRET not configured — blocking cron request");
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check query param (Vercel Cron uses this)
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (secret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Return a 401 JSON response for unauthorized requests.
 */
export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized", message },
    { status: 401 }
  );
}

/**
 * Return a 403 JSON response for forbidden requests.
 */
export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return NextResponse.json(
    { error: "Forbidden", message },
    { status: 403 }
  );
}

/**
 * Return a 429 JSON response for rate-limited requests.
 */
export function rateLimitedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Too Many Requests", message: `Rate limit exceeded. Retry after ${retryAfterSec}s.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
