import { env } from "@fomo/env/server";
import type { Cache } from "../_shared/cache";
import type { Limiter } from "../_shared/limiter";
import {
  createRedisCache,
  createRedisClient,
  createRedisLimiter,
} from "../_shared/redis";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://public-api.birdeye.so";
// BirdEye Standard (free) = 1 rps per account across all APIs (docs.birdeye.so/docs/rate-limiting).
// Pass `requestsPerSecond` to raise it on a paid plan (Lite/Starter = 15, Premium = 50).
const DEFAULT_RPS = 1;

export interface BirdEyeClientOptions {
  apiKey?: string;
  baseUrl?: string;
  cache?: Cache;
  fetch?: typeof fetch;
  limiter?: Limiter;
  requestsPerSecond?: number;
}

/** Internals shared by every method — one requester (fetch + limiter) and one cache, built once. */
export interface BirdEyeContext {
  cache: Cache;
  request: Requester;
}

export function createContext(
  options: BirdEyeClientOptions = {}
): BirdEyeContext {
  const requestsPerSecond = options.requestsPerSecond ?? DEFAULT_RPS;
  const redis = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );
  const limiter =
    options.limiter ??
    createRedisLimiter(redis, {
      prefix: "birdeye",
      requestsPerSecond,
    });
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    apiKey: options.apiKey ?? env.BIRDEYE_API_KEY,
    baseUrl: options.baseUrl ?? BASE_URL,
    limiter,
  });
  const cache = options.cache ?? createRedisCache(redis, { prefix: "birdeye" });
  return { request, cache };
}
