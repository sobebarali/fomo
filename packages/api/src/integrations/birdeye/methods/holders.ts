import { z } from "zod";
import { UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { BirdEyeContext } from "../context";
import type { Holder } from "../schema";

const TTL = 30_000;

// v3 holder returns owner + ui_amount, no percentage — the holders router enriches with supply if
// it needs %. Confirm field names via the smoke test / a real fixture.
const HolderData = z.object({
  items: z.array(
    z.object({
      owner: z.string(),
      ui_amount: z.number().nullish(),
    })
  ),
});

function toHolders(raw: z.infer<typeof HolderData>): Holder[] {
  return raw.items.map((item) => ({
    address: item.owner,
    amount: item.ui_amount ?? 0,
  }));
}

export interface HoldersInput {
  address: string;
  limit: number;
}

export function makeHolders(ctx: BirdEyeContext) {
  return ({ address, limit }: HoldersInput): Promise<Holder[]> =>
    ctx.cache.wrap(`holders:${address}:${limit}`, TTL, async () => {
      const { success, data } = await ctx.request("/defi/v3/token/holder", {
        address,
        offset: 0,
        limit,
      });
      if (!success) {
        throw new UpstreamError("BirdEye reported failure");
      }
      return toHolders(parseData(HolderData, data));
    });
}
