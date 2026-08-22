/**
 * Simple in-memory rate limiter.
 *
 * For a single-instance dev server this is sufficient. In production this
 * should be replaced with a Redis/Upstash-backed limiter; the interface
 * is preserved so the swap is a one-file change.
 *
 * Master plan §86: rate limiting is mandatory.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limitPerMinute: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000;
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limitPerMinute - 1, resetAt };
  }
  existing.count += 1;
  if (existing.count > limitPerMinute) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  return {
    allowed: true,
    remaining: limitPerMinute - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Test-only — clear all buckets. */
export function __resetRateLimits() {
  buckets.clear();
}
