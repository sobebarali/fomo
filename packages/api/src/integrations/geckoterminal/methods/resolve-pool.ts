import { z } from "zod";
import { parseData } from "../../_shared/parse";
import type { GeckoTerminalContext } from "../context";

// A token's primary pool rarely changes; cache long so ohlcv + trades share one resolve.
const TTL = 600_000;
// GeckoTerminal ids are `solana_<address>`.
const SOLANA_PREFIX = /^solana_/;

const PoolsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      attributes: z.object({ reserve_in_usd: z.string().nullish() }),
      relationships: z.object({
        base_token: z.object({ data: z.object({ id: z.string() }) }),
      }),
    })
  ),
});

type Pool = z.infer<typeof PoolsResponse>["data"][number];

const reserve = (pool: Pool): number =>
  Number(pool.attributes.reserve_in_usd) || 0;

/** Resolve a token's primary pool address (highest reserve, preferring pools where the token is the
 *  base so ohlcv price + trade sides read from its point of view). Cached; `null` if it has no pools.
 *  GeckoTerminal ids are `solana_<address>`. */
export function resolvePool(
  ctx: GeckoTerminalContext,
  address: string
): Promise<string | null> {
  return ctx.cache.wrap(`pool:${address}`, TTL, async () => {
    const body = await ctx.request(`/networks/solana/tokens/${address}/pools`);
    const { data } = parseData(PoolsResponse, body);
    if (data.length === 0) {
      return null;
    }
    const targetId = `solana_${address}`;
    const basePools = data.filter(
      (pool) => pool.relationships.base_token.data.id === targetId
    );
    const candidates = basePools.length > 0 ? basePools : data;
    const best = candidates.reduce((top, pool) =>
      reserve(pool) > reserve(top) ? pool : top
    );
    return best.id.replace(SOLANA_PREFIX, "");
  });
}
