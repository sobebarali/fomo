import { z } from "zod";
import type { AlchemyContext } from "../context";
import { parseData } from "../parse";

const TTL = 10_000;
const LAMPORTS_PER_SOL = 1_000_000_000;

const BalanceResult = z.object({ value: z.number() });

export function makeGetSolBalance(ctx: AlchemyContext) {
  return (wallet: string): Promise<number> =>
    ctx.cache.wrap(`sol:${wallet}`, TTL, async () => {
      const result = await ctx.request("getBalance", [wallet]);
      return parseData(BalanceResult, result).value / LAMPORTS_PER_SOL;
    });
}
