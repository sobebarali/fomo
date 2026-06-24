import { env } from "@fomo/env/server";
import type { Cache } from "../_shared/cache";
import type { Limiter } from "../_shared/limiter";
import {
  createRedisCache,
  createRedisClient,
  createRedisLimiter,
} from "../_shared/redis";
import { createRequester, type Requester } from "./request";

// Alchemy free tier = 500 CU/s throughput; our JSON-RPC calls cost ~10 CU each, so ~25 rps is the
// advertised free ceiling (alchemy.com/pricing). Pass `requestsPerSecond` to raise on a paid plan.
const DEFAULT_RPS = 25;

export interface AlchemyClientOptions {
  cache?: Cache;
  fetch?: typeof fetch;
  limiter?: Limiter;
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
  const requestsPerSecond = options.requestsPerSecond ?? DEFAULT_RPS;
  const redis = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );
  const limiter =
    options.limiter ??
    createRedisLimiter(redis, {
      prefix: "alchemy",
      requestsPerSecond,
    });
  const request = createRequester({
    fetch: options.fetch ?? globalThis.fetch,
    rpcUrl: options.rpcUrl ?? env.ALCHEMY_RPC_URL,
    limiter,
  });
  const cache = options.cache ?? createRedisCache(redis, { prefix: "alchemy" });
  return { request, cache };
}
