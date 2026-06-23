import type {
  Candle,
  Holder,
  TokenDetail,
  TokenSummary,
  Trade,
  TrendingSort,
} from "../../schemas/token";
import { type AlchemyClient, alchemy } from "../alchemy";
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
  dexscreener: DexScreenerClient;
  geckoterminal: GeckoTerminalClient;
}

const DEFAULT_DEPS: MarketDeps = { alchemy, dexscreener, geckoterminal };

/** Compose the free, non-CU sources into one market-data client:
 *  - trending / ohlcv / trades → GeckoTerminal (keyless)
 *  - token (price/mc/vol/liq/logo/links) → DexScreener, enriched with `totalSupply` from Alchemy RPC
 *  - holders → Alchemy RPC (top largest accounts → owners) */
export function createMarketClient(
  deps: MarketDeps = DEFAULT_DEPS
): MarketClient {
  return {
    trending: (input) => deps.geckoterminal.trending(input),
    ohlcv: (input) => deps.geckoterminal.ohlcv(input),
    trades: (input) => deps.geckoterminal.trades(input),
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
