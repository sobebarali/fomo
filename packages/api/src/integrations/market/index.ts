import type {
  Candle,
  Holder,
  TokenDetail,
  TokenSummary,
  Trade,
  TrendingSort,
} from "../../schemas/token";
import { RateLimitError, UpstreamError } from "../_shared/errors";
import { type AlchemyClient, alchemy } from "../alchemy";
import { type BirdEyeClient, birdeye } from "../birdeye";
import { type DexScreenerClient, dexscreener } from "../dexscreener";
import { type GeckoTerminalClient, geckoterminal } from "../geckoterminal";

export interface TrendingInput {
  limit: number;
  offset: number;
  sort: TrendingSort;
}
export interface TokenInput {
  address: string;
}
export interface OhlcvInput {
  address: string;
  from: number;
  interval: string;
  to: number;
}
export interface HoldersInput {
  address: string;
  limit: number;
}
export interface TradesInput {
  address: string;
  limit: number;
}

/** Same method surface the routers used to call on `birdeye` — so swapping `birdeye` → `market` is a
 *  one-line import change per router. Returns identical view types and throws the same `_shared`
 *  `RateLimitError`/`UpstreamError`, so the routers' error mapping is unchanged. */
export interface MarketClient {
  holders(input: HoldersInput): Promise<Holder[]>;
  ohlcv(input: OhlcvInput): Promise<Candle[]>;
  token(input: TokenInput): Promise<TokenDetail | null>;
  trades(input: TradesInput): Promise<Trade[]>;
  trending(input: TrendingInput): Promise<TokenSummary[]>;
}

export interface MarketDeps {
  alchemy: Pick<AlchemyClient, "getTokenSupply" | "holders">;
  birdeye: Pick<
    BirdEyeClient,
    "holders" | "ohlcv" | "token" | "trades" | "trending"
  >;
  dexscreener: DexScreenerClient;
  geckoterminal: GeckoTerminalClient;
}

const DEFAULT_DEPS: MarketDeps = {
  alchemy,
  birdeye,
  dexscreener,
  geckoterminal,
};
const HEDGE_DELAY_MS = 1200;

function isProviderFailure(err: unknown): boolean {
  return err instanceof RateLimitError || err instanceof UpstreamError;
}

async function cascade<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (isProviderFailure(err)) {
      return fallback();
    }
    throw err;
  }
}

async function cascadeArray<T>(
  primary: () => Promise<T[]>,
  fallback: () => Promise<T[]>
): Promise<T[]> {
  let result: T[];
  try {
    result = await primary();
  } catch (err) {
    if (isProviderFailure(err)) {
      return fallback();
    }
    throw err;
  }
  return result.length > 0 ? result : fallback();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function hedgedArray<T>(
  primary: () => Promise<T[]>,
  fallback: () => Promise<T[]>
): Promise<T[]> {
  const primaryPromise = primary();
  let fallbackPromise: Promise<T[]> | null = null;
  const runFallback = () => {
    fallbackPromise ??= fallback();
    return fallbackPromise;
  };
  const first = await Promise.race([
    primaryPromise.then(
      (value) => ({ source: "primary" as const, value }),
      (error: unknown) => ({ error, source: "primary" as const })
    ),
    delay(HEDGE_DELAY_MS)
      .then(runFallback)
      .then(
        (value) => ({ source: "fallback" as const, value }),
        (error: unknown) => ({ error, source: "fallback" as const })
      ),
  ]);

  if ("value" in first) {
    if (first.value.length > 0 || first.source === "fallback") {
      return first.value;
    }
    return runFallback();
  }

  if (first.source === "primary") {
    if (isProviderFailure(first.error)) {
      return runFallback();
    }
    throw first.error;
  }

  try {
    const primaryResult = await primaryPromise;
    if (primaryResult.length > 0) {
      return primaryResult;
    }
    throw first.error;
  } catch {
    throw first.error;
  }
}

/** Compose market-data sources into one client:
 *  - BirdEye is primary for token, trending, OHLCV, trades, and holders
 *  - keyless/free sources cascade when BirdEye is rate-limited, down, or empty */
export function createMarketClient(
  deps: MarketDeps = DEFAULT_DEPS
): MarketClient {
  async function fallbackToken(input: TokenInput): Promise<TokenDetail | null> {
    const [base, totalSupply] = await Promise.all([
      deps.dexscreener.token(input),
      // Supply is enrichment, not the critical path — a failure degrades to 0, never fails the read.
      deps.alchemy.getTokenSupply(input).catch(() => 0),
    ]);
    return base ? { ...base, totalSupply } : null;
  }

  return {
    trending: (input) =>
      cascadeArray(
        () => deps.birdeye.trending(input),
        () => deps.geckoterminal.trending(input)
      ),
    ohlcv: (input) =>
      hedgedArray(
        () => deps.birdeye.ohlcv(input),
        () => deps.geckoterminal.ohlcv(input)
      ),
    trades: (input) =>
      hedgedArray(
        () => deps.birdeye.trades(input),
        () => deps.geckoterminal.trades(input)
      ),
    holders: (input) =>
      cascadeArray(
        () => deps.birdeye.holders(input),
        () => deps.alchemy.holders(input)
      ),
    token: async (input) => {
      const result = await cascade(
        () => deps.birdeye.token(input),
        () => fallbackToken(input)
      );
      return result ?? fallbackToken(input);
    },
  };
}

/** The single shared instance routers import. */
export const market = createMarketClient();
