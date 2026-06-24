import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Cache } from "./cache";
import type { Limiter } from "./limiter";

interface RedisClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options: { ex: number }): Promise<unknown>;
}

interface StoredEntry {
  freshUntil: number;
  value: unknown;
}

interface RedisCacheOptions {
  prefix: string;
  staleTtlMs?: number;
}

interface RedisLimiterOptions {
  prefix: string;
  requestsPerSecond: number;
  timeoutMs?: number;
}

const DEFAULT_STALE_TTL_MS = 5 * 60_000;
const DEFAULT_LIMITER_TIMEOUT_MS = 60_000;
const RATE_INTERVAL = "10 s";

const redisClients = new Map<string, Redis>();

function redisKey(prefix: string, key: string): string {
  return `fomo:${prefix}:${key}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRedisClient(url: string, token: string): Redis {
  const key = `${url}:${token}`;
  const existing = redisClients.get(key);
  if (existing) {
    return existing;
  }

  const redis = new Redis({ token, url });
  redisClients.set(key, redis);
  return redis;
}

export function createRedisCache(
  redis: RedisClient,
  options: RedisCacheOptions
): Cache {
  const pending = new Map<string, Promise<unknown>>();

  function fetchAndStore<T>(
    key: string,
    ttl: number,
    produce: () => Promise<T>
  ): Promise<T> {
    const existing = pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await produce();
        const staleTtlMs = options.staleTtlMs ?? DEFAULT_STALE_TTL_MS;
        const entry: StoredEntry = {
          freshUntil: Date.now() + ttl,
          value,
        };
        await redis
          .set(key, entry, { ex: Math.ceil((ttl + staleTtlMs) / 1000) })
          .catch(() => undefined);
        return value;
      } finally {
        pending.delete(key);
      }
    })();

    pending.set(key, promise);
    return promise;
  }

  return {
    async wrap<T>(key: string, ttl: number, produce: () => Promise<T>) {
      const keyWithPrefix = redisKey(options.prefix, key);
      const entry = await redis
        .get<StoredEntry>(keyWithPrefix)
        .catch(() => null);

      if (entry) {
        if (entry.freshUntil < Date.now()) {
          fetchAndStore(keyWithPrefix, ttl, produce).catch(() => undefined);
        }
        return entry.value as T;
      }

      return fetchAndStore(keyWithPrefix, ttl, produce);
    },
  };
}

export function createRedisLimiter(
  redis: Redis,
  options: RedisLimiterOptions
): Limiter {
  const refillRate = Math.max(1, Math.round(options.requestsPerSecond * 10));
  const maxTokens = Math.max(1, Math.ceil(options.requestsPerSecond));
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(refillRate, RATE_INTERVAL, maxTokens),
    prefix: `fomo:${options.prefix}:limit`,
  });
  const timeoutMs = options.timeoutMs ?? DEFAULT_LIMITER_TIMEOUT_MS;

  return {
    async take() {
      for (;;) {
        const result = await ratelimit.limit("global");
        if (result.success) {
          return;
        }

        await sleep(
          Math.min(Math.max(result.reset - Date.now(), 250), timeoutMs)
        );
      }
    },
  };
}
