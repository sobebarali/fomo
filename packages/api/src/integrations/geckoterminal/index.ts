import type { Candle, TokenSummary, Trade } from "../../schemas/token";
import { createContext, type GeckoTerminalClientOptions } from "./context";
import { makeOhlcv, type OhlcvInput } from "./methods/ohlcv";
import { makeTrades, type TradesInput } from "./methods/trades";
import { makeTrending, type TrendingInput } from "./methods/trending";

export interface GeckoTerminalClient {
  ohlcv(input: OhlcvInput): Promise<Candle[]>;
  trades(input: TradesInput): Promise<Trade[]>;
  trending(input: TrendingInput): Promise<TokenSummary[]>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createGeckoTerminalClient(
  options?: GeckoTerminalClientOptions
): GeckoTerminalClient {
  const ctx = createContext(options);
  return {
    trending: makeTrending(ctx),
    ohlcv: makeOhlcv(ctx),
    trades: makeTrades(ctx),
  };
}

/** The single shared instance — one cache, one rate-limiter. Keyless. */
export const geckoterminal = createGeckoTerminalClient();
