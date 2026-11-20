import "server-only";

import { checkRateLimit as checkRateLimitCore } from "./rate-limit-core";

export type { RateLimitResult } from "./rate-limit-core";

/**
 * Server-only entry point for the shared public-form rate limiter.
 * The implementation lives in a separate module so it can be unit tested
 * without the Next.js server-only build condition.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  return checkRateLimitCore(key, limit, windowMs);
}
