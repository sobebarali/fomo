import { env } from "@fomo/env/server";
import type { Cache } from "../_shared/cache";
import type { Limiter } from "../_shared/limiter";
import {
  createRedisCache,
  createRedisClient,
  createRedisLimiter,
} from "../_shared/redis";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.jup.ag";
// Jupiter Free plan (with API key) = 1 rps; keyless = 0.5 rps (dev.jup.ag/docs/portal/rate-limits).
// Default assumes a Free key (env mandates JUPITER_API_KEY) — pass `requestsPerSecond: 0.5` for keyless,
// or 10 for the paid Developer tier. (/execute + /submit have separate buckets, not used here.)
const DEFAULT_RPS = 1;

export interface JupiterClientOptions {
  apiKey?: string;
  baseUrl?: string;
  cache?: Cache;
  fetch?: typeof fetch;
  limiter?: Limiter;
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
  const requestsPerSecond = options.requestsPerSecond ?? DEFAULT_RPS;
  const redis = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );
  const limiter =
    options.limiter ??
    createRedisLimiter(redis, {
      prefix: "jupiter",
      requestsPerSecond,
    });
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    apiKey: options.apiKey ?? env.JUPITER_API_KEY,
    baseUrl: options.baseUrl ?? BASE_URL,
    limiter,
  });
  const cache = options.cache ?? createRedisCache(redis, { prefix: "jupiter" });
  return { request, cache };
}
