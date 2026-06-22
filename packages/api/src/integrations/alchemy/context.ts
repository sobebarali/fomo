import { env } from "@fomo/env/server";
import { type Cache, createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createRequester, type Requester } from "./request";

// Alchemy free tier = 500 CU/s throughput; our JSON-RPC calls cost ~10 CU each, so ~25 rps is the
// advertised free ceiling (alchemy.com/pricing). Pass `requestsPerSecond` to raise on a paid plan.
const DEFAULT_RPS = 25;
const DEFAULT_CACHE_MAX = 500;

export interface AlchemyClientOptions {
  cacheMax?: number;
  fetch?: typeof fetch;
  requestsPerSecond?: number;
  rpcUrl?: string;
}

/** Internals shared by every method — one requester (fetch + limiter) and one cache, built once. */
export interface AlchemyContext {
  cache: Cache;
  request: Requester;
}

export function createContext(
  options: AlchemyClientOptions = {}
): AlchemyContext {
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    rpcUrl: options.rpcUrl ?? env.ALCHEMY_RPC_URL,
    limiter,
  });
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  return { request, cache };
}
