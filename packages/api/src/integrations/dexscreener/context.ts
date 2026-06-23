import { env } from "@fomo/env/server";
import { type Cache, createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.dexscreener.com";
// DexScreener free + keyless = 60 req/min on the token endpoints (docs.dexscreener.com/api/reference).
// 1 rps is the safe floor; the SWR cache absorbs the rest.
const DEFAULT_RPS = 1;
const DEFAULT_CACHE_MAX = 500;

export interface DexScreenerClientOptions {
  baseUrl?: string;
  cacheMax?: number;
  fetch?: typeof fetch;
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
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    baseUrl: options.baseUrl ?? env.DEXSCREENER_BASE_URL ?? BASE_URL,
    limiter,
  });
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  return { request, cache };
}
