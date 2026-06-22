import { env } from "@fomo/env/server";
import type { z } from "zod";
import {
  type Candle,
  Envelope,
  type Holder,
  HolderData,
  MultiPriceData,
  OhlcvData,
  OverviewData,
  type TokenDetail,
  type TokenSummary,
  type Trade,
  TradeData,
  TrendingData,
  type TrendingSort,
  toCandles,
  toHolders,
  toPrices,
  toTokenDetail,
  toTokenSummary,
  toTrades,
} from "./schema";

/** Thrown when BirdEye returns HTTP 429. Routers map this → `RATE_LIMITED`. */
export class RateLimitError extends Error {
  constructor(message = "BirdEye rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Thrown for any non-2xx (other than 429), transport failure, or malformed/invalid payload.
 *  Routers map this → `UPSTREAM_ERROR`. Messages never contain the API key. */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamError";
  }
}

const BASE_URL = "https://public-api.birdeye.so";
const DEFAULT_RPS = 10;
const DEFAULT_CACHE_MAX = 500;

const TTL = {
  trending: 15_000,
  token: 30_000,
  ohlcv: 300_000,
  holders: 30_000,
  trades: 5000,
  prices: 5000,
} as const;

// sort_by ∈ {rank, volumeUSD, liquidity} per BirdEye docs — "gainers"/"new" use the closest proxy.
const TRENDING_SORT: Record<TrendingSort, { by: string; type: string }> = {
  trending: { by: "rank", type: "asc" },
  gainers: { by: "volumeUSD", type: "desc" },
  new: { by: "liquidity", type: "desc" },
};

interface CacheEntry {
  expires: number;
  value: unknown;
}

// ponytail: bounded TTL Map (FIFO evict at cap) + token-bucket limiter, both in-memory and
// per-instance — adequate for Vercel serverless; swap for Upstash if a fleet-wide limit is needed.
function createCache(max: number) {
  const store = new Map<string, CacheEntry>();
  return {
    get(key: string): unknown {
      const entry = store.get(key);
      if (!entry) {
        return;
      }
      if (entry.expires < Date.now()) {
        store.delete(key);
        return;
      }
      return entry.value;
    },
    set(key: string, value: unknown, ttl: number): void {
      if (store.size >= max && !store.has(key)) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) {
          store.delete(oldest);
        }
      }
      store.set(key, { value, expires: Date.now() + ttl });
    },
  };
}

function createLimiter(rps: number) {
  const capacity = Math.max(1, rps);
  const queue: Array<() => void> = [];
  let tokens = capacity;
  let last = Date.now();

  function pump(): void {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * rps);
    last = now;
    while (tokens >= 1 && queue.length > 0) {
      tokens -= 1;
      queue.shift()?.();
    }
    if (queue.length > 0) {
      setTimeout(pump, Math.max(((1 - tokens) / rps) * 1000, 10));
    }
  }

  return {
    take(): Promise<void> {
      return new Promise<void>((resolve) => {
        queue.push(resolve);
        pump();
      });
    },
  };
}

export interface BirdEyeClientOptions {
  apiKey?: string;
  baseUrl?: string;
  cacheMax?: number;
  fetch?: typeof fetch;
  requestsPerSecond?: number;
}

export interface BirdEyeClient {
  holders(address: string, limit: number): Promise<Holder[]>;
  ohlcv(
    address: string,
    interval: string,
    range: { from: number; to: number }
  ): Promise<Candle[]>;
  prices(addresses: string[]): Promise<Record<string, number>>;
  token(address: string): Promise<TokenDetail | null>;
  trades(address: string, limit: number): Promise<Trade[]>;
  trending(args: {
    sort: TrendingSort;
    limit: number;
    offset: number;
  }): Promise<TokenSummary[]>;
}

export function createBirdEyeClient(
  options: BirdEyeClientOptions = {}
): BirdEyeClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const apiKey = options.apiKey ?? env.BIRDEYE_API_KEY;
  const baseUrl = options.baseUrl ?? BASE_URL;
  const limiter = createLimiter(options.requestsPerSecond ?? DEFAULT_RPS);
  const cache = createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);

  async function request(
    path: string,
    params: Record<string, string | number | undefined>
  ): Promise<z.infer<typeof Envelope>> {
    await limiter.take();
    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
          accept: "application/json",
        },
      });
    } catch (cause) {
      throw new UpstreamError("BirdEye request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`BirdEye responded ${response.status}`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      throw new UpstreamError("BirdEye returned invalid JSON", { cause });
    }

    const envelope = Envelope.safeParse(json);
    if (!envelope.success) {
      throw new UpstreamError("BirdEye returned an unexpected envelope");
    }
    return envelope.data;
  }

  function parse<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new UpstreamError("BirdEye payload failed validation", {
        cause: result.error,
      });
    }
    return result.data;
  }

  async function cached<T>(
    key: string,
    ttl: number,
    produce: () => Promise<T>
  ): Promise<T> {
    const hit = cache.get(key);
    if (hit !== undefined) {
      return hit as T;
    }
    const value = await produce();
    cache.set(key, value, ttl);
    return value;
  }

  return {
    trending({ sort, limit, offset }) {
      return cached(
        `trending:${sort}:${limit}:${offset}`,
        TTL.trending,
        async () => {
          const sortBy = TRENDING_SORT[sort];
          const envelope = await request("/defi/token_trending", {
            sort_by: sortBy.by,
            sort_type: sortBy.type,
            offset,
            limit,
          });
          if (!envelope.success) {
            throw new UpstreamError("BirdEye reported failure");
          }
          return parse(TrendingData, envelope.data).tokens.map(toTokenSummary);
        }
      );
    },

    token(address) {
      return cached(`token:${address}`, TTL.token, async () => {
        const envelope = await request("/defi/token_overview", { address });
        // ponytail: unknown mint → success:false or null data → null (router maps NOT_FOUND).
        if (!envelope.success || envelope.data == null) {
          return null;
        }
        return toTokenDetail(parse(OverviewData, envelope.data));
      });
    },

    ohlcv(address, interval, range) {
      return cached(
        `ohlcv:${address}:${interval}:${range.from}:${range.to}`,
        TTL.ohlcv,
        async () => {
          const envelope = await request("/defi/ohlcv", {
            address,
            type: interval,
            time_from: range.from,
            time_to: range.to,
          });
          if (!envelope.success) {
            throw new UpstreamError("BirdEye reported failure");
          }
          return toCandles(parse(OhlcvData, envelope.data));
        }
      );
    },

    holders(address, limit) {
      return cached(`holders:${address}:${limit}`, TTL.holders, async () => {
        const envelope = await request("/defi/v3/token/holder", {
          address,
          offset: 0,
          limit,
        });
        if (!envelope.success) {
          throw new UpstreamError("BirdEye reported failure");
        }
        return toHolders(parse(HolderData, envelope.data));
      });
    },

    trades(address, limit) {
      return cached(`trades:${address}:${limit}`, TTL.trades, async () => {
        const envelope = await request("/defi/txs/token", {
          address,
          offset: 0,
          limit,
          tx_type: "swap",
          sort_type: "desc",
        });
        if (!envelope.success) {
          throw new UpstreamError("BirdEye reported failure");
        }
        return toTrades(parse(TradeData, envelope.data));
      });
    },

    prices(addresses) {
      return cached(`prices:${addresses.join(",")}`, TTL.prices, async () => {
        const envelope = await request("/defi/multi_price", {
          list_address: addresses.join(","),
        });
        if (!envelope.success) {
          throw new UpstreamError("BirdEye reported failure");
        }
        return toPrices(parse(MultiPriceData, envelope.data));
      });
    },
  };
}

/** The single shared instance routers import — one cache, one rate-limiter, key from env. */
export const birdeye = createBirdEyeClient();
