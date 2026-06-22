import { type BirdEyeClientOptions, createContext } from "./context";
import { type HoldersInput, makeHolders } from "./methods/holders";
import { makeOhlcv, type OhlcvInput } from "./methods/ohlcv";
import { makePrices, type PricesInput } from "./methods/prices";
import { makeToken, type TokenInput } from "./methods/token";
import { makeTrades, type TradesInput } from "./methods/trades";
import { makeTrending, type TrendingInput } from "./methods/trending";
import type {
  Candle,
  Holder,
  TokenDetail,
  TokenSummary,
  Trade,
} from "./schema";

export interface BirdEyeClient {
  holders(input: HoldersInput): Promise<Holder[]>;
  ohlcv(input: OhlcvInput): Promise<Candle[]>;
  prices(input: PricesInput): Promise<Record<string, number>>;
  token(input: TokenInput): Promise<TokenDetail | null>;
  trades(input: TradesInput): Promise<Trade[]>;
  trending(input: TrendingInput): Promise<TokenSummary[]>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createBirdEyeClient(
  options?: BirdEyeClientOptions
): BirdEyeClient {
  const ctx = createContext(options);
  return {
    trending: makeTrending(ctx),
    token: makeToken(ctx),
    ohlcv: makeOhlcv(ctx),
    holders: makeHolders(ctx),
    trades: makeTrades(ctx),
    prices: makePrices(ctx),
  };
}

/** The single shared instance routers import — one cache, one rate-limiter, key from env. */
export const birdeye = createBirdEyeClient();
