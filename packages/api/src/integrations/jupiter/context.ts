import { env } from "@fomo/env/server";
import { type Cache, createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.jup.ag";
// Jupiter's keyless tier is ~0.5 RPS; an API key raises it. The default assumes a key is set (env
// mandates JUPITER_API_KEY) — pass `requestsPerSecond: 0.5` when exercising the keyless tier.
const DEFAULT_RPS = 10;
const DEFAULT_CACHE_MAX = 500;

export interface JupiterClientOptions {
  apiKey?: string;
  baseUrl?: string;
  cacheMax?: number;
  fetch?: typeof fetch;
  requestsPerSecond?: number;
}

/** Internals shared by every method — one requester (fetch + limiter) and one cache, built once. */
export interface JupiterContext {
  cache: Cache;
  request: Requester;
}

export function createContext(
  options: JupiterClientOptions = {}
): JupiterContext {
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    apiKey: options.apiKey ?? env.JUPITER_API_KEY,
    baseUrl: options.baseUrl ?? BASE_URL,
    limiter,
  });
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  return { request, cache };
}
