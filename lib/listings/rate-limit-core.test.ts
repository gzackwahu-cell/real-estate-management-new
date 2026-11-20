import assert from "node:assert/strict";
import test from "node:test";

import { checkRateLimit, type RateLimitProvider } from "./rate-limit-core";

const WINDOW_MS = 10 * 60 * 1000;
const NOW = 1_700_000_000_000;
const RESET_AT = NOW + WINDOW_MS;

function testEnv(
  nodeEnv: NodeJS.ProcessEnv["NODE_ENV"],
  configured: boolean,
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: nodeEnv,
    ...(configured
      ? {
          UPSTASH_REDIS_REST_URL: "https://example.invalid",
          UPSTASH_REDIS_REST_TOKEN: "unit-test-placeholder-token",
        }
      : {}),
  };
}

function countingProvider(successCount: number) {
  let calls = 0;

  const provider: RateLimitProvider = {
    async limit() {
      calls += 1;
      return {
        success: calls <= successCount,
        reset: RESET_AT,
      };
    },
  };

  return { provider, get calls() { return calls; } };
}

test("allows requests below the shared limit and denies requests over it", async () => {
  const fake = countingProvider(2);
  const key = `shared:${NOW}:allowed`;
  const options = {
    env: testEnv("test", true),
    now: () => NOW,
    createProvider: () => fake.provider,
  };

  const first = await checkRateLimit(key, 2, WINDOW_MS, options);
  const second = await checkRateLimit(key, 2, WINDOW_MS, options);
  const third = await checkRateLimit(key, 2, WINDOW_MS, options);

  assert.deepEqual(first, { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(second, { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(third, { allowed: false, retryAfterSeconds: 600 });
  assert.equal(fake.calls, 3);
});

test("denies the request when the shared provider fails", async () => {
  let calls = 0;
  const provider: RateLimitProvider = {
    async limit() {
      calls += 1;
      throw new Error("Redis unavailable");
    },
  };

  const result = await checkRateLimit("shared:provider-failure", 3, WINDOW_MS, {
    env: testEnv("production", true),
    now: () => NOW,
    createProvider: () => provider,
  });

  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 600 });
  assert.equal(calls, 1);
});

test("does not treat an SDK timeout response as an allowed request", async () => {
  const provider: RateLimitProvider = {
    async limit() {
      return {
        success: true,
        reset: RESET_AT,
        reason: "timeout",
      };
    },
  };

  const result = await checkRateLimit("shared:timeout", 3, WINDOW_MS, {
    env: testEnv("production", true),
    now: () => NOW,
    createProvider: () => provider,
  });

  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 600 });
});

test("fails closed in production when shared configuration is missing", async () => {
  let providerCreated = false;

  const result = await checkRateLimit("shared:missing-config", 3, WINDOW_MS, {
    env: testEnv("production", false),
    now: () => NOW,
    createProvider: () => {
      providerCreated = true;
      return {
        async limit() {
          return { success: true, reset: RESET_AT };
        },
      };
    },
  });

  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 600 });
  assert.equal(providerCreated, false);
});

test("fails closed when only part of the shared configuration is present", async () => {
  const result = await checkRateLimit("shared:partial-config", 3, WINDOW_MS, {
    env: {
      NODE_ENV: "development",
      UPSTASH_REDIS_REST_URL: "https://example.invalid",
    },
    now: () => NOW,
  });

  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 600 });
});

test("uses an in-memory fallback only outside production when unconfigured", async () => {
  const key = `development:${NOW}:${Math.random()}`;
  const options = { env: testEnv("development", false), now: () => NOW };

  const first = await checkRateLimit(key, 1, WINDOW_MS, options);
  const second = await checkRateLimit(key, 1, WINDOW_MS, options);

  assert.deepEqual(first, { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(second, { allowed: false, retryAfterSeconds: 600 });
});
