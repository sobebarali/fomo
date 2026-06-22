import { z } from "zod";
import type { AlchemyContext } from "../context";
import { parseData } from "../parse";
import type { TokenBalance } from "../schema";

const TTL = 10_000;

// ponytail: classic SPL Token program only. Token-2022 mints need a second
// getTokenAccountsByOwner call with the Token-2022 program id, merged in.
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const TokenAccounts = z.object({
  value: z.array(
    z.object({
      account: z.object({
        data: z.object({
          parsed: z.object({
            info: z.object({
              mint: z.string(),
              tokenAmount: z.object({
                amount: z.string(),
                decimals: z.number(),
                uiAmount: z.number().nullish(),
              }),
            }),
          }),
        }),
      }),
    })
  ),
});

export function makeGetTokenBalances(ctx: AlchemyContext) {
  return (wallet: string): Promise<TokenBalance[]> =>
    ctx.cache.wrap(`tokens:${wallet}`, TTL, async () => {
      const result = await ctx.request("getTokenAccountsByOwner", [
        wallet,
        { programId: TOKEN_PROGRAM_ID },
        { encoding: "jsonParsed" },
      ]);
      return parseData(TokenAccounts, result).value.map((entry) => {
        const { mint, tokenAmount } = entry.account.data.parsed.info;
        return {
          address: mint,
          amount:
            tokenAmount.uiAmount ??
            Number(tokenAmount.amount) / 10 ** tokenAmount.decimals,
          decimals: tokenAmount.decimals,
        };
      });
    });
}
