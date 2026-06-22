import { env } from "@fomo/env/server";
import { type Cache, createCache } from "./cache";
import { createLimiter } from "./limiter";
import { createRequester, type Requester } from "./request";

const DEFAULT_RPS = 10;
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
