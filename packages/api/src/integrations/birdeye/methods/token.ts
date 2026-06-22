import { z } from "zod";
import type { BirdEyeContext } from "../context";
import { parseData } from "../parse";
import type { TokenDetail } from "../schema";

const TTL = 30_000;

// token_overview field names diverge from token_trending (priceChange24hPercent vs
// price24hChangePercent, v24hUSD vs volume24hUSD, marketCap/mc vs marketcap) — modeled separately.
const OverviewData = z.object({
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

function toTokenDetail(raw: z.infer<typeof OverviewData>): TokenDetail {
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

export interface TokenInput {
  address: string;
}

export function makeToken(ctx: BirdEyeContext) {
  return ({ address }: TokenInput): Promise<TokenDetail | null> =>
    ctx.cache.wrap(`token:${address}`, TTL, async () => {
      const { success, data } = await ctx.request("/defi/token_overview", {
        address,
      });
      // Unknown mint → success:false or null data → null (router maps NOT_FOUND).
      if (!success || data == null) {
        return null;
      }
      return toTokenDetail(parseData(OverviewData, data));
    });
}
