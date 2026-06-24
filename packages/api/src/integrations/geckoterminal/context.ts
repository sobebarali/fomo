import { env } from "@fomo/env/server";
import type { Cache } from "../_shared/cache";
import type { Limiter } from "../_shared/limiter";
import {
  createRedisCache,
  createRedisClient,
  createRedisLimiter,
} from "../_shared/redis";
import { createRequester, type Requester } from "./request";

const BASE_URL = "https://api.geckoterminal.com/api/v2";
// GeckoTerminal free + keyless = ~30 req/min (apiguide.geckoterminal.com/faq). 0.4 rps is a hard
// safety ceiling (~24/min); the SWR cache + the single background poller are the real throttle.
const DEFAULT_RPS = 0.4;

export interface GeckoTerminalClientOptions {
  baseUrl?: string;
  cache?: Cache;
  fetch?: typeof fetch;
  limiter?: Limiter;
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
  const requestsPerSecond = options.requestsPerSecond ?? DEFAULT_RPS;
  const redis = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );
  const limiter =
    options.limiter ??
    createRedisLimiter(redis, {
      prefix: "geckoterminal",
      requestsPerSecond,
    });
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    baseUrl: options.baseUrl ?? env.GECKOTERMINAL_BASE_URL ?? BASE_URL,
    limiter,
  });
  const cache =
    options.cache ?? createRedisCache(redis, { prefix: "geckoterminal" });
  return { request, cache };
}
