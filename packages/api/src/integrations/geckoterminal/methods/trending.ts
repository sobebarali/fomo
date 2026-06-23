import { z } from "zod";
import type { TokenSummary, TrendingSort } from "../../../schemas/token";
import { parseData } from "../../_shared/parse";
import type { GeckoTerminalContext } from "../context";

const TTL = 60_000;
// GeckoTerminal ids are `solana_<address>`.
const SOLANA_PREFIX = /^solana_/;

const TrendingResponse = z.object({
  data: z.array(
    z.object({
      attributes: z.object({
        base_token_price_usd: z.string().nullish(),
        fdv_usd: z.string().nullish(),
        market_cap_usd: z.string().nullish(),
        volume_usd: z.object({ h24: z.string().nullish() }).nullish(),
        price_change_percentage: z
          .object({ h24: z.string().nullish() })
          .nullish(),
      }),
      relationships: z.object({
        base_token: z.object({ data: z.object({ id: z.string() }) }),
      }),
    })
  ),
  included: z
    .array(
      z.object({
        id: z.string(),
        attributes: z.object({
          address: z.string().nullish(),
          name: z.string().nullish(),
          symbol: z.string().nullish(),
          image_url: z.string().nullish(),
        }),
      })
    )
    .nullish(),
});

type TrendingData = z.infer<typeof TrendingResponse>;

function toSummaries(raw: TrendingData): TokenSummary[] {
  const tokens = new Map(
    (raw.included ?? []).map((entry) => [entry.id, entry.attributes])
  );
  return raw.data.map((pool) => {
    const tokenId = pool.relationships.base_token.data.id;
    const token = tokens.get(tokenId);
    const attrs = pool.attributes;
    return {
      address: token?.address ?? tokenId.replace(SOLANA_PREFIX, ""),
      symbol: token?.symbol ?? "",
      name: token?.name ?? "",
      logoUri: token?.image_url ?? null,
      priceUsd: Number(attrs.base_token_price_usd) || 0,
      change24h: Number(attrs.price_change_percentage?.h24) || 0,
      volume24h: Number(attrs.volume_usd?.h24) || 0,
      marketCap: Number(attrs.market_cap_usd ?? attrs.fdv_usd) || 0,
    };
  });
}

export interface TrendingInput {
  limit: number;
  offset: number;
  sort: TrendingSort;
}

export function makeTrending(ctx: GeckoTerminalContext) {
  // GeckoTerminal trending is organic-only; `gainers`/`new` reuse the same list (the sidebar's sort
  // tabs aren't wired yet). One page returns ~20 pools, sliced to `limit`.
  return ({ limit }: TrendingInput): Promise<TokenSummary[]> =>
    ctx.cache.wrap(`trending:${limit}`, TTL, async () => {
      const body = await ctx.request("/networks/solana/trending_pools", {
        include: "base_token",
      });
      return toSummaries(parseData(TrendingResponse, body)).slice(0, limit);
    });
}
