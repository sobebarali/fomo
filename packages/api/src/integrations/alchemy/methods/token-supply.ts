import { z } from "zod";
import { parseData } from "../../_shared/parse";
import type { AlchemyContext } from "../context";

const TTL = 60_000;

const TokenSupply = z.object({
  value: z.object({ uiAmount: z.number().nullish() }),
});

export interface TokenSupplyInput {
  address: string;
}

/** Circulating supply (uiAmount) — used to fill `TokenDetail.totalSupply` and the holders `%`. */
export function makeGetTokenSupply(ctx: AlchemyContext) {
  return ({ address }: TokenSupplyInput): Promise<number> =>
    ctx.cache.wrap(`supply:${address}`, TTL, async () => {
      const result = await ctx.request("getTokenSupply", [address]);
      return parseData(TokenSupply, result).value.uiAmount ?? 0;
    });
}
