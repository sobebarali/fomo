import { z } from "zod";

/**
 * Shared view types the client returns — the routers (`tokens` / `chart` / `holders` / `trades` /
 * `portfolio`) import these. Each endpoint's raw upstream schema + normalizer lives in its own
 * `methods/<name>.ts`; only the cross-method shapes live here. Promote to `src/schemas/token.ts`
 * once a 2nd module needs them (per the tokens spec).
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

/** Every BirdEye response is `{ success, data }`. The transport validates this envelope generically;
 *  each method then validates `data` with its own schema. */
export const Envelope = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

export type Envelope = z.infer<typeof Envelope>;
