import { env } from "@fomo/env/server";
import { type Cache, createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.geckoterminal.com/api/v2";
// GeckoTerminal free + keyless = ~30 req/min (apiguide.geckoterminal.com/faq). 0.4 rps is a hard
// safety ceiling (~24/min); the SWR cache + the single background poller are the real throttle.
const DEFAULT_RPS = 0.4;
const DEFAULT_CACHE_MAX = 500;

export interface GeckoTerminalClientOptions {
  baseUrl?: string;
  cacheMax?: number;
  fetch?: typeof fetch;
  requestsPerSecond?: number;
}

/** Internals shared by every method — one requester (fetch + limiter) and one cache, built once. */
export interface GeckoTerminalContext {
  cache: Cache;
  request: Requester;
}

export function createContext(
  options: GeckoTerminalClientOptions = {}
): GeckoTerminalContext {
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    baseUrl: options.baseUrl ?? env.GECKOTERMINAL_BASE_URL ?? BASE_URL,
    limiter,
  });
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  return { request, cache };
}
