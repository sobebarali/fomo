/**
 * Provider-neutral market-data view types. The routers (`tokens` / `chart` / `holders` / `trades` /
 * `portfolio`) and every integration that serves market data (BirdEye, DexScreener, GeckoTerminal,
 * Alchemy) produce/consume these exact shapes, so a provider can be swapped without touching routers.
 * Each integration's raw upstream schema + normalizer lives in its own `methods/<name>.ts`.
 */
export interface TokenSummary {
  address: string;
  change24h: number;
  logoUri: string | null;
  marketCap: number;
  name: string;
  priceUsd: number;
  symbol: string;
  volume24h: number;
}

export interface TokenDetail extends TokenSummary {
  description: string | null;
  holders: number;
  links: { website?: string; twitter?: string };
  liquidity: number;
  totalSupply: number;
}

export interface Candle {
  close: number;
  high: number;
  low: number;
  open: number;
  time: number;
  volume: number;
}

export interface Holder {
  address: string;
  amount: number;
}

export interface Trade {
  amount: number;
  blockUnixTime: number;
  owner: string;
  priceUsd: number;
  side: "buy" | "sell";
  txHash: string;
}

export type TrendingSort = "trending" | "gainers" | "new";
