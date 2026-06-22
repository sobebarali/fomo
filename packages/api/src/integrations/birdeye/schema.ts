import { z } from "zod";

/**
 * View types the client returns. These feed the `tokens` / `chart` / `holders` / `trades` /
 * `portfolio` routers, so they live here until a 2nd router needs them — then promote to
 * `src/schemas/token.ts` (per the tokens spec). Raw upstream field names are validated by the
 * Zod schemas below and mapped here, so the rest of the codebase never sees BirdEye's shape.
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

/**
 * Every BirdEye response is wrapped as `{ success, data }`. We validate the envelope generically,
 * then validate `data` with the per-endpoint schema below. `z.object` strips unknown keys, so extra
 * BirdEye fields never break parsing — we only model what we read.
 */
export const Envelope = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

// --- /defi/token_trending → data.tokens[] ------------------------------------
const RawTrendingToken = z.object({
  address: z.string(),
  symbol: z.string().nullish(),
  name: z.string().nullish(),
  logoURI: z.string().nullish(),
  price: z.number().nullish(),
  price24hChangePercent: z.number().nullish(),
  volume24hUSD: z.number().nullish(),
  marketcap: z.number().nullish(),
});

export const TrendingData = z.object({
  tokens: z.array(RawTrendingToken),
});

export function toTokenSummary(
  raw: z.infer<typeof RawTrendingToken>
): TokenSummary {
  return {
    address: raw.address,
    symbol: raw.symbol ?? "",
    name: raw.name ?? "",
    logoUri: raw.logoURI ?? null,
    priceUsd: raw.price ?? 0,
    change24h: raw.price24hChangePercent ?? 0,
    volume24h: raw.volume24hUSD ?? 0,
    marketCap: raw.marketcap ?? 0,
  };
}

// --- /defi/token_overview → data ---------------------------------------------
// ponytail: token_overview names diverge from token_trending (priceChange24hPercent vs
// price24hChangePercent, v24hUSD vs volume24hUSD, marketCap/mc vs marketcap) — modeled separately.
export const OverviewData = z.object({
  address: z.string(),
  symbol: z.string().nullish(),
  name: z.string().nullish(),
  logoURI: z.string().nullish(),
  price: z.number().nullish(),
  priceChange24hPercent: z.number().nullish(),
  v24hUSD: z.number().nullish(),
  marketCap: z.number().nullish(),
  mc: z.number().nullish(),
  liquidity: z.number().nullish(),
  holder: z.number().nullish(),
  totalSupply: z.number().nullish(),
  supply: z.number().nullish(),
  extensions: z
    .object({
      website: z.string().nullish(),
      twitter: z.string().nullish(),
      description: z.string().nullish(),
    })
    .nullish(),
});

export function toTokenDetail(raw: z.infer<typeof OverviewData>): TokenDetail {
  const links: { website?: string; twitter?: string } = {};
  if (raw.extensions?.website) {
    links.website = raw.extensions.website;
  }
  if (raw.extensions?.twitter) {
    links.twitter = raw.extensions.twitter;
  }
  return {
    address: raw.address,
    symbol: raw.symbol ?? "",
    name: raw.name ?? "",
    logoUri: raw.logoURI ?? null,
    priceUsd: raw.price ?? 0,
    change24h: raw.priceChange24hPercent ?? 0,
    volume24h: raw.v24hUSD ?? 0,
    marketCap: raw.marketCap ?? raw.mc ?? 0,
    liquidity: raw.liquidity ?? 0,
    holders: raw.holder ?? 0,
    totalSupply: raw.totalSupply ?? raw.supply ?? 0,
    description: raw.extensions?.description ?? null,
    links,
  };
}

// --- /defi/ohlcv → data.items[] ----------------------------------------------
export const OhlcvData = z.object({
  items: z.array(
    z.object({
      unixTime: z.number(),
      o: z.number(),
      h: z.number(),
      l: z.number(),
      c: z.number(),
      v: z.number(),
    })
  ),
});

export function toCandles(raw: z.infer<typeof OhlcvData>): Candle[] {
  return raw.items.map((item) => ({
    time: item.unixTime,
    open: item.o,
    high: item.h,
    low: item.l,
    close: item.c,
    volume: item.v,
  }));
}

// --- /defi/v3/token/holder → data.items[] ------------------------------------
// ponytail: v3 holder returns owner + ui_amount, no percentage — the holders router enriches with
// supply if it needs %. Confirm field names via the smoke test.
export const HolderData = z.object({
  items: z.array(
    z.object({
      owner: z.string(),
      ui_amount: z.number().nullish(),
    })
  ),
});

export function toHolders(raw: z.infer<typeof HolderData>): Holder[] {
  return raw.items.map((item) => ({
    address: item.owner,
    amount: item.ui_amount ?? 0,
  }));
}

// --- /defi/txs/token → data.items[] ------------------------------------------
// ponytail: txs/token nests base/quote+from/to — the exact USD/amount field is the riskiest mapping;
// confirm via the smoke test before the trades router relies on it.
export const TradeData = z.object({
  items: z.array(
    z.object({
      txHash: z.string(),
      blockUnixTime: z.number(),
      side: z.enum(["buy", "sell"]).nullish(),
      owner: z.string().nullish(),
      volumeUSD: z.number().nullish(),
      to: z.object({ uiAmount: z.number().nullish() }).nullish(),
      from: z.object({ uiAmount: z.number().nullish() }).nullish(),
    })
  ),
});

export function toTrades(raw: z.infer<typeof TradeData>): Trade[] {
  return raw.items.map((item) => ({
    txHash: item.txHash,
    blockUnixTime: item.blockUnixTime,
    side: item.side ?? "buy",
    owner: item.owner ?? "",
    priceUsd: item.volumeUSD ?? 0,
    amount: item.to?.uiAmount ?? item.from?.uiAmount ?? 0,
  }));
}

// --- /defi/multi_price → data{ [address]: { value } } ------------------------
export const MultiPriceData = z.record(
  z.string(),
  z.object({ value: z.number().nullish() }).nullable()
);

export function toPrices(
  raw: z.infer<typeof MultiPriceData>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [address, entry] of Object.entries(raw)) {
    if (entry && typeof entry.value === "number") {
      out[address] = entry.value;
    }
  }
  return out;
}
