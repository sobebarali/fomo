import { env } from "@fomo/env/server";
import type { Cache } from "../_shared/cache";
import type { Limiter } from "../_shared/limiter";
import {
  createRedisCache,
  createRedisClient,
  createRedisLimiter,
} from "../_shared/redis";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.dexscreener.com";
// DexScreener free + keyless = 60 req/min on the token endpoints (docs.dexscreener.com/api/reference).
// 1 rps is the safe floor; the SWR cache absorbs the rest.
const DEFAULT_RPS = 1;

export interface DexScreenerClientOptions {
  baseUrl?: string;
  cache?: Cache;
  fetch?: typeof fetch;
  limiter?: Limiter;
  requestsPerSecond?: number;
}

/** Internals shared by every method — one requester (fetch + limiter) and one cache, built once. */
export interface DexScreenerContext {
  cache: Cache;
  request: Requester;
}

export function createContext(
  options: DexScreenerClientOptions = {}
): DexScreenerContext {
  const requestsPerSecond = options.requestsPerSecond ?? DEFAULT_RPS;
  const redis = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );
  const limiter =
    options.limiter ??
    createRedisLimiter(redis, {
      prefix: "dexscreener",
      requestsPerSecond,
    });
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    baseUrl: options.baseUrl ?? env.DEXSCREENER_BASE_URL ?? BASE_URL,
    limiter,
  });
  const cache =
    options.cache ?? createRedisCache(redis, { prefix: "dexscreener" });
  return { request, cache };
}
