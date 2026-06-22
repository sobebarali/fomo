import { z } from "zod";
import { UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { BirdEyeContext } from "../context";
import type { TokenSummary, TrendingSort } from "../schema";

const TTL = 15_000;

// sort_by ∈ {rank, volumeUSD, liquidity} per BirdEye — "gainers"/"new" use the closest proxy.
const TRENDING_SORT: Record<TrendingSort, { by: string; type: string }> = {
  trending: { by: "rank", type: "asc" },
  gainers: { by: "volumeUSD", type: "desc" },
  new: { by: "liquidity", type: "desc" },
};

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
  total: z.number().nullish(),
});

function toTokenSummary(raw: z.infer<typeof RawTrendingToken>): TokenSummary {
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

export interface TrendingInput {
  limit: number;
  offset: number;
  sort: TrendingSort;
}

export function makeTrending(ctx: BirdEyeContext) {
  return ({ sort, limit, offset }: TrendingInput): Promise<TokenSummary[]> =>
    ctx.cache.wrap(`trending:${sort}:${limit}:${offset}`, TTL, async () => {
      const sortBy = TRENDING_SORT[sort];
      const { success, data } = await ctx.request("/defi/token_trending", {
        sort_by: sortBy.by,
        sort_type: sortBy.type,
        offset,
        limit,
      });
      if (!success) {
        throw new UpstreamError("BirdEye reported failure");
      }
      return parseData(TrendingData, data).tokens.map(toTokenSummary);
    });
}
