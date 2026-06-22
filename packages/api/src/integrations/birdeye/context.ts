import { env } from "@fomo/env/server";
import { type Cache, createCache } from "./cache";
import { createLimiter } from "./limiter";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://public-api.birdeye.so";
const DEFAULT_RPS = 10;
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
