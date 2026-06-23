import { z } from "zod";
import type { Holder } from "../../../schemas/token";
import { parseData } from "../../_shared/parse";
import type { AlchemyContext } from "../context";

const TTL = 30_000;

// `getTokenLargestAccounts` returns the top token ACCOUNTS (not owners) — at most 20.
const LargestAccounts = z.object({
  value: z.array(
    z.object({
      address: z.string(),
      uiAmount: z.number().nullish(),
    })
  ),
});

// `getMultipleAccounts` (jsonParsed) carries each token account's owner wallet.
const ParsedOwners = z.object({
  value: z.array(
    z
      .object({
        data: z
          .object({
            parsed: z
              .object({
                info: z.object({ owner: z.string().nullish() }).nullish(),
              })
              .nullish(),
          })
          .nullish(),
      })
      .nullable()
  ),
});

export interface HoldersInput {
  address: string;
  limit: number;
}

/** Top holders: the largest token accounts, resolved to their owner wallets. Capped at 20 (the RPC
 *  limit) — `getTokenLargestAccounts` ignores `limit`, so we slice. */
export function makeHolders(ctx: AlchemyContext) {
  return ({ address, limit }: HoldersInput): Promise<Holder[]> =>
    ctx.cache.wrap(`holders:${address}:${limit}`, TTL, async () => {
      const largestResult = await ctx.request("getTokenLargestAccounts", [
        address,
      ]);
      const largest = parseData(LargestAccounts, largestResult).value.slice(
        0,
        limit
      );
      if (largest.length === 0) {
        return [];
      }
      const ownersResult = await ctx.request("getMultipleAccounts", [
        largest.map((account) => account.address),
        { encoding: "jsonParsed" },
      ]);
      const owners = parseData(ParsedOwners, ownersResult).value;
      return largest
        .map((account, index) => ({
          address: owners[index]?.data?.parsed?.info?.owner ?? "",
          amount: account.uiAmount ?? 0,
        }))
        .filter((holder) => holder.address !== "");
    });
}
