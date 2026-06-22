import { env } from "@fomo/env/server";
import { type Cache, createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://public-api.birdeye.so";
// BirdEye Standard (free) = 1 rps per account across all APIs (docs.birdeye.so/docs/rate-limiting).
// Pass `requestsPerSecond` to raise it on a paid plan (Lite/Starter = 15, Premium = 50).
const DEFAULT_RPS = 1;
const DEFAULT_CACHE_MAX = 500;

export interface BirdEyeClientOptions {
  apiKey?: string;
  baseUrl?: string;
  cacheMax?: number;
  fetch?: typeof fetch;
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
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    apiKey: options.apiKey ?? env.BIRDEYE_API_KEY,
    baseUrl: options.baseUrl ?? BASE_URL,
    limiter,
  });
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  return { request, cache };
}
