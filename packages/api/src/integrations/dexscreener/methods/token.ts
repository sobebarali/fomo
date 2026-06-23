import type { TokenDetail } from "../../../schemas/token";
import { parseData } from "../../_shared/parse";
import type { DexScreenerContext } from "../context";
import { type Pair, TokensResponse } from "../schema";

const TTL = 30_000;

/** Highest-liquidity pair where the queried mint is the base token (so `priceUsd` is this token's,
 *  not the counter-asset's). */
function bestPair(pairs: Pair[], address: string): Pair | null {
  const owned = pairs.filter((pair) => pair.baseToken.address === address);
  if (owned.length === 0) {
    return null;
  }
  return owned.reduce((best, pair) =>
    (pair.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? pair : best
  );
}

function toTokenDetail(address: string, pair: Pair): TokenDetail {
  const links: { website?: string; twitter?: string } = {};
  const website = pair.info?.websites?.[0]?.url;
  if (website) {
    links.website = website;
  }
  const twitter = pair.info?.socials?.find(
    (social) => social.type === "twitter"
  )?.url;
  if (twitter) {
    links.twitter = twitter;
  }
  return {
    address,
    symbol: pair.baseToken.symbol ?? "",
    name: pair.baseToken.name ?? "",
    logoUri: pair.info?.imageUrl ?? null,
    priceUsd: Number(pair.priceUsd) || 0,
    change24h: pair.priceChange?.h24 ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    marketCap: pair.marketCap ?? pair.fdv ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    // DexScreener has no holder count or description; the market facade fills totalSupply from RPC.
    holders: 0,
    totalSupply: 0,
    description: null,
    links,
  };
}

export interface TokenInput {
  address: string;
}

export function makeToken(ctx: DexScreenerContext) {
  return ({ address }: TokenInput): Promise<TokenDetail | null> =>
    ctx.cache.wrap(`token:${address}`, TTL, async () => {
      const data = await ctx.request(`/tokens/v1/solana/${address}`);
      const pair = bestPair(parseData(TokensResponse, data), address);
      // No pair with this mint as base → unknown/untradeable mint → null (router maps NOT_FOUND).
      return pair ? toTokenDetail(address, pair) : null;
    });
}
