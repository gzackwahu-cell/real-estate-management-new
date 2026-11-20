import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type ProviderResponse = {
  success: boolean;
  reset: number;
  reason?: string;
};

export type RateLimitProvider = {
  limit: (identifier: string) => Promise<ProviderResponse>;
};

type ProviderConfig = {
  url: string;
  token: string;
  limit: number;
  windowMs: number;
};

type RateLimitDependencies = {
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  createProvider?: (config: ProviderConfig) => RateLimitProvider;
};

type InMemoryBucket = {
  count: number;
  resetAt: number;
};

type InMemoryStore = Map<string, InMemoryBucket>;

const RATE_LIMIT_PREFIX = "danwell:public-forms";
const MAX_IN_MEMORY_KEYS = 1000;

const globalWithRateLimit = globalThis as typeof globalThis & {
  __danwellDevelopmentRateLimit?: InMemoryStore;
};

const developmentStore: InMemoryStore =
  globalWithRateLimit.__danwellDevelopmentRateLimit ?? new Map();

globalWithRateLimit.__danwellDevelopmentRateLimit = developmentStore;

let redisClient: Redis | undefined;
let redisCredentials: { url: string; token: string } | undefined;
const providerCache = new Map<string, RateLimitProvider>();

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

function fallbackRetryAfter(windowMs: number): number {
  return Math.max(1, Math.ceil(windowMs / 1000));
}

function denied(windowMs: number): RateLimitResult {
  return { allowed: false, retryAfterSeconds: fallbackRetryAfter(windowMs) };
}

function retryAfterFromReset(
  reset: number,
  now: number,
  windowMs: number,
): number {
  if (!Number.isFinite(reset)) {
    return fallbackRetryAfter(windowMs);
  }

  return Math.max(1, Math.ceil((reset - now) / 1000));
}

function getRedisClient(url: string, token: string): Redis {
  if (
    !redisClient ||
    !redisCredentials ||
    redisCredentials.url !== url ||
    redisCredentials.token !== token
  ) {
    redisClient = new Redis({ url, token });
    redisCredentials = { url, token };
    providerCache.clear();
  }

  return redisClient;
}

function createUpstashProvider(config: ProviderConfig): RateLimitProvider {
  const redis = getRedisClient(config.url, config.token);

  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(
      config.limit,
      `${config.windowMs} ms` as Duration,
    ),
    prefix: RATE_LIMIT_PREFIX,
    // The SDK's default 5s timeout resolves success: true, which would be an
    // insecure fail-open path. A zero timeout lets provider errors be caught.
    timeout: 0,
    analytics: false,
    enableProtection: false,
    ephemeralCache: false,
  });
}

function getUpstashProvider(config: ProviderConfig): RateLimitProvider {
  const cacheKey = `${config.limit}:${config.windowMs}`;
  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const provider = createUpstashProvider(config);
  providerCache.set(cacheKey, provider);
  return provider;
}

function checkDevelopmentRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  if (developmentStore.size > MAX_IN_MEMORY_KEYS) {
    for (const [storedKey, bucket] of developmentStore) {
      if (bucket.resetAt <= now) {
        developmentStore.delete(storedKey);
      }
    }
  }

  const bucket = developmentStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    developmentStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      ),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function hasValidRule(limit: number, windowMs: number): boolean {
  return (
    Number.isInteger(limit) && limit > 0 && windowMs > 0 && Number.isFinite(windowMs)
  );
}

/**
 * Checks a public-form rate limit against shared Upstash Redis state.
 *
 * Production requires both UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN. Missing configuration or a provider error denies
 * the request. When no Upstash configuration is present outside production,
 * a clearly scoped in-memory fallback keeps local development usable.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  dependencies: RateLimitDependencies = {},
): Promise<RateLimitResult> {
  const env = dependencies.env ?? process.env;
  const now = (dependencies.now ?? Date.now)();
  const url = env.UPSTASH_REDIS_REST_URL?.trim() || undefined;
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() || undefined;
  const hasUrl = url !== undefined;
  const hasToken = token !== undefined;

  if (!hasUrl && !hasToken) {
    if (isProduction(env) || !hasValidRule(limit, windowMs)) {
      return denied(windowMs);
    }

    return checkDevelopmentRateLimit(key, limit, windowMs, now);
  }

  if (!url || !token || !hasValidRule(limit, windowMs)) {
    return denied(windowMs);
  }

  try {
    const provider = dependencies.createProvider
      ? dependencies.createProvider({ url, token, limit, windowMs })
      : getUpstashProvider({ url, token, limit, windowMs });
    const response = await provider.limit(key);
    const retryAfterSeconds = retryAfterFromReset(
      response.reset,
      now,
      windowMs,
    );

    if (!response.success || response.reason || !Number.isFinite(response.reset)) {
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return denied(windowMs);
  }
}
