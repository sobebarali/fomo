import type {
  Candle,
  Holder,
  TokenDetail,
  TokenSummary,
  Trade,
  TrendingSort,
} from "../../schemas/token";
import { type AlchemyClient, alchemy } from "../alchemy";
import { type BirdEyeClient, birdeye } from "../birdeye";
import { type DexScreenerClient, dexscreener } from "../dexscreener";

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
  birdeye: Pick<BirdEyeClient, "ohlcv" | "trades" | "trending">;
  dexscreener: DexScreenerClient;
}

const DEFAULT_DEPS: MarketDeps = { alchemy, birdeye, dexscreener };

/** Compose the working data sources into one market-data client:
 *  - token (price/mc/vol/liq/logo/links) → DexScreener (free, no CU) + Alchemy `getTokenSupply`
 *  - holders → Alchemy RPC (top largest accounts → owners)
 *  - trending / ohlcv / trades → BirdEye. GeckoTerminal (the intended free source for these) is
 *    **blocked from datacenter IPs** (Railway) so it 500s in prod; until a datacenter-friendly free
 *    source lands, these stay on BirdEye — its heaviest consumer (`token`) moved to DexScreener, so
 *    CU usage is a fraction of before. */
export function createMarketClient(
  deps: MarketDeps = DEFAULT_DEPS
): MarketClient {
  return {
    trending: (input) => deps.birdeye.trending(input),
    ohlcv: (input) => deps.birdeye.ohlcv(input),
    trades: (input) => deps.birdeye.trades(input),
    holders: (input) => deps.alchemy.holders(input),
    token: async (input) => {
      const [base, totalSupply] = await Promise.all([
        deps.dexscreener.token(input),
        // Supply is enrichment, not the critical path — a failure degrades to 0, never fails the read.
        deps.alchemy.getTokenSupply(input).catch(() => 0),
      ]);
      return base ? { ...base, totalSupply } : null;
    },
  };
}

/** The single shared instance routers import. */
export const market = createMarketClient();
